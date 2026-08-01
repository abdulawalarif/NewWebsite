import {
  isPricingPlanKey,
  type PricingPlanKey,
} from "@/lib/pricing-plans";

export const PLAN_COOKIE = "sailly_selected_plan";

/** Plans that can go through Stripe Checkout (not contact-sales). */
export const CHECKOUTABLE_PLAN_KEYS = [
  "starters",
  "main",
  "president_suite",
] as const satisfies readonly PricingPlanKey[];

export type CheckoutablePlanKey = (typeof CHECKOUTABLE_PLAN_KEYS)[number];

export function isCheckoutablePlanKey(
  value: string | null | undefined
): value is CheckoutablePlanKey {
  return (
    typeof value === "string" &&
    (CHECKOUTABLE_PLAN_KEYS as readonly string[]).includes(value)
  );
}

/** Validate any pricing plan key from query/cookie/DB. */
export function parsePlanKey(
  value: string | null | undefined
): PricingPlanKey | null {
  if (!value || !isPricingPlanKey(value)) return null;
  return value;
}

export const PLAN_COOKIE_OPTIONS = {
  path: "/",
  maxAge: 60 * 60 * 24 * 30, // 30 days
  sameSite: "lax" as const,
};

/** Client-side: persist plan choice so OAuth round-trip keeps it. */
export function setPlanCookieClient(plan: PricingPlanKey): void {
  if (typeof document === "undefined") return;
  const maxAge = PLAN_COOKIE_OPTIONS.maxAge;
  document.cookie = `${PLAN_COOKIE}=${encodeURIComponent(plan)}; path=/; max-age=${maxAge}; samesite=lax`;
}

export function readPlanCookieClient(): PricingPlanKey | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${PLAN_COOKIE}=`));
  if (!match) return null;
  return parsePlanKey(decodeURIComponent(match.split("=").slice(1).join("=")));
}

export function readPlanFromRequestCookies(
  getCookie: (name: string) => string | undefined
): PricingPlanKey | null {
  return parsePlanKey(getCookie(PLAN_COOKIE));
}
