import {
  defaultPostAuthPath,
  sanitizeNextPath,
} from "@/lib/auth/safe-redirect";

type AuthLikeClient = {
  from: (table: string) => {
    select: (columns?: string) => {
      eq: (
        column: string,
        value: string
      ) => {
        maybeSingle: () => Promise<{ data: { id?: string } | null }>;
      };
    };
  };
};

/**
 * Shared post-auth destination:
 * 1. Safe `next` query if present
 * 2. Else dashboard if agent_configs exists, otherwise onboarding
 */
export async function resolvePostAuthPath(
  supabase: AuthLikeClient,
  userId: string,
  locale: string,
  nextParam?: string | null
): Promise<string> {
  const safeNext = sanitizeNextPath(nextParam, locale);
  if (safeNext) return safeNext;

  const { data: config } = await supabase
    .from("agent_configs")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  return defaultPostAuthPath(locale, Boolean(config));
}
