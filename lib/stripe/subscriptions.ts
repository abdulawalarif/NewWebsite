import { createClient as createSupabaseJsClient } from "@supabase/supabase-js";
import { isMockAuth } from "@/lib/auth/mode";
import { createMockServerClient } from "@/lib/auth/mock/client";
import type { Subscription, SubscriptionStatus } from "@/types/onboarding";
import type { PricingPlanKey } from "@/lib/pricing-plans";
import { parsePlanKey } from "@/lib/auth/plan-cookie";

/** Service-role (or mock) client for webhook / privileged subscription writes. */
export function createBillingAdminClient(userIdForMock?: string | null) {
  if (isMockAuth()) {
    return createMockServerClient(userIdForMock ?? null);
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Supabase service role env missing");
  }
  return createSupabaseJsClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function mapStripeStatus(
  status: string | null | undefined
): SubscriptionStatus {
  switch (status) {
    case "trialing":
      return "trialing";
    case "active":
      return "active";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "unpaid":
      return "unpaid";
    default:
      return "incomplete";
  }
}

export type UpsertSubscriptionInput = {
  user_id: string;
  plan_key: PricingPlanKey;
  stripe_customer_id?: string | null;
  stripe_subscription_id?: string | null;
  status: SubscriptionStatus;
  current_period_end?: string | null;
  trial_end?: string | null;
  cancel_at_period_end?: boolean;
};

export async function upsertSubscription(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: { from: (table: string) => any },
  input: UpsertSubscriptionInput
): Promise<{ data: Subscription | null; error: string | null }> {
  const { data, error } = await client.from("subscriptions").upsert(
    {
      user_id: input.user_id,
      plan_key: input.plan_key,
      stripe_customer_id: input.stripe_customer_id ?? null,
      stripe_subscription_id: input.stripe_subscription_id ?? null,
      status: input.status,
      current_period_end: input.current_period_end ?? null,
      trial_end: input.trial_end ?? null,
      cancel_at_period_end: input.cancel_at_period_end ?? false,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    return { data: null, error: error.message ?? String(error) };
  }
  return { data: (data as Subscription) ?? null, error: null };
}

export async function setAgentSuspended(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  client: { from: (table: string) => any },
  userId: string
) {
  await client
    .from("agent_configs")
    .update({ status: "suspended", updated_at: new Date().toISOString() })
    .eq("user_id", userId);
}

export function planFromMetadata(
  metadata: Record<string, string> | null | undefined
): PricingPlanKey | null {
  return parsePlanKey(metadata?.plan_key);
}
