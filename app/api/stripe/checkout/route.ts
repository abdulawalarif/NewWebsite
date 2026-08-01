import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isCheckoutablePlanKey,
  parsePlanKey,
  PLAN_COOKIE,
  readPlanFromRequestCookies,
} from "@/lib/auth/plan-cookie";
import {
  getStripePriceId,
  getStripeTrialCouponId,
  isMockStripe,
  TRIAL_DAYS,
} from "@/lib/stripe/config";
import { getStripe } from "@/lib/stripe/client";
import { upsertSubscription, createBillingAdminClient } from "@/lib/stripe/subscriptions";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  let body: { plan?: string; locale?: string } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const locale = body.locale ?? req.cookies.get("NEXT_LOCALE")?.value ?? "de";

  // Resolve plan: body → cookie → profile
  let plan = parsePlanKey(body.plan ?? null);
  if (!plan) {
    plan = readPlanFromRequestCookies((name) => req.cookies.get(name)?.value);
  }
  if (!plan) {
    const { data: profile } = await supabase
      .from("customer_profiles")
      .select("selected_plan")
      .eq("id", user.id)
      .maybeSingle();
    plan = parsePlanKey(
      (profile as { selected_plan?: string } | null)?.selected_plan
    );
  }

  if (!plan) {
    return NextResponse.json(
      { error: "Kein Tarif gewählt. Bitte wählen Sie einen Plan unter Preise." },
      { status: 400 }
    );
  }

  if (!isCheckoutablePlanKey(plan)) {
    return NextResponse.json(
      {
        error:
          "First Class ist nur auf Anfrage verfügbar. Bitte kontaktieren Sie uns.",
        contact: `/${locale}/contact`,
      },
      { status: 400 }
    );
  }

  // Persist selection
  await supabase.from("customer_profiles").upsert(
    {
      id: user.id,
      email: user.email ?? "",
      selected_plan: plan,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    new URL(req.url).origin;
  const successUrl = `${origin}/${locale}/dashboard?checkout=success`;
  const cancelUrl = `${origin}/${locale}/preise/${plan}?checkout=canceled`;

  // ── Mock Stripe: send user to fake payment page (do not activate yet) ──
  if (isMockStripe()) {
    const mockCheckoutUrl = `${origin}/${locale}/checkout?plan=${plan}`;
    const res = NextResponse.json({ url: mockCheckoutUrl, mock: true });
    res.cookies.set(PLAN_COOKIE, plan, {
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      sameSite: "lax",
    });
    return res;
  }

  // ── Real Stripe ──
  const priceId = getStripePriceId(plan);
  if (!priceId) {
    return NextResponse.json(
      {
        error:
          "Stripe Price ID fehlt für diesen Tarif. Bitte STRIPE_PRICE_* Env setzen.",
      },
      { status: 503 }
    );
  }

  try {
    const stripe = getStripe();

    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = (existingSub as { stripe_customer_id?: string } | null)
      ?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    const coupon = getStripeTrialCouponId();
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        plan_key: plan,
      },
      subscription_data: {
        trial_period_days: TRIAL_DAYS,
        metadata: {
          user_id: user.id,
          plan_key: plan,
        },
      },
      ...(coupon
        ? { discounts: [{ coupon }] }
        : {}),
      allow_promotion_codes: !coupon,
    });

    if (!session.url) {
      return NextResponse.json(
        { error: "Stripe Checkout Session ohne URL." },
        { status: 500 }
      );
    }

    await upsertSubscription(createBillingAdminClient() as never, {
      user_id: user.id,
      plan_key: plan,
      stripe_customer_id: customerId,
      status: "incomplete",
    });

    return NextResponse.json({ url: session.url, mock: false });
  } catch (err) {
    console.error("stripe checkout error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Stripe Checkout fehlgeschlagen.",
      },
      { status: 500 }
    );
  }
}
