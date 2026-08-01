import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { AgentConfig, Subscription } from "@/types/onboarding";
import { isCheckoutablePlanKey } from "@/lib/auth/plan-cookie";
import DashboardLogoutButton from "./logout-button";
import AudioValidationSection from "./audio-validation-section";
import LastCallsSection from "./last-calls-section";
import TestCallButton from "./test-call-button";
import BillingActions from "./billing-actions";

export const metadata: Metadata = {
  title: "Dashboard – Sailly",
  robots: { index: false },
};

const PLAN_LABELS: Record<string, string> = {
  starters: "Starters",
  main: "Main",
  president_suite: "President Suite",
  first_class: "First Class",
};

const SUB_STATUS_LABEL: Record<string, string> = {
  trialing: "Testphase",
  active: "Aktiv",
  past_due: "Zahlung ausstehend",
  canceled: "Gekündigt",
  unpaid: "Unbezahlt",
  incomplete: "Unvollständig",
};

export default async function DashboardPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ checkout?: string; portal?: string }>;
}) {
  const { locale } = await params;
  const qs = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const { data: agentConfig } = (await supabase
    .from("agent_configs")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()) as { data: AgentConfig | null };

  const { data: subscription } = (await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()) as { data: Subscription | null };

  const displayName =
    profile?.display_name ||
    user.user_metadata?.display_name ||
    user.user_metadata?.full_name ||
    user.email?.split("@")[0] ||
    "Nutzer";

  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const statusColor = {
    active: "bg-emerald-100 text-emerald-700",
    inactive: "bg-slate-100 text-slate-500",
    pending: "bg-amber-100 text-amber-700",
    suspended: "bg-red-100 text-red-600",
  };

  const statusLabel = {
    active: "Aktiv",
    inactive: "Inaktiv",
    pending: "Wird eingerichtet",
    suspended: "Gesperrt",
  };

  const hasPaidSub =
    subscription?.status === "active" || subscription?.status === "trialing";
  const selectedPlan = profile?.selected_plan ?? subscription?.plan_key ?? null;
  const checkoutablePlan = isCheckoutablePlanKey(selectedPlan)
    ? selectedPlan
    : null;

  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-gradient-soft px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Willkommen, {displayName}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              Ihr persönliches Sailly-Dashboard
            </p>
          </div>
          <DashboardLogoutButton locale={locale} />
        </div>

        {(qs.checkout === "success" || qs.checkout === "mock_success") && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Zahlung erfolgreich — Ihr Abo ist aktiv
            {qs.checkout === "mock_success" ? " (Mock)." : "."}
          </div>
        )}
        {qs.portal === "mock" && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Mock-Kundenportal: In Produktion öffnet sich hier das Stripe Billing
            Portal.
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h2 className="font-semibold text-slate-900 text-lg">
                Abo & Abrechnung
              </h2>
              {subscription ? (
                <div className="mt-2 space-y-1 text-sm text-slate-600">
                  <p>
                    Tarif:{" "}
                    <span className="font-medium text-slate-900">
                      {PLAN_LABELS[subscription.plan_key] ??
                        subscription.plan_key}
                    </span>
                  </p>
                  <p>
                    Status:{" "}
                    <span className="font-medium text-slate-900">
                      {SUB_STATUS_LABEL[subscription.status] ??
                        subscription.status}
                    </span>
                  </p>
                  {subscription.trial_end &&
                    subscription.status === "trialing" && (
                      <p className="text-xs text-slate-500">
                        Testphase bis{" "}
                        {new Date(subscription.trial_end).toLocaleDateString(
                          locale
                        )}
                      </p>
                    )}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-600">
                  Noch kein aktives Abo.
                  {selectedPlan
                    ? ` Gewählter Tarif: ${PLAN_LABELS[selectedPlan] ?? selectedPlan}.`
                    : " Bitte wählen Sie einen Tarif."}
                </p>
              )}
            </div>
            <BillingActions
              locale={locale}
              hasActiveSub={Boolean(hasPaidSub)}
              checkoutablePlan={hasPaidSub ? null : checkoutablePlan}
            />
          </div>
        </div>

        {agentConfig ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#f97e70]/10 flex items-center justify-center shrink-0">
                  <span className="text-2xl">📞</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-slate-900 text-lg">
                      {agentConfig.agent_name}
                    </h2>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[agentConfig.status] ?? "bg-slate-100 text-slate-500"}`}
                    >
                      {agentConfig.status === "active" && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      )}
                      {statusLabel[agentConfig.status] ?? agentConfig.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">
                    {agentConfig.company_name}
                  </p>
                  {agentConfig.phone_number && (
                    <p className="text-sm text-slate-500 mt-0.5">
                      {agentConfig.phone_number}
                    </p>
                  )}
                </div>
              </div>
              <Link
                href={`/${locale}/onboarding?edit=true`}
                className="shrink-0 text-sm font-medium text-primary hover:underline"
              >
                Einstellungen bearbeiten →
              </Link>
            </div>

            {agentConfig.status === "pending" && (
              <div className="mt-4 flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-sm text-amber-800">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
                Ihr Assistent wird gerade eingerichtet. Das dauert in der Regel
                ca. 24 Stunden.
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[#f97e70]/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎙️</span>
            </div>
            <h2 className="font-semibold text-slate-900 text-lg mb-2">
              Ihren Assistenten noch nicht eingerichtet
            </h2>
            <p className="text-sm text-slate-600 mb-5 max-w-sm mx-auto">
              Richten Sie Ihren KI-Telefonassistenten in wenigen Schritten ein —
              dauert unter 5 Minuten.
            </p>
            <Link
              href={`/${locale}/onboarding`}
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Assistenten einrichten →
            </Link>
          </div>
        )}

        <LastCallsSection agentActive={agentConfig?.status === "active"} />
        <AudioValidationSection />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
              <span className="text-lg">🧪</span>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">
              Test-Anruf starten
            </h3>
            <p className="text-sm text-slate-500 mb-3">
              Testen Sie Ihren Assistenten mit einem simulierten Anruf.
            </p>
            <TestCallButton
              agentActive={agentConfig?.status === "active"}
              phoneNumber={agentConfig?.phone_number ?? undefined}
              locale={locale}
            />
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-3">
              <span className="text-lg">💬</span>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">
              Support kontaktieren
            </h3>
            <p className="text-sm text-slate-500 mb-3">
              Fragen zur Einrichtung? Unser Team hilft Ihnen gerne.
            </p>
            <a
              href={`mailto:support@sailly.de?subject=Support-Anfrage von ${displayName}`}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:underline"
            >
              E-Mail senden →
            </a>
          </div>
        </div>

        <div className="flex items-center gap-4 bg-white rounded-xl border border-slate-100 px-5 py-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#f97e70] to-[#fcd34d] flex items-center justify-center text-white font-bold text-sm shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">
              {displayName}
            </p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
          <span className="text-xs text-slate-400">Session aktiv</span>
        </div>
      </div>
    </div>
  );
}
