import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { isMockAuth } from "@/lib/auth/mode";
import { createMockServerClient } from "@/lib/auth/mock/client";
import { MOCK_SESSION_COOKIE, parseMockSession } from "@/lib/auth/mock/session";
import { resolvePostAuthPath } from "@/lib/auth/post-auth";
import { sanitizeNextPath } from "@/lib/auth/safe-redirect";
import {
  PLAN_COOKIE,
  PLAN_COOKIE_OPTIONS,
  parsePlanKey,
} from "@/lib/auth/plan-cookie";

async function persistSelectedPlan(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: { from: (table: string) => any },
  userId: string,
  email: string | undefined,
  plan: ReturnType<typeof parsePlanKey>
) {
  if (!plan) return;
  await supabase.from("customer_profiles").upsert(
    {
      id: userId,
      email: email ?? "",
      selected_plan: plan,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "id" }
  );
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const locale = request.cookies.get("NEXT_LOCALE")?.value ?? "de";
  const nextParam = searchParams.get("next");
  const planFromCookie = parsePlanKey(
    request.cookies.get(PLAN_COOKIE)?.value
  );

  if (!code) {
    return NextResponse.redirect(`${origin}/${locale}/login?error=missing_code`);
  }

  // ── Mock auth ──
  if (isMockAuth()) {
    const { userId } = parseMockSession(
      request.cookies.get(MOCK_SESSION_COOKIE)?.value
    );
    if (!userId) {
      return NextResponse.redirect(
        `${origin}/${locale}/login?error=auth_callback_failed`
      );
    }

    const supabase = createMockServerClient(userId);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await persistSelectedPlan(
      supabase as never,
      userId,
      user?.email,
      planFromCookie
    );

    const destination = await resolvePostAuthPath(
      supabase as never,
      userId,
      locale,
      nextParam
    );
    const safe = sanitizeNextPath(destination, locale) ?? `/${locale}/dashboard`;
    const response = NextResponse.redirect(`${origin}${safe}`);
    if (planFromCookie) {
      response.cookies.set(PLAN_COOKIE, planFromCookie, PLAN_COOKIE_OPTIONS);
    }
    return response;
  }

  // ── Real Supabase ──
  const cookieJar: { name: string; value: string; options?: Record<string, unknown> }[] = [];

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach((c) => {
            request.cookies.set(c.name, c.value);
            cookieJar.push(c);
          });
        },
      },
    }
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth callback error:", error.message);
    return NextResponse.redirect(
      `${origin}/${locale}/login?error=auth_callback_failed`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let destination = sanitizeNextPath(nextParam, locale) ?? `/${locale}/dashboard`;

  if (user) {
    await persistSelectedPlan(supabase, user.id, user.email, planFromCookie);
    destination = await resolvePostAuthPath(
      supabase as never,
      user.id,
      locale,
      nextParam
    );
    destination =
      sanitizeNextPath(destination, locale) ?? `/${locale}/dashboard`;
  }

  const response = NextResponse.redirect(`${origin}${destination}`);
  cookieJar.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options);
  });
  if (planFromCookie) {
    response.cookies.set(PLAN_COOKIE, planFromCookie, PLAN_COOKIE_OPTIONS);
  }
  return response;
}
