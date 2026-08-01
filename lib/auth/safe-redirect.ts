const LOCALES = [
  "de",
  "en",
  "tr",
  "es",
  "ar",
  "zh",
  "ru",
  "pl",
  "fr",
  "el",
  "ko",
  "vi",
  "th",
];

/**
 * Only allow same-origin relative paths. Rejects protocol-relative,
 * absolute, and javascript: URLs. Returns null when unsafe.
 */
export function sanitizeNextPath(
  next: string | null | undefined,
  locale = "de"
): string | null {
  if (!next) return null;
  const trimmed = next.trim();
  if (!trimmed.startsWith("/")) return null;
  if (trimmed.startsWith("//")) return null;
  if (trimmed.includes("://")) return null;
  if (/[\s\\]/.test(trimmed)) return null;
  if (trimmed.toLowerCase().includes("javascript:")) return null;

  // Ensure locale prefix when missing (except /auth/*)
  if (trimmed.startsWith("/auth")) return trimmed;
  const hasLocale = LOCALES.some(
    (l) => trimmed === `/${l}` || trimmed.startsWith(`/${l}/`)
  );
  if (!hasLocale) {
    return `/${locale}${trimmed === "/" ? "" : trimmed}`;
  }
  return trimmed;
}

export function defaultPostAuthPath(
  locale: string,
  hasAgentConfig: boolean
): string {
  return hasAgentConfig
    ? `/${locale}/dashboard`
    : `/${locale}/onboarding`;
}
