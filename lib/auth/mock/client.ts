import {
  getMockUserById,
  mockSignIn,
  mockSignUp,
  mockTableQuery,
} from "./query";
import { hasAgentConfig } from "./store";

type Filter = { column: string; value: unknown };

/**
 * Chainable query builder that mirrors the subset of Supabase used by the app.
 * Browser mock talks to /api/mock/db; server mock hits the in-memory store directly.
 */
function createQueryBuilder(
  table: string,
  executor: (body: Record<string, unknown>) => Promise<{ data: unknown; error: { message: string } | null }>
) {
  const state: {
    filters: Filter[];
    action: "select" | "insert" | "update" | "upsert" | "delete";
    payload?: Record<string, unknown> | Record<string, unknown>[];
    single?: "maybe" | "single";
    onConflict?: string;
    columns?: string;
  } = {
    filters: [],
    action: "select",
  };

  const run = async () =>
    executor({
      table,
      action: state.action,
      filters: state.filters,
      payload: state.payload,
      single: state.single,
      onConflict: state.onConflict,
      columns: state.columns,
    });

  const builder: Record<string, unknown> = {
    select(columns = "*") {
      state.columns = columns;
      if (state.action === "insert" || state.action === "update" || state.action === "upsert") {
        // keep mutation action
      } else {
        state.action = "select";
      }
      return builder;
    },
    insert(payload: Record<string, unknown> | Record<string, unknown>[]) {
      state.action = "insert";
      state.payload = payload;
      return builder;
    },
    update(payload: Record<string, unknown>) {
      state.action = "update";
      state.payload = payload;
      return builder;
    },
    upsert(
      payload: Record<string, unknown> | Record<string, unknown>[],
      opts?: { onConflict?: string }
    ) {
      state.action = "upsert";
      state.payload = payload;
      state.onConflict = opts?.onConflict;
      return builder;
    },
    delete() {
      state.action = "delete";
      return builder;
    },
    eq(column: string, value: unknown) {
      state.filters.push({ column, value });
      return builder;
    },
    maybeSingle() {
      state.single = "maybe";
      return run();
    },
    single() {
      state.single = "single";
      return run();
    },
    then(
      resolve: (value: { data: unknown; error: { message: string } | null }) => unknown,
      reject?: (reason: unknown) => unknown
    ) {
      return run().then(resolve, reject);
    },
  };

  return builder;
}

async function browserDb(body: Record<string, unknown>) {
  const res = await fetch("/api/mock/db", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  return res.json();
}

async function browserAuth(path: string, body?: Record<string, unknown>) {
  const res = await fetch(`/api/mock/auth/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body ?? {}),
  });
  return res.json();
}

export function createMockBrowserClient() {
  return {
    auth: {
      async getUser() {
        const result = await browserAuth("me");
        return {
          data: { user: result.user ?? null },
          error: result.error ? { message: result.error } : null,
        };
      },
      async signInWithPassword({
        email,
        password,
      }: {
        email: string;
        password: string;
      }) {
        return browserAuth("login", { email, password });
      },
      async signUp({
        email,
        password,
        options,
      }: {
        email: string;
        password: string;
        options?: { data?: Record<string, string>; emailRedirectTo?: string };
      }) {
        return browserAuth("register", {
          email,
          password,
          metadata: options?.data ?? {},
        });
      },
      async signInWithOAuth({
        options,
      }: {
        provider: string;
        options?: { redirectTo?: string; queryParams?: Record<string, string> };
      }) {
        const redirectTo =
          options?.redirectTo ??
          `${window.location.origin}/auth/callback?next=/de/onboarding`;
        // Simulate OAuth by hitting mock callback with a seeded incomplete user
        window.location.href = `/api/mock/auth/oauth?email=${encodeURIComponent(
          "new@sailly.test"
        )}&redirect_to=${encodeURIComponent(redirectTo)}`;
        return { data: { provider: "google", url: null }, error: null };
      },
      async signInWithOtp({
        email,
        options,
      }: {
        email: string;
        options?: { emailRedirectTo?: string };
      }) {
        const result = await browserAuth("magic-link", {
          email,
          redirectTo: options?.emailRedirectTo,
        });
        return {
          data: result.data ?? {},
          error: result.error ?? null,
          mockVerifyUrl: result.mockVerifyUrl as string | undefined,
        };
      },
      async signOut() {
        return browserAuth("logout");
      },
      async exchangeCodeForSession(_code: string) {
        return { data: { session: null, user: null }, error: null };
      },
    },
    from(table: string) {
      return createQueryBuilder(table, browserDb);
    },
  };
}

export function createMockServerClient(userId: string | null) {
  return {
    auth: {
      async getUser() {
        const user = getMockUserById(userId);
        return {
          data: { user },
          error: user ? null : null,
        };
      },
      async signOut() {
        return { error: null };
      },
      async exchangeCodeForSession(_code: string) {
        return { data: { session: null, user: null }, error: null };
      },
    },
    from(table: string) {
      return createQueryBuilder(table, async (body) =>
        mockTableQuery(String(body.table), body.action as "select", {
          filters: body.filters as Filter[] | undefined,
          payload: body.payload as Record<string, unknown> | undefined,
          single: body.single as "maybe" | "single" | undefined,
          onConflict: body.onConflict as string | undefined,
        })
      );
    },
  };
}

export { mockSignIn, mockSignUp, hasAgentConfig, getMockUserById };
