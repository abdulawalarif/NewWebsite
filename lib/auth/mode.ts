/**
 * Mock auth is enabled when AUTH_MODE=mock (or NEXT_PUBLIC_AUTH_MODE=mock).
 * Client code must use the NEXT_PUBLIC_ variant.
 */
export function isMockAuth(): boolean {
  return (
    process.env.AUTH_MODE === "mock" ||
    process.env.NEXT_PUBLIC_AUTH_MODE === "mock"
  );
}
