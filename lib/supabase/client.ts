import { createBrowserClient } from "@supabase/ssr";
import { isMockAuth } from "@/lib/auth/mode";
import { createMockBrowserClient } from "@/lib/auth/mock/client";

export function createClient() {
  if (isMockAuth()) {
    return createMockBrowserClient() as ReturnType<typeof createBrowserClient>;
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
