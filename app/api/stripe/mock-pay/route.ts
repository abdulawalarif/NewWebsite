import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import {
  isCheckoutablePlanKey,
  parsePlanKey,
  PLAN_COOKIE,
  readPlanFromRequestCookies,
} from "@/lib/auth/plan-cookie";
import { isMockStripe, TRIAL_DAYS } from "@/lib/stripe/config";
import {
  createBillingAdminClient,
  upsertSubscription,
} from "@/lib/stripe/subscriptions";
import {
  buildContractEmailInput,
  renderContractWelcomeEmail,
} from "@/lib/stripe/emails";
import { pushMockEmail } from "@/lib/auth/mock/store";
import { isMockAuth } from "@/lib/auth/mode";

/**
 * Completes a mock Stripe payment: activates trialing subscription +
 * writes the contract/welcome email to the mock outbox (no SMTP).
 */
export async function POST(req: NextRequest) {
  if (!isMockStripe()) {
    return NextResponse.json(
      { error: "Mock payment only available when Stripe is in mock mode." },
      { status: 404 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  let body: {
    plan?: string;
    locale?: string;
    cardNumber?: string;
    fail?: boolean;
  } = {};
  try {
    body = await req.json();
  } catch {
    body = {};
  }

  const locale = body.locale ?? req.cookies.get("NEXT_LOCALE")?.value ?? "de";

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

  if (!plan || !isCheckoutablePlanKey(plan)) {
    return NextResponse.json(
      { error: "Ungültiger oder fehlender Tarif." },
      { status: 400 }
    );
  }

  // Decline test card ending in 0002 (mirrors Stripe test decline pattern)
  const digits = (body.cardNumber ?? "").replace(/\D/g, "");
  if (body.fail || digits.endsWith("0002")) {
    return NextResponse.json(
      { error: "Zahlung abgelehnt (Mock). Nutzen Sie eine Karte, die nicht auf 0002 endet." },
      { status: 402 }
    );
  }

  const trialEnd = new Date(
    Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000
  ).toISOString();

  const billing = createBillingAdminClient(user.id);
  const { error } = await upsertSubscription(billing as never, {
    user_id: user.id,
    plan_key: plan,
    stripe_customer_id: `cus_mock_${user.id}`,
    stripe_subscription_id: `sub_mock_${user.id}_${Date.now()}`,
    status: "trialing",
    current_period_end: trialEnd,
    trial_end: trialEnd,
    cancel_at_period_end: false,
  });
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  await supabase.from("customer_profiles").upsert(
    {
      id: user.id,
      email: user.email ?? "",
      selected_plan: plan,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );

  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("display_name, company_name, email")
    .eq("id", user.id)
    .maybeSingle();

  const { data: agent } = await supabase
    .from("agent_configs")
    .select("company_name, avv_accepted_at")
    .eq("user_id", user.id)
    .maybeSingle();

  const to =
    (profile as { email?: string } | null)?.email ||
    user.email ||
    "customer@sailly.test";
  const customerName =
    (profile as { display_name?: string } | null)?.display_name ||
    user.user_metadata?.display_name ||
    to.split("@")[0];
  const companyName =
    (agent as { company_name?: string } | null)?.company_name ||
    (profile as { company_name?: string | null } | null)?.company_name ||
    null;
  const avvAcceptedAt =
    (agent as { avv_accepted_at?: string | null } | null)?.avv_accepted_at ??
    null;

  const rendered = renderContractWelcomeEmail(
    buildContractEmailInput({
      to,
      customerName,
      companyName,
      planKey: plan,
      locale,
      trialEndIso: trialEnd,
      avvAcceptedAt,
    })
  );

  let emailPreview = rendered;
  if (isMockAuth()) {
    const stored = pushMockEmail(rendered);
    emailPreview = stored;
  } else {
    console.info("[contract-email-stub]", rendered.subject, "→", rendered.to);
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    new URL(req.url).origin;
  const successUrl = `${origin}/${locale}/dashboard?checkout=mock_success&email=1`;

  const res = NextResponse.json({
    url: successUrl,
    mock: true,
    email: {
      id: "id" in emailPreview ? (emailPreview as { id: string }).id : null,
      to: emailPreview.to,
      subject: emailPreview.subject,
      text: emailPreview.text,
    },
  });
  res.cookies.set(PLAN_COOKIE, plan, {
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    sameSite: "lax",
  });
  return res;
}
