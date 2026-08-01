import { NextRequest, NextResponse } from "next/server";
import { isMockAuth } from "@/lib/auth/mode";
import {
  getMockUserById,
  mockSignIn,
  mockSignUp,
} from "@/lib/auth/mock/query";
import { getMockStore, hasAgentConfig, toAuthUser } from "@/lib/auth/mock/store";
import {
  MOCK_COOKIE_OPTIONS,
  MOCK_SESSION_COOKIE,
  encodeMockSession,
  parseMockSession,
} from "@/lib/auth/mock/session";
import {
  defaultPostAuthPath,
  sanitizeNextPath,
} from "@/lib/auth/safe-redirect";

function mockDisabled() {
  return NextResponse.json(
    { error: "Mock auth is disabled. Set AUTH_MODE=mock." },
    { status: 404 }
  );
}

function withSession(
  res: NextResponse,
  userId: string | null,
  onboarded = false
) {
  if (userId) {
    res.cookies.set(
      MOCK_SESSION_COOKIE,
      encodeMockSession(userId, onboarded),
      MOCK_COOKIE_OPTIONS
    );
  } else {
    res.cookies.set(MOCK_SESSION_COOKIE, "", {
      ...MOCK_COOKIE_OPTIONS,
      maxAge: 0,
    });
  }
  return res;
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  if (!isMockAuth()) return mockDisabled();

  const { action } = await params;
  const body = await req.json().catch(() => ({}));

  if (action === "me") {
    const { userId, onboarded } = parseMockSession(
      req.cookies.get(MOCK_SESSION_COOKIE)?.value
    );
    const user = getMockUserById(userId);
    return NextResponse.json({ user, onboarded });
  }

  if (action === "login") {
    const result = mockSignIn(String(body.email ?? ""), String(body.password ?? ""));
    if (result.error || !result.data.user) {
      return NextResponse.json(result);
    }
    return withSession(
      NextResponse.json(result),
      result.data.user.id,
      hasAgentConfig(result.data.user.id)
    );
  }

  if (action === "register") {
    const result = mockSignUp(
      String(body.email ?? ""),
      String(body.password ?? ""),
      (body.metadata as Record<string, string>) ?? {}
    );
    if (result.error || !result.data.user) {
      return NextResponse.json(result);
    }
    return withSession(NextResponse.json(result), result.data.user.id, false);
  }

  if (action === "logout") {
    return withSession(
      NextResponse.json({ error: null }),
      null
    );
  }

  if (action === "magic-link") {
    const email = String(body.email ?? "").trim().toLowerCase();
    if (!email) {
      return NextResponse.json({
        data: null,
        error: { message: "Email required" },
      });
    }

    const store = getMockStore();
    let userId = store.usersByEmail.get(email);
    if (!userId) {
      const signed = mockSignUp(email, `magic-${Date.now()}`, {
        display_name: email.split("@")[0],
      });
      userId = signed.data.user?.id;
    }

    // In mock mode we don't send email; return a one-click verify URL.
    const locale = "de";
    const redirectTo =
      sanitizeNextPath(body.redirectTo, locale) ??
      defaultPostAuthPath(locale, userId ? hasAgentConfig(userId) : false);

    const verifyUrl = `/api/mock/auth/oauth?email=${encodeURIComponent(
      email
    )}&redirect_to=${encodeURIComponent(
      `${req.nextUrl.origin}/auth/callback?next=${encodeURIComponent(redirectTo)}&code=mock`
    )}`;

    return NextResponse.json({
      data: { message: "Magic link ready (mock)", verifyUrl },
      error: null,
      // Convenience for UI: expose verify URL in mock mode
      mockVerifyUrl: verifyUrl,
    });
  }

  return NextResponse.json({ error: "Unknown mock auth action" }, { status: 404 });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ action: string }> }
) {
  if (!isMockAuth()) return mockDisabled();

  const { action } = await params;

  if (action === "oauth") {
    const email = (req.nextUrl.searchParams.get("email") ?? "new@sailly.test")
      .trim()
      .toLowerCase();
    const redirectToRaw = req.nextUrl.searchParams.get("redirect_to");
    const store = getMockStore();
    let userId = store.usersByEmail.get(email);

    if (!userId) {
      const signed = mockSignUp(email, `oauth-${Date.now()}`, {
        display_name: email.split("@")[0],
        full_name: email.split("@")[0],
      });
      userId = signed.data.user?.id;
    }

    const user = userId ? store.users.get(userId) : null;
    if (!user) {
      return NextResponse.redirect(new URL("/de/login?error=auth_callback_failed", req.url));
    }

    // Prefer going through /auth/callback so production routing is exercised.
    let target = redirectToRaw;
    if (!target) {
      const path = defaultPostAuthPath("de", hasAgentConfig(user.id));
      target = `${req.nextUrl.origin}/auth/callback?code=mock&next=${encodeURIComponent(path)}`;
    }

    // If redirect already is callback URL, just set cookie and go.
    // exchange is mocked — set session here.
    const url = new URL(target, req.nextUrl.origin);
    // Force code=mock so callback accepts it in mock mode
    if (url.pathname === "/auth/callback" && !url.searchParams.get("code")) {
      url.searchParams.set("code", "mock");
    }

    const res = NextResponse.redirect(url);
    res.cookies.set(
      MOCK_SESSION_COOKIE,
      encodeMockSession(user.id, hasAgentConfig(user.id)),
      MOCK_COOKIE_OPTIONS
    );
    return res;
  }

  if (action === "accounts") {
    return NextResponse.json({
      accounts: [
        {
          email: "new@sailly.test",
          password: "password123",
          route: "→ /onboarding (no agent_configs)",
        },
        {
          email: "draft@sailly.test",
          password: "password123",
          route: "→ /onboarding (has draft)",
        },
        {
          email: "done@sailly.test",
          password: "password123",
          route: "→ /dashboard (has agent_configs)",
        },
      ],
    });
  }

  if (action === "me") {
    const { userId, onboarded } = parseMockSession(
      req.cookies.get(MOCK_SESSION_COOKIE)?.value
    );
    const user = getMockUserById(userId);
    return NextResponse.json({
      user,
      onboarded:
        onboarded ?? (userId ? hasAgentConfig(userId) : false),
    });
  }

  // silence unused import warning for toAuthUser in some builds
  void toAuthUser;

  return NextResponse.json({ error: "Unknown mock auth action" }, { status: 404 });
}
