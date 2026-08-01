import {
  getMockStore,
  toAuthUser,
  type MockUser,
} from "./store";
import type { CustomerProfile, Subscription } from "@/types/onboarding";
import type { PricingPlanKey } from "@/lib/pricing-plans";

type Filter = { column: string; value: unknown };

function applyFilters<T extends Record<string, unknown>>(
  rows: T[],
  filters: Filter[]
): T[] {
  return rows.filter((row) =>
    filters.every((f) => row[f.column] === f.value)
  );
}

export type MockQueryResult = {
  data: unknown;
  error: { message: string } | null;
};

export function mockTableQuery(
  table: string,
  action: "select" | "insert" | "update" | "upsert" | "delete",
  opts: {
    filters?: Filter[];
    payload?: Record<string, unknown> | Record<string, unknown>[];
    single?: "maybe" | "single";
    onConflict?: string;
  } = {}
): MockQueryResult {
  const store = getMockStore();
  const filters = opts.filters ?? [];

  try {
    if (table === "customer_profiles") {
      if (action === "select") {
        const rows = applyFilters(
          Array.from(store.profiles.values()) as unknown as Record<string, unknown>[],
          filters
        );
        if (opts.single) {
          return { data: rows[0] ?? null, error: null };
        }
        return { data: rows, error: null };
      }
      if (action === "insert") {
        const payload = Array.isArray(opts.payload)
          ? opts.payload[0]
          : opts.payload;
        if (!payload?.id) {
          return { data: null, error: { message: "id required" } };
        }
        const id = String(payload.id);
        const row = {
          id,
          email: String(payload.email ?? ""),
          first_name: (payload.first_name as string) ?? null,
          last_name: (payload.last_name as string) ?? null,
          display_name: (payload.display_name as string) ?? null,
          company_name: (payload.company_name as string) ?? null,
          phone: (payload.phone as string) ?? null,
          role: (payload.role as "customer" | "admin") ?? "customer",
          selected_plan: (payload.selected_plan as CustomerProfile["selected_plan"]) ?? null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login_at: null,
        };
        store.profiles.set(id, row);
        return { data: row, error: null };
      }
      if (action === "upsert") {
        const payload = (Array.isArray(opts.payload) ? opts.payload[0] : opts.payload) ?? {};
        const id = String(payload.id ?? "");
        if (!id) return { data: null, error: { message: "id required" } };
        const existing = store.profiles.get(id);
        const row = {
          id,
          email: String(payload.email ?? existing?.email ?? ""),
          first_name:
            (payload.first_name as string | null | undefined) !== undefined
              ? (payload.first_name as string | null)
              : (existing?.first_name ?? null),
          last_name:
            (payload.last_name as string | null | undefined) !== undefined
              ? (payload.last_name as string | null)
              : (existing?.last_name ?? null),
          display_name:
            (payload.display_name as string | null | undefined) !== undefined
              ? (payload.display_name as string | null)
              : (existing?.display_name ?? null),
          company_name:
            (payload.company_name as string | null | undefined) !== undefined
              ? (payload.company_name as string | null)
              : (existing?.company_name ?? null),
          phone:
            (payload.phone as string | null | undefined) !== undefined
              ? (payload.phone as string | null)
              : (existing?.phone ?? null),
          role: (payload.role as "customer" | "admin") ?? existing?.role ?? "customer",
          selected_plan:
            (payload.selected_plan as CustomerProfile["selected_plan"] | undefined) !==
            undefined
              ? (payload.selected_plan as CustomerProfile["selected_plan"])
              : (existing?.selected_plan ?? null),
          created_at: existing?.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login_at: existing?.last_login_at ?? null,
        };
        store.profiles.set(id, row);
        return { data: row, error: null };
      }
      if (action === "update") {
        const idFilter = filters.find((f) => f.column === "id");
        if (!idFilter) return { data: null, error: { message: "id filter required" } };
        const existing = store.profiles.get(String(idFilter.value));
        if (!existing) return { data: null, error: null };
        const payload = (Array.isArray(opts.payload) ? opts.payload[0] : opts.payload) ?? {};
        const updated = {
          ...existing,
          ...payload,
          updated_at: new Date().toISOString(),
        };
        store.profiles.set(existing.id, updated);
        return { data: updated, error: null };
      }
    }

    if (table === "onboarding_drafts") {
      if (action === "select") {
        const rows = applyFilters(
          Array.from(store.drafts.values()) as unknown as Record<string, unknown>[],
          filters
        );
        if (opts.single) return { data: rows[0] ?? null, error: null };
        return { data: rows, error: null };
      }
      if (action === "upsert") {
        const payload = (Array.isArray(opts.payload) ? opts.payload[0] : opts.payload) ?? {};
        const userId = String(payload.user_id ?? "");
        if (!userId) return { data: null, error: { message: "user_id required" } };
        const existing = store.drafts.get(userId);
        const row = {
          id: existing?.id ?? `draft-${userId}`,
          created_at: existing?.created_at ?? new Date().toISOString(),
          ...existing,
          ...payload,
          user_id: userId,
          updated_at: new Date().toISOString(),
        } as (typeof store.drafts extends Map<string, infer V> ? V : never);
        store.drafts.set(userId, row);
        return { data: row, error: null };
      }
      if (action === "delete") {
        const userFilter = filters.find((f) => f.column === "user_id");
        if (userFilter) store.drafts.delete(String(userFilter.value));
        return { data: null, error: null };
      }
    }

    if (table === "agent_configs") {
      if (action === "select") {
        const rows = applyFilters(
          Array.from(store.agentConfigs.values()) as unknown as Record<string, unknown>[],
          filters
        );
        if (opts.single) return { data: rows[0] ?? null, error: null };
        return { data: rows, error: null };
      }
      if (action === "upsert") {
        const payload = (Array.isArray(opts.payload) ? opts.payload[0] : opts.payload) ?? {};
        const userId = String(payload.user_id ?? "");
        if (!userId) return { data: null, error: { message: "user_id required" } };
        const existing = store.agentConfigs.get(userId);
        const row = {
          id: existing?.id ?? `agent-${userId}`,
          created_at: existing?.created_at ?? new Date().toISOString(),
          ...existing,
          ...payload,
          user_id: userId,
          updated_at: new Date().toISOString(),
        } as (typeof store.agentConfigs extends Map<string, infer V> ? V : never);
        store.agentConfigs.set(userId, row);
        // Clear draft on successful agent upsert (mirrors submit flow cleanup intention)
        return { data: row, error: null };
      }
      if (action === "update") {
        const userFilter = filters.find((f) => f.column === "user_id");
        if (!userFilter) {
          return { data: null, error: { message: "user_id filter required" } };
        }
        const existing = store.agentConfigs.get(String(userFilter.value));
        if (!existing) return { data: null, error: null };
        const payload = (Array.isArray(opts.payload) ? opts.payload[0] : opts.payload) ?? {};
        const updated = {
          ...existing,
          ...payload,
          updated_at: new Date().toISOString(),
        };
        store.agentConfigs.set(existing.user_id, updated);
        return { data: updated, error: null };
      }
    }

    if (table === "subscriptions") {
      if (action === "select") {
        const rows = applyFilters(
          Array.from(store.subscriptions.values()) as unknown as Record<string, unknown>[],
          filters
        );
        if (opts.single) return { data: rows[0] ?? null, error: null };
        return { data: rows, error: null };
      }
      if (action === "upsert") {
        const payload = (Array.isArray(opts.payload) ? opts.payload[0] : opts.payload) ?? {};
        const userId = String(payload.user_id ?? "");
        if (!userId) return { data: null, error: { message: "user_id required" } };
        const existing = store.subscriptions.get(userId);
        const row: Subscription = {
          id: existing?.id ?? `sub-${userId}`,
          user_id: userId,
          plan_key: (payload.plan_key as PricingPlanKey) ?? existing?.plan_key ?? "main",
          stripe_customer_id:
            (payload.stripe_customer_id as string | null | undefined) !== undefined
              ? (payload.stripe_customer_id as string | null)
              : (existing?.stripe_customer_id ?? null),
          stripe_subscription_id:
            (payload.stripe_subscription_id as string | null | undefined) !== undefined
              ? (payload.stripe_subscription_id as string | null)
              : (existing?.stripe_subscription_id ?? null),
          status:
            (payload.status as Subscription["status"]) ??
            existing?.status ??
            "incomplete",
          current_period_end:
            (payload.current_period_end as string | null | undefined) !== undefined
              ? (payload.current_period_end as string | null)
              : (existing?.current_period_end ?? null),
          trial_end:
            (payload.trial_end as string | null | undefined) !== undefined
              ? (payload.trial_end as string | null)
              : (existing?.trial_end ?? null),
          cancel_at_period_end:
            typeof payload.cancel_at_period_end === "boolean"
              ? payload.cancel_at_period_end
              : (existing?.cancel_at_period_end ?? false),
          created_at: existing?.created_at ?? new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        store.subscriptions.set(userId, row);
        return { data: row, error: null };
      }
      if (action === "update") {
        const userFilter = filters.find((f) => f.column === "user_id");
        const subFilter = filters.find((f) => f.column === "stripe_subscription_id");
        let existing: Subscription | undefined;
        if (userFilter) {
          existing = store.subscriptions.get(String(userFilter.value));
        } else if (subFilter) {
          existing = Array.from(store.subscriptions.values()).find(
            (s) => s.stripe_subscription_id === subFilter.value
          );
        }
        if (!existing) return { data: null, error: null };
        const payload = (Array.isArray(opts.payload) ? opts.payload[0] : opts.payload) ?? {};
        const updated: Subscription = {
          ...existing,
          ...(payload as Partial<Subscription>),
          updated_at: new Date().toISOString(),
        };
        store.subscriptions.set(existing.user_id, updated);
        return { data: updated, error: null };
      }
    }

    return { data: null, error: { message: `Unsupported mock table/action: ${table}.${action}` } };
  } catch (err) {
    return {
      data: null,
      error: { message: err instanceof Error ? err.message : "Mock query failed" },
    };
  }
}

export function mockSignIn(email: string, password: string): {
  data: { user: ReturnType<typeof toAuthUser>; session: { access_token: string } } | { user: null; session: null };
  error: { message: string } | null;
} {
  const store = getMockStore();
  const id = store.usersByEmail.get(email.trim().toLowerCase());
  if (!id) {
    return {
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    };
  }
  const user = store.users.get(id)!;
  if (user.password !== password) {
    return {
      data: { user: null, session: null },
      error: { message: "Invalid login credentials" },
    };
  }
  return {
    data: {
      user: toAuthUser(user),
      session: { access_token: `mock-token-${user.id}` },
    },
    error: null,
  };
}

export function mockSignUp(
  email: string,
  password: string,
  metadata: MockUser["user_metadata"]
): {
  data: {
    user: ReturnType<typeof toAuthUser>;
    session: { access_token: string };
  } | { user: null; session: null };
  error: { message: string } | null;
} {
  const store = getMockStore();
  const key = email.trim().toLowerCase();
  if (store.usersByEmail.has(key)) {
    return {
      data: { user: null, session: null },
      error: { message: "User already registered" },
    };
  }
  const id = `mock-user-${crypto.randomUUID()}`;
  const created = new Date().toISOString();
  const user: MockUser = {
    id,
    email: email.trim(),
    password,
    user_metadata: metadata,
    created_at: created,
  };
  store.users.set(id, user);
  store.usersByEmail.set(key, id);
  return {
    data: {
      user: toAuthUser(user),
      session: { access_token: `mock-token-${id}` },
    },
    error: null,
  };
}

export function getMockUserById(userId: string | null | undefined) {
  if (!userId) return null;
  const user = getMockStore().users.get(userId);
  return user ? toAuthUser(user) : null;
}
