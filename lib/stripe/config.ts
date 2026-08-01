import { isMockAuth } from "@/lib/auth/mode";
import type { CheckoutablePlanKey } from "@/lib/auth/plan-cookie";

/**
 * Stripe billing config (M1).
 *
 * Overage (€0.12/min beyond included minutes) stays on **manual invoice for v1** —
 * do not wire Stripe metered billing until the voice-agent backend exposes minute counters.
 *
 * Dashboard setup required for live mode:
 * - Products/Prices for starters, main, president_suite (monthly)
 * - 30-day 50% intro: either a coupon (`STRIPE_TRIAL_COUPON_ID`) applied at Checkout,
 *   or intro Prices — map IDs via env below
 * - Customer portal enabled in Stripe Dashboard
 */

export function isMockStripe(): boolean {
  if (isMockAuth()) return true;
  return !process.env.STRIPE_SECRET_KEY;
}

export function getStripeSecretKey(): string | null {
  return process.env.STRIPE_SECRET_KEY ?? null;
}

export function getStripeWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET ?? null;
}

export function getStripePublishableKey(): string | null {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? null;
}

/** Map checkoutable plan keys → Stripe Price IDs */
export function getStripePriceId(plan: CheckoutablePlanKey): string | null {
  const map: Record<CheckoutablePlanKey, string | undefined> = {
    starters: process.env.STRIPE_PRICE_STARTERS,
    main: process.env.STRIPE_PRICE_MAIN,
    president_suite: process.env.STRIPE_PRICE_PRESIDENT_SUITE,
  };
  return map[plan] ?? null;
}

/** Optional coupon for 30-day 50% intro pricing */
export function getStripeTrialCouponId(): string | null {
  return process.env.STRIPE_TRIAL_COUPON_ID ?? null;
}

export const TRIAL_DAYS = 30;
