import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { isMockAuth } from "@/lib/auth/mode";
import {
  MOCK_SESSION_COOKIE,
  parseMockSession,
} from "@/lib/auth/mock/session";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

export type SessionUser = {
  id: string;
  email?: string | null;
};

export async function updateSession(request: NextRequest): Promise<{
  supabaseResponse: NextResponse;
  user: SessionUser | null;
  onboarded: boolean | null;
}> {
  let supabaseResponse = NextResponse.next({ request });

  if (isMockAuth()) {
    // Edge middleware cannot share Node's in-memory mock store.
    // Auth + onboarding gate are encoded in the session cookie.
    const parsed = parseMockSession(
      request.cookies.get(MOCK_SESSION_COOKIE)?.value
    );
    return {
      supabaseResponse,
      user: parsed.userId ? { id: parsed.userId, email: null } : null,
      onboarded: parsed.onboarded,
    };
  }

  if (!supabaseConfigured) {
    return { supabaseResponse, user: null, onboarded: null };
  }

  const supabase = createServerClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let onboarded: boolean | null = null;
  if (user) {
    const { data: config } = await supabase
      .from("agent_configs")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    onboarded = Boolean(config);
  }

  return {
    supabaseResponse,
    user: user ? { id: user.id, email: user.email } : null,
    onboarded,
  };
}
