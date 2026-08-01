import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { sanitizeNextPath } from "@/lib/auth/safe-redirect";

const locales = [
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
const defaultLocale = "de";
const LOCALE_COOKIE = "NEXT_LOCALE";

function getLocale(request: NextRequest) {
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  if (cookieLocale && locales.includes(cookieLocale)) {
    return cookieLocale;
  }

  const acceptLanguage = request.headers.get("accept-language");
  if (!acceptLanguage) return defaultLocale;

  const lang = acceptLanguage.toLowerCase();
  for (const locale of locales) {
    if (lang.includes(locale)) return locale;
  }

  return defaultLocale;
}

function stripLocale(pathname: string): { locale: string | null; rest: string } {
  for (const locale of locales) {
    if (pathname === `/${locale}`) {
      return { locale, rest: "/" };
    }
    if (pathname.startsWith(`/${locale}/`)) {
      return { locale, rest: pathname.slice(locale.length + 1) || "/" };
    }
  }
  return { locale: null, rest: pathname };
}

function copyCookies(from: NextResponse, to: NextResponse) {
  from.cookies.getAll().forEach((cookie) => to.cookies.set(cookie));
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, onboarded } = await updateSession(request);
  const { pathname } = request.nextUrl;
  const { locale: pathLocale, rest } = stripLocale(pathname);

  // Locale redirect for paths without a locale prefix
  if (!pathLocale) {
    const locale = getLocale(request);
    const newUrl = new URL(`/${locale}${pathname}`, request.url);
    newUrl.search = request.nextUrl.search;
    const response = NextResponse.redirect(newUrl);
    copyCookies(supabaseResponse, response);
    response.cookies.set(LOCALE_COOKIE, locale, {
      maxAge: 365 * 24 * 60 * 60,
      path: "/",
      sameSite: "lax",
    });
    return response;
  }

  const locale = pathLocale;
  const isLogin = rest === "/login" || rest.startsWith("/login/");
  const isOnboarding =
    rest === "/onboarding" || rest.startsWith("/onboarding/");
  const isDashboard =
    rest === "/dashboard" || rest.startsWith("/dashboard/");
  const isCheckout = rest === "/checkout" || rest.startsWith("/checkout/");
  const isEditOnboarding =
    isOnboarding && request.nextUrl.searchParams.get("edit") === "true";

  // Protected routes: require auth
  if ((isDashboard || isOnboarding || isCheckout) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = `/${locale}/login`;
    loginUrl.search = "";
    const next = sanitizeNextPath(
      `${pathname}${request.nextUrl.search}`,
      locale
    );
    if (next) loginUrl.searchParams.set("next", next);
    const response = NextResponse.redirect(loginUrl);
    copyCookies(supabaseResponse, response);
    return response;
  }

  // Logged-in users on login → send to dashboard or onboarding
  if (isLogin && user) {
    const dest =
      onboarded === false
        ? `/${locale}/onboarding`
        : `/${locale}/dashboard`;
    const response = NextResponse.redirect(new URL(dest, request.url));
    copyCookies(supabaseResponse, response);
    return response;
  }

  // Incomplete onboarding cannot stay on dashboard
  if (isDashboard && user && onboarded === false) {
    const response = NextResponse.redirect(
      new URL(`/${locale}/onboarding`, request.url)
    );
    copyCookies(supabaseResponse, response);
    return response;
  }

  // Completed users skip onboarding unless editing
  if (isOnboarding && user && onboarded === true && !isEditOnboarding) {
    const response = NextResponse.redirect(
      new URL(`/${locale}/dashboard`, request.url)
    );
    copyCookies(supabaseResponse, response);
    return response;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!api|auth|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|opengraph-image|manifest.json|google[a-f0-9]+\\.html|bing[a-f0-9]+\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|woff|woff2|ttf|eot|otf|mp3|wav|m4a|mp4|webm|ico|json)$).*)",
  ],
};
