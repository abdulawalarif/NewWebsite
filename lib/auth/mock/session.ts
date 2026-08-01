export const MOCK_SESSION_COOKIE = "sailly_mock_uid";

export const MOCK_COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 7, // 7 days
};

/**
 * Cookie payload: `userId` or `userId:0` / `userId:1`
 * The onboarded flag must live in the cookie because Edge middleware
 * cannot share the Node in-memory mock store.
 */
export function encodeMockSession(userId: string, onboarded: boolean): string {
  return `${userId}:${onboarded ? "1" : "0"}`;
}

export function parseMockSession(raw: string | null | undefined): {
  userId: string | null;
  onboarded: boolean | null;
} {
  if (!raw) return { userId: null, onboarded: null };
  const [userId, flag] = raw.split(":");
  if (!userId) return { userId: null, onboarded: null };
  if (flag === "1") return { userId, onboarded: true };
  if (flag === "0") return { userId, onboarded: false };
  // Legacy cookie without flag — unknown, let pages decide
  return { userId, onboarded: null };
}
