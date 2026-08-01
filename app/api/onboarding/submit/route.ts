import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMockAuth } from "@/lib/auth/mode";
import {
  encodeMockSession,
  MOCK_COOKIE_OPTIONS,
  MOCK_SESSION_COOKIE,
  parseMockSession,
} from "@/lib/auth/mock/session";
import { cookies } from "next/headers";

export async function POST(req: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  try {
    const body = await req.json();

    const { error } = await supabase.from("agent_configs").upsert(
      {
        user_id: user.id,
        company_name: body.company_name,
        industry: body.industry,
        business_hours: body.business_hours,
        services: body.services,
        languages: body.languages,
        google_maps_url: body.google_maps_url,
        agent_name: body.agent_name,
        voice_id: body.voice_id,
        greeting_text: body.greeting_text,
        escalation_contacts: body.escalation_contacts,
        phone_number: body.phone_number,
        provider: body.provider,
        forwarding_mode: body.forwarding_mode,
        forwarding_instructions: body.forwarding_instructions,
        avv_accepted: body.avv_accepted,
        avv_accepted_at: body.avv_accepted ? new Date().toISOString() : null,
        transcript_consent: body.transcript_consent,
        data_retention_days: body.data_retention_days,
        status: "pending",
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" }
    );

    if (error) {
      console.error("onboarding submit error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Clear draft after successful submit
    await supabase.from("onboarding_drafts").delete().eq("user_id", user.id);

    const res = NextResponse.json({ success: true });

    // Mock: flip onboarded bit in session cookie so Edge middleware sees it
    if (isMockAuth()) {
      const cookieStore = await cookies();
      const current = parseMockSession(
        cookieStore.get(MOCK_SESSION_COOKIE)?.value
      );
      const userId = current.userId ?? user.id;
      res.cookies.set(
        MOCK_SESSION_COOKIE,
        encodeMockSession(userId, true),
        MOCK_COOKIE_OPTIONS
      );
    }

    return res;
  } catch (err) {
    console.error("onboarding submit unexpected error:", err);
    return NextResponse.json({ error: "Serverfehler." }, { status: 500 });
  }
}
