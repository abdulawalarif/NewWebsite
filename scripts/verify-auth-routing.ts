/**
 * Verifies login → onboarding gate → dashboard routing with mock auth.
 * Run: npx tsx scripts/verify-auth-routing.ts
 * (or: AUTH_MODE=mock NEXT_PUBLIC_AUTH_MODE=mock node --import tsx scripts/verify-auth-routing.ts)
 *
 * Also hits a running server when BASE_URL is set (default http://localhost:3000).
 */

import {
  defaultPostAuthPath,
  sanitizeNextPath,
} from "../lib/auth/safe-redirect";
import {
  getMockStore,
  hasAgentConfig,
  resetMockStore,
} from "../lib/auth/mock/store";
import { mockSignIn, mockTableQuery } from "../lib/auth/mock/query";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";

type Check = { name: string; ok: boolean; detail?: string };

const checks: Check[] = [];

function assert(name: string, ok: boolean, detail?: string) {
  checks.push({ name, ok, detail });
  const mark = ok ? "✓" : "✗";
  console.log(`${mark} ${name}${detail ? ` — ${detail}` : ""}`);
}

function unitTests() {
  console.log("\n== Unit: safe redirects ==");
  assert(
    "rejects absolute URL next",
    sanitizeNextPath("https://evil.com") === null
  );
  assert(
    "rejects protocol-relative next",
    sanitizeNextPath("//evil.com") === null
  );
  assert(
    "allows locale path",
    sanitizeNextPath("/de/dashboard") === "/de/dashboard"
  );
  assert(
    "prefixes locale when missing",
    sanitizeNextPath("/dashboard", "de") === "/de/dashboard"
  );

  console.log("\n== Unit: post-auth destinations ==");
  assert(
    "incomplete → onboarding",
    defaultPostAuthPath("de", false) === "/de/onboarding"
  );
  assert(
    "complete → dashboard",
    defaultPostAuthPath("de", true) === "/de/dashboard"
  );

  console.log("\n== Unit: mock seed users ==");
  resetMockStore();
  const store = getMockStore();

  const newLogin = mockSignIn("new@sailly.test", "password123");
  assert("new user can sign in", Boolean(newLogin.data.user));
  assert(
    "new user has no agent_configs",
    !hasAgentConfig(newLogin.data.user!.id)
  );

  const doneLogin = mockSignIn("done@sailly.test", "password123");
  assert("done user can sign in", Boolean(doneLogin.data.user));
  assert(
    "done user has agent_configs",
    hasAgentConfig(doneLogin.data.user!.id)
  );

  const draftLogin = mockSignIn("draft@sailly.test", "password123");
  assert("draft user can sign in", Boolean(draftLogin.data.user));
  const draft = mockTableQuery("onboarding_drafts", "select", {
    filters: [{ column: "user_id", value: draftLogin.data.user!.id }],
    single: "maybe",
  });
  assert("draft user has onboarding draft", Boolean(draft.data));

  assert(
    "bad password rejected",
    mockSignIn("new@sailly.test", "wrong").error?.message.includes("Invalid") ===
      true
  );

  // Simulate onboarding submit for new user
  const uid = newLogin.data.user!.id;
  const upsert = mockTableQuery("agent_configs", "upsert", {
    payload: {
      user_id: uid,
      company_name: "Test GmbH",
      industry: "medical",
      agent_name: "Sailly",
      escalation_contacts: [],
      avv_accepted: true,
      transcript_consent: true,
      data_retention_days: 90,
      status: "pending",
      submitted_at: new Date().toISOString(),
    },
  });
  assert("onboarding upsert works", !upsert.error && Boolean(upsert.data));
  assert("after submit, user is onboarded", hasAgentConfig(uid));

  // Plan + mock subscription
  const planUpsert = mockTableQuery("customer_profiles", "upsert", {
    payload: {
      id: uid,
      email: "new@sailly.test",
      selected_plan: "main",
    },
  });
  assert(
    "profile selected_plan persisted",
    !planUpsert.error &&
      (planUpsert.data as { selected_plan?: string })?.selected_plan === "main"
  );

  const subUpsert = mockTableQuery("subscriptions", "upsert", {
    payload: {
      user_id: uid,
      plan_key: "main",
      status: "trialing",
      stripe_customer_id: "cus_mock_test",
      stripe_subscription_id: "sub_mock_test",
    },
  });
  assert("subscription upsert works", !subUpsert.error && Boolean(subUpsert.data));
  const subRead = mockTableQuery("subscriptions", "select", {
    filters: [{ column: "user_id", value: uid }],
    single: "maybe",
  });
  assert(
    "subscription readable",
    (subRead.data as { status?: string })?.status === "trialing"
  );

  void store;
}

