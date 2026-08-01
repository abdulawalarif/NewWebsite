import type {
  AgentConfig,
  CustomerProfile,
  OnboardingDraft,
  Subscription,
} from "@/types/onboarding";

export type MockUser = {
  id: string;
  email: string;
  password: string;
  user_metadata: {
    first_name?: string;
    last_name?: string;
    display_name?: string;
    full_name?: string;
    role?: string;
  };
  created_at: string;
};

type MockStore = {
  users: Map<string, MockUser>;
  usersByEmail: Map<string, string>;
  profiles: Map<string, CustomerProfile>;
  drafts: Map<string, OnboardingDraft>;
  agentConfigs: Map<string, AgentConfig>;
  subscriptions: Map<string, Subscription>;
};

const STORE_KEY = "__sailly_mock_auth_store__";

function now() {
  return new Date().toISOString();
}

function seedStore(): MockStore {
  const users = new Map<string, MockUser>();
  const usersByEmail = new Map<string, string>();
  const profiles = new Map<string, CustomerProfile>();
  const drafts = new Map<string, OnboardingDraft>();
  const agentConfigs = new Map<string, AgentConfig>();
  const subscriptions = new Map<string, Subscription>();

  const seedUsers: Array<{
    id: string;
    email: string;
    password: string;
    first: string;
    last: string;
    company?: string;
    withDraft?: boolean;
    withAgent?: boolean;
  }> = [
    {
      id: "mock-user-new",
      email: "new@sailly.test",
      password: "password123",
      first: "Nina",
      last: "Neumann",
      company: "Neumann GmbH",
    },
    {
      id: "mock-user-draft",
      email: "draft@sailly.test",
      password: "password123",
      first: "David",
      last: "Draft",
      company: "Draft Dental",
      withDraft: true,
    },
    {
      id: "mock-user-done",
      email: "done@sailly.test",
      password: "password123",
      first: "Dana",
      last: "Done",
      company: "Done Praxis",
      withAgent: true,
    },
  ];

  for (const u of seedUsers) {
    const created = now();
    const display = `${u.first} ${u.last}`;
    users.set(u.id, {
      id: u.id,
      email: u.email,
      password: u.password,
      user_metadata: {
        first_name: u.first,
        last_name: u.last,
        display_name: display,
        full_name: display,
        role: "customer",
      },
      created_at: created,
    });
    usersByEmail.set(u.email.toLowerCase(), u.id);
    profiles.set(u.id, {
      id: u.id,
      email: u.email,
      first_name: u.first,
      last_name: u.last,
      display_name: display,
      company_name: u.company ?? null,
      phone: null,
      role: "customer",
      selected_plan: u.withAgent ? "main" : null,
      created_at: created,
      updated_at: created,
      last_login_at: null,
    });

    if (u.withDraft) {
      drafts.set(u.id, {
        id: `draft-${u.id}`,
        user_id: u.id,
        current_step: 2,
        company_name: u.company ?? null,
        industry: "medical",
        business_hours: null,
        services: ["Terminvereinbarung"],
        languages: ["de"],
        google_maps_url: null,
        agent_name: "Sailly",
        voice_id: "nova",
        greeting_text: "Guten Tag, hier ist Sailly.",
        escalation_contacts: [{ name: "David", phone: "+491701234567", role: "Inhaber" }],
        phone_number: null,
        provider: null,
        forwarding_mode: "no_answer",
        forwarding_instructions: null,
        avv_accepted: false,
        transcript_consent: false,
        data_retention_days: 90,
        created_at: created,
        updated_at: created,
      });
    }

    if (u.withAgent) {
      agentConfigs.set(u.id, {
        id: `agent-${u.id}`,
        user_id: u.id,
        company_name: u.company ?? "Done Praxis",
        industry: "medical",
        business_hours: null,
        services: ["Terminvereinbarung", "Rückruf"],
        languages: ["de", "en"],
        google_maps_url: null,
        agent_name: "Sailly",
        voice_id: "nova",
        greeting_text: "Guten Tag, Sie sprechen mit Sailly von Done Praxis.",
        escalation_contacts: [{ name: "Dana", phone: "+491709876543", role: "Inhaberin" }],
        phone_number: "+49301234567",
        provider: "telekom",
        forwarding_mode: "no_answer",
        forwarding_instructions: null,
        avv_accepted: true,
        avv_accepted_at: created,
        transcript_consent: true,
        data_retention_days: 90,
        status: "pending",
        submitted_at: created,
        activated_at: null,
        created_at: created,
        updated_at: created,
      });
      const trialEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
      subscriptions.set(u.id, {
        id: `sub-${u.id}`,
        user_id: u.id,
        plan_key: "main",
        stripe_customer_id: `cus_mock_${u.id}`,
        stripe_subscription_id: `sub_mock_${u.id}`,
        status: "trialing",
        current_period_end: trialEnd,
        trial_end: trialEnd,
        cancel_at_period_end: false,
        created_at: created,
        updated_at: created,
      });
    }
  }

  return { users, usersByEmail, profiles, drafts, agentConfigs, subscriptions };
}

export function getMockStore(): MockStore {
  const g = globalThis as typeof globalThis & { [STORE_KEY]?: MockStore };
  if (!g[STORE_KEY]) {
    g[STORE_KEY] = seedStore();
  }
  // Hot-reload safety: older in-memory seeds may lack newer maps
  const store = g[STORE_KEY]!;
  if (!store.subscriptions) {
    store.subscriptions = new Map();
  }
  return store;
}

export function resetMockStore() {
  const g = globalThis as typeof globalThis & { [STORE_KEY]?: MockStore };
  g[STORE_KEY] = seedStore();
}

export function toAuthUser(user: MockUser) {
  return {
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata,
    created_at: user.created_at,
    app_metadata: { provider: "email", providers: ["email"] },
    aud: "authenticated",
    role: "authenticated",
  };
}

export function hasAgentConfig(userId: string): boolean {
  return getMockStore().agentConfigs.has(userId);
}
