import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMockAuth } from "@/lib/auth/mode";

export async function POST() {
  if (
    !isMockAuth() &&
    (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    return NextResponse.json({ ok: false }, { status: 503 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    await supabase
      .from("customer_profiles")
      .update({ last_login_at: new Date().toISOString() })
      .eq("id", user.id);
  }

  return NextResponse.json({ ok: true });
}