async function follow(
  path: string,
  cookie?: string
): Promise<{ status: number; location: string | null; setCookie: string | null; bodySnippet: string }> {
  const res = await fetch(`${BASE}${path}`, {
    redirect: "manual",
    headers: cookie ? { cookie } : {},
  });
  return {
    status: res.status,
    location: res.headers.get("location"),
    setCookie: res.headers.get("set-cookie"),
    bodySnippet: "",
  };
}

function pickCookie(setCookie: string | null): string | undefined {
  if (!setCookie) return undefined;
  // Matches sailly_mock_uid=userId or sailly_mock_uid=userId:0|1
  const match = setCookie.match(/sailly_mock_uid=[^;]+/);
  return match?.[0];
}

async function httpTests() {
  console.log(`\n== HTTP against ${BASE} ==`);

  try {
    const health = await fetch(`${BASE}/api/mock/auth/accounts`);
    if (!health.ok) {
      assert(
        "mock API reachable",
        false,
        `status ${health.status} — start server with AUTH_MODE=mock`
      );
      return;
    }
    assert("mock API reachable", true);
  } catch (err) {
    assert(
      "mock API reachable",
      false,
      `server not running (${err instanceof Error ? err.message : "error"})`
    );
    return;
  }

  // Unauthenticated dashboard → login
  const dash = await follow("/de/dashboard");
  assert(
    "guest /dashboard → login",
    dash.status >= 300 &&
      dash.status < 400 &&
      (dash.location ?? "").includes("/login"),
    dash.location ?? undefined
  );

  // Unauthenticated onboarding → login
  const onboard = await follow("/de/onboarding");
  assert(
    "guest /onboarding → login",
    onboard.status >= 300 &&
      onboard.status < 400 &&
      (onboard.location ?? "").includes("/login"),
    onboard.location ?? undefined
  );

  // Login as incomplete user (fresh register — seed may be mutated in long-lived server)
  const loginNew = await fetch(`${BASE}/api/mock/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `new-${Date.now()}@sailly.test`,
      password: "password123",
      metadata: {
        display_name: "New User",
        first_name: "New",
        last_name: "User",
      },
    }),
  });
  const loginNewJson = await loginNew.json();
  const newCookie = pickCookie(loginNew.headers.get("set-cookie"));
  assert("login new@ sets session cookie", Boolean(newCookie));
  assert("login new@ returns user", Boolean(loginNewJson.data?.user));

  const newDash = await follow("/de/dashboard", newCookie);
  assert(
    "new user /dashboard → onboarding",
    (newDash.location ?? "").includes("/onboarding"),
    newDash.location ?? `status ${newDash.status}`
  );

  const newOnboarding = await follow("/de/onboarding", newCookie);
  assert(
    "new user can open /onboarding",
    newOnboarding.status === 200 ||
      (newOnboarding.status >= 300 &&
        (newOnboarding.location ?? "").includes("/onboarding")),
    `status ${newOnboarding.status} loc=${newOnboarding.location}`
  );

  // Login as done
  const loginDone = await fetch(`${BASE}/api/mock/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: "done@sailly.test",
      password: "password123",
    }),
  });
  const doneCookie = pickCookie(loginDone.headers.get("set-cookie"));
  assert("login done@ sets session cookie", Boolean(doneCookie));

  const doneOnboarding = await follow("/de/onboarding", doneCookie);
  assert(
    "done user /onboarding → dashboard",
    (doneOnboarding.location ?? "").includes("/dashboard"),
    doneOnboarding.location ?? `status ${doneOnboarding.status}`
  );

  const doneDash = await follow("/de/dashboard", doneCookie);
  assert(
    "done user can open /dashboard",
    doneDash.status === 200 ||
      (doneDash.status >= 300 &&
        !(doneDash.location ?? "").includes("/onboarding") &&
        !(doneDash.location ?? "").includes("/login")),
    `status ${doneDash.status} loc=${doneDash.location}`
  );

  // Logged-in user hitting login → bounce away
  const doneLoginPage = await follow("/de/login", doneCookie);
  assert(
    "done user /login → dashboard",
    (doneLoginPage.location ?? "").includes("/dashboard"),
    doneLoginPage.location ?? undefined
  );

  // Open redirect rejection via login next (middleware/login sanitize is client-side;
  // callback sanitize covered in unit tests). Probe callback with evil next:
  const evil = await follow(
    "/auth/callback?code=mock&next=https://evil.com",
    doneCookie
  );
  assert(
    "callback rejects external next",
    !(evil.location ?? "").includes("evil.com"),
    evil.location ?? undefined
  );

  // Full onboarding submit → cookie flips → dashboard allowed
  const reg = await fetch(`${BASE}/api/mock/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `flow-${Date.now()}@sailly.test`,
      password: "password123",
      metadata: { display_name: "Flow", first_name: "Flow", last_name: "Test" },
    }),
  });
  const flowCookie = pickCookie(reg.headers.get("set-cookie"));
  assert("register sets session cookie", Boolean(flowCookie));

  const beforeDash = await follow("/de/dashboard", flowCookie);
  assert(
    "fresh register /dashboard → onboarding",
    (beforeDash.location ?? "").includes("/onboarding"),
    beforeDash.location ?? undefined
  );

  const submit = await fetch(`${BASE}/api/onboarding/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(flowCookie ? { cookie: flowCookie } : {}),
    },
    body: JSON.stringify({
      company_name: "Flow Praxis",
      industry: "medical",
      agent_name: "Sailly",
      escalation_contacts: [],
      avv_accepted: true,
      transcript_consent: true,
      data_retention_days: 90,
      languages: ["de"],
      services: [],
    }),
  });
  const submitJson = await submit.json();
  const afterSubmitCookie =
    pickCookie(submit.headers.get("set-cookie")) ?? flowCookie;
  assert("onboarding submit succeeds", submit.ok && submitJson.success === true);

  const afterDash = await follow("/de/dashboard", afterSubmitCookie);
  assert(
    "after submit /dashboard allowed",
    afterDash.status === 200 ||
      !(afterDash.location ?? "").includes("/onboarding"),
    `status ${afterDash.status} loc=${afterDash.location}`
  );

  const afterOnboarding = await follow("/de/onboarding", afterSubmitCookie);
  assert(
    "after submit /onboarding → dashboard",
    (afterOnboarding.location ?? "").includes("/dashboard"),
    afterOnboarding.location ?? undefined
  );

  // ── Billing: plan cookie + mock checkout ──
  const billReg = await fetch(`${BASE}/api/mock/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: `bill-${Date.now()}@sailly.test`,
      password: "password123",
      metadata: {
        display_name: "Bill User",
        first_name: "Bill",
        last_name: "User",
      },
    }),
  });
  let billCookie = pickCookie(billReg.headers.get("set-cookie"));
  assert("billing register sets cookie", Boolean(billCookie));

  // Persist plan on profile via mock db
  const billUser = (await billReg.json()).data?.user;
  if (billUser?.id) {
    await fetch(`${BASE}/api/mock/db`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        table: "customer_profiles",
        action: "upsert",
        payload: {
          id: billUser.id,
          email: billUser.email,
          selected_plan: "main",
        },
      }),
    });
  }

  const billSubmit = await fetch(`${BASE}/api/onboarding/submit`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(billCookie ? { cookie: billCookie } : {}),
    },
    body: JSON.stringify({
      company_name: "Bill Praxis",
      industry: "restaurant",
      agent_name: "Sailly",
      escalation_contacts: [],
      avv_accepted: true,
      transcript_consent: true,
      data_retention_days: 90,
      languages: ["de"],
      services: ["Reservierung"],
    }),
  });
  billCookie =
    pickCookie(billSubmit.headers.get("set-cookie")) ?? billCookie;
  assert("billing onboarding submit ok", billSubmit.ok);

  const checkout = await fetch(`${BASE}/api/stripe/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(billCookie ? { cookie: `${billCookie}; sailly_selected_plan=main` } : {}),
    },
    body: JSON.stringify({ locale: "de", plan: "main" }),
  });
  const checkoutJson = await checkout.json();
  assert(
    "mock checkout returns redirect url",
    checkout.ok &&
      typeof checkoutJson.url === "string" &&
      checkoutJson.url.includes("checkout=mock_success"),
    JSON.stringify(checkoutJson)
  );
  assert("mock checkout flagged", checkoutJson.mock === true);

  const portal = await fetch(`${BASE}/api/stripe/portal`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(billCookie ? { cookie: billCookie } : {}),
    },
    body: JSON.stringify({ locale: "de" }),
  });
  const portalJson = await portal.json();
  assert(
    "mock portal returns url",
    portal.ok &&
      typeof portalJson.url === "string" &&
      portalJson.url.includes("portal=mock"),
    JSON.stringify(portalJson)
  );

  // first_class blocked
  const fc = await fetch(`${BASE}/api/stripe/checkout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(billCookie ? { cookie: billCookie } : {}),
    },
    body: JSON.stringify({ locale: "de", plan: "first_class" }),
  });
  assert("first_class checkout rejected", fc.status === 400);
}

async function main() {
  console.log("Sailly auth routing verification (mock)");
  unitTests();
  await httpTests();

  const failed = checks.filter((c) => !c.ok);
  console.log(
    `\n${checks.length - failed.length}/${checks.length} checks passed`
  );
  if (failed.length) {
    console.error("Failed:");
    failed.forEach((f) => console.error(` - ${f.name}: ${f.detail ?? ""}`));
    process.exit(1);
  }
}

main();
