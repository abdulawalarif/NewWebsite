import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import {
  getStripeWebhookSecret,
  isMockStripe,
} from "@/lib/stripe/config";
import {
  createBillingAdminClient,
  mapStripeStatus,
  planFromMetadata,
  setAgentSuspended,
  upsertSubscription,
} from "@/lib/stripe/subscriptions";
import { parsePlanKey } from "@/lib/auth/plan-cookie";

export const runtime = "nodejs";

async function handleSubscriptionEvent(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: { from: (t: string) => any },
  sub: Stripe.Subscription
) {
  const userId =
    sub.metadata?.user_id ||
    (typeof sub.customer === "string" ? null : null);
  const metaUser = sub.metadata?.user_id;
  if (!metaUser) {
    // Look up by stripe_subscription_id / customer if metadata missing
    const { data: existing } = await admin
      .from("subscriptions")
      .select("user_id, plan_key")
      .eq("stripe_subscription_id", sub.id)
      .maybeSingle();
    if (!existing?.user_id) {
      console.warn("stripe webhook: no user for subscription", sub.id);
      return;
    }
    const plan =
      planFromMetadata(sub.metadata) ??
      parsePlanKey(existing.plan_key) ??
      "main";
    await upsertSubscription(admin, {
      user_id: existing.user_id,
      plan_key: plan,
      stripe_customer_id:
        typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
      stripe_subscription_id: sub.id,
      status: mapStripeStatus(sub.status),
      current_period_end: periodEndIso(sub),
      trial_end: sub.trial_end
        ? new Date(sub.trial_end * 1000).toISOString()
        : null,
      cancel_at_period_end: sub.cancel_at_period_end,
    });
    if (sub.status === "unpaid" || sub.status === "canceled") {
      await setAgentSuspended(admin, existing.user_id);
    }
    return;
  }

  const plan = planFromMetadata(sub.metadata) ?? "main";
  await upsertSubscription(admin, {
    user_id: metaUser,
    plan_key: plan,
    stripe_customer_id:
      typeof sub.customer === "string" ? sub.customer : sub.customer?.id,
    stripe_subscription_id: sub.id,
    status: mapStripeStatus(sub.status),
    current_period_end: periodEndIso(sub),
    trial_end: sub.trial_end
      ? new Date(sub.trial_end * 1000).toISOString()
      : null,
    cancel_at_period_end: sub.cancel_at_period_end,
  });

  if (sub.status === "unpaid" || sub.status === "past_due") {
    // past_due: warn via status; unpaid/canceled: suspend
  }
  if (sub.status === "unpaid" || sub.status === "canceled") {
    await setAgentSuspended(admin, metaUser);
  }

  void userId;
}

function periodEndIso(sub: Stripe.Subscription): string | null {
  const end =
    (sub as Stripe.Subscription & { current_period_end?: number })
      .current_period_end ?? null;
  return end ? new Date(end * 1000).toISOString() : null;
}

export async function POST(req: NextRequest) {
  if (isMockStripe() && !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json(
      { error: "Real Stripe webhook disabled in mock mode. Use checkout mock path." },
      { status: 404 }
    );
  }

  const secret = getStripeWebhookSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "STRIPE_WEBHOOK_SECRET missing" },
      { status: 503 }
    );
  }

  const stripe = getStripe();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("stripe webhook signature failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const admin = createBillingAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId =
          session.metadata?.user_id || session.client_reference_id;
        const plan =
          planFromMetadata(session.metadata) ??
          parsePlanKey(session.metadata?.plan_key);
        if (userId && plan) {
          await upsertSubscription(admin as never, {
            user_id: userId,
            plan_key: plan,
            stripe_customer_id:
              typeof session.customer === "string"
                ? session.customer
                : session.customer?.id ?? null,
            stripe_subscription_id:
              typeof session.subscription === "string"
                ? session.subscription
                : session.subscription?.id ?? null,
            status: "trialing",
          });
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        await handleSubscriptionEvent(
          admin as never,
          event.data.object as Stripe.Subscription
        );
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const invSub = (
          invoice as Stripe.Invoice & { subscription?: string | { id: string } | null }
        ).subscription;
        const subId =
          typeof invSub === "string"
            ? invSub
            : invSub && typeof invSub === "object"
              ? invSub.id
              : null;
        if (subId) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { data: row } = await (admin as any)
            .from("subscriptions")
            .select("user_id, plan_key")
            .eq("stripe_subscription_id", subId)
            .maybeSingle();
          if (row?.user_id) {
            await upsertSubscription(admin as never, {
              user_id: row.user_id as string,
              plan_key: parsePlanKey(row.plan_key) ?? "main",
              stripe_subscription_id: subId,
              status: "past_due",
            });
            await setAgentSuspended(admin as never, row.user_id as string);
          }
        }
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("stripe webhook handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
