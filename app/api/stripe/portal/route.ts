import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMockStripe } from "@/lib/stripe/config";
import { getStripe } from "@/lib/stripe/client";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  let locale = "de";
  try {
    const body = await req.json();
    if (body?.locale) locale = String(body.locale);
  } catch {
    locale = req.cookies.get("NEXT_LOCALE")?.value ?? "de";
  }

  const origin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    new URL(req.url).origin;

  if (isMockStripe()) {
    return NextResponse.json({
      url: `${origin}/${locale}/dashboard?portal=mock`,
      mock: true,
    });
  }

  const { data: sub } = await supabase
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const customerId = (sub as { stripe_customer_id?: string } | null)
    ?.stripe_customer_id;

  if (!customerId) {
    return NextResponse.json(
      { error: "Kein Stripe-Kunde gefunden. Bitte zuerst abonnieren." },
      { status: 400 }
    );
  }

  try {
    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/${locale}/dashboard`,
    });
    return NextResponse.json({ url: session.url, mock: false });
  } catch (err) {
    console.error("stripe portal error:", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "Kundenportal fehlgeschlagen.",
      },
      { status: 500 }
    );
  }
}
