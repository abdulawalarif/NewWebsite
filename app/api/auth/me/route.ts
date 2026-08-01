import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isMockAuth } from "@/lib/auth/mode";

export async function GET() {
  if (
    !isMockAuth() &&
    (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  ) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return NextResponse.json({ user: null }, { status: 401 });
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      displayName:
        user.user_metadata?.display_name ||
        user.user_metadata?.full_name ||
        user.email?.split("@")[0] ||
        "Nutzer",
      role: user.user_metadata?.role || "customer",
    },
  });
}
