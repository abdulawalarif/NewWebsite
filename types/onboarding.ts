import type { PricingPlanKey } from "@/lib/pricing-plans";

export interface CustomerProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  company_name: string | null;
  phone: string | null;
  role: "customer" | "admin";
  /** Plan chosen at register (from ?plan=); survives OAuth via cookie + this column. */
  selected_plan: PricingPlanKey | null;
  created_at: string;
  updated_at: string;
  last_login_at: string | null;
}

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete";

export interface Subscription {
  id: string;
  user_id: string;
  plan_key: PricingPlanKey;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  current_period_end: string | null;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  created_at: string;
  updated_at: string;
}

export interface BusinessHours {
  monday?: { open: string; close: string; closed?: boolean };
  tuesday?: { open: string; close: string; closed?: boolean };
  wednesday?: { open: string; close: string; closed?: boolean };
  thursday?: { open: string; close: string; closed?: boolean };
  friday?: { open: string; close: string; closed?: boolean };
  saturday?: { open: string; close: string; closed?: boolean };
  sunday?: { open: string; close: string; closed?: boolean };
}

export interface EscalationContact {
  name: string;
  phone: string;
  role?: string;
}

export interface OnboardingDraft {
  id: string;
  user_id: string;
  current_step: number;
  // Step 1
  company_name: string | null;
  industry: string | null;
  business_hours: BusinessHours | null;
  services: string[] | null;
  languages: string[] | null;
  google_maps_url: string | null;
  // Step 2
  agent_name: string | null;
  voice_id: string | null;
  greeting_text: string | null;
  escalation_contacts: EscalationContact[] | null;
  // Step 3
  phone_number: string | null;
  provider: string | null;
  forwarding_mode: string | null;
  forwarding_instructions: string | null;
  // Step 4
  avv_accepted: boolean;
  transcript_consent: boolean;
  data_retention_days: number;
  // Meta
  created_at: string;
  updated_at: string;
}

export interface AgentConfig {
  id: string;
  user_id: string;
  // Company
  company_name: string;
  industry: string;
  business_hours: BusinessHours | null;
  services: string[] | null;
  languages: string[] | null;
  google_maps_url: string | null;
  // Agent
  agent_name: string;
  voice_id: string | null;
  greeting_text: string | null;
  escalation_contacts: EscalationContact[];
  // Phone
  phone_number: string | null;
  provider: string | null;
  forwarding_mode: string | null;
  forwarding_instructions: string | null;
  // Legal
  avv_accepted: boolean;
  avv_accepted_at: string | null;
  transcript_consent: boolean;
  data_retention_days: number;
  // Status
  status: "pending" | "active" | "inactive" | "suspended";
  submitted_at: string;
  activated_at: string | null;
  created_at: string;
  updated_at: string;
}

export type OnboardingStep = 1 | 2 | 3 | 4;

export const INDUSTRIES = [
  { value: "hotel", label: "Hotel & Gastgewerbe" },
  { value: "medical", label: "Arztpraxis / Medizin" },
  { value: "restaurant", label: "Restaurant & Café" },
  { value: "legal", label: "Kanzlei / Recht" },
  { value: "beauty", label: "Kosmetik & Beauty" },
  { value: "automotive", label: "Autowerkstatt / KFZ" },
  { value: "real_estate", label: "Immobilien" },
  { value: "other", label: "Sonstiges" },
] as const;

export type Industry = (typeof INDUSTRIES)[number]["value"];

export const PROVIDERS = [
  { value: "telekom", label: "Telekom" },
  { value: "vodafone", label: "Vodafone" },
  { value: "o2", label: "O2" },
  { value: "1und1", label: "1&1" },
  { value: "sipgate", label: "Sipgate" },
  { value: "other", label: "Sonstiger Anbieter" },
] as const;

export const FORWARDING_MODES = [
  { value: "always", label: "Immer weiterleiten" },
  { value: "busy", label: "Bei besetzt" },
  { value: "no_answer", label: "Bei Nichtannahme (nach X Sekunden)" },
  { value: "off_hours", label: "Außerhalb der Geschäftszeiten" },
] as const;
