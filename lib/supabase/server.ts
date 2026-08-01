import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { isMockAuth } from "@/lib/auth/mode";
import { createMockServerClient } from "@/lib/auth/mock/client";
import {
  MOCK_SESSION_COOKIE,
  parseMockSession,
} from "@/lib/auth/mock/session";

export async function createClient() {
  const cookieStore = await cookies();

  if (isMockAuth()) {
    const { userId } = parseMockSession(
      cookieStore.get(MOCK_SESSION_COOKIE)?.value
    );
    return createMockServerClient(userId) as unknown as ReturnType<
      typeof createServerClient
    >;
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // setAll called from a Server Component — middleware handles session refresh
          }
        },
      },
    }
  );
}
