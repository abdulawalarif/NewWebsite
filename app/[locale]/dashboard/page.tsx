import { redirect } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import type { AgentConfig } from "@/types/onboarding";
import DashboardLogoutButton from "./logout-button";
import AudioValidationSection from "./audio-validation-section";
import LastCallsSection from "./last-calls-section";
import TestCallButton from "./test-call-button";

export const metadata: Metadata = {
  title: "Dashboard – Sailly",
  robots: { index: false },
};

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  // Load customer profile
  const { data: profile } = await supabase
    .from("customer_profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  // Load agent config
  const { data: agentConfig } = await supabase
    .from("agent_configs")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle() as { data: AgentConfig | null };

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

  return (
    <div className="min-h-[calc(100dvh-5rem)] bg-gradient-soft px-4 py-10">
      <div className="max-w-4xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Willkommen, {displayName}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">Ihr persönliches Sailly-Dashboard</p>
          </div>
          <DashboardLogoutButton locale={locale} />
        </div>

        {/* Agent status card */}
        {agentConfig ? (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#f97e70]/10 flex items-center justify-center shrink-0">
                  <span className="text-2xl">📞</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold text-slate-900 text-lg">{agentConfig.agent_name}</h2>
                    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${statusColor[agentConfig.status] ?? "bg-slate-100 text-slate-500"}`}>
                      {agentConfig.status === "active" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
                      {statusLabel[agentConfig.status] ?? agentConfig.status}
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{agentConfig.company_name}</p>
                  {agentConfig.phone_number && (
                    <p className="text-sm text-slate-500 mt-0.5">{agentConfig.phone_number}</p>
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
                Ihr Assistent wird gerade eingerichtet. Das dauert in der Regel ca. 24 Stunden.
              </div>
            )}
          </div>
        ) : (
          /* No agent config yet — prompt to start onboarding */
          <div className="bg-white rounded-2xl border border-dashed border-slate-200 p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-[#f97e70]/10 flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎙️</span>
            </div>
            <h2 className="font-semibold text-slate-900 text-lg mb-2">
              Ihren Assistenten noch nicht eingerichtet
            </h2>
            <p className="text-sm text-slate-600 mb-5 max-w-sm mx-auto">
              Richten Sie Ihren KI-Telefonassistenten in wenigen Schritten ein — dauert unter 5 Minuten.
            </p>
            <Link
              href={`/${locale}/onboarding`}
              className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              Assistenten einrichten →
            </Link>
          </div>
        )}

        {/* Last calls card */}
        <LastCallsSection agentActive={agentConfig?.status === "active"} />
        {/* Audio Validation Tests */}
        <AudioValidationSection />


        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center mb-3">
              <span className="text-lg">🧪</span>
            </div>
            <h3 className="font-semibold text-slate-900 mb-1">Test-Anruf starten</h3>
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
            <h3 className="font-semibold text-slate-900 mb-1">Support kontaktieren</h3>
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

        {/* User info footer */}
        <div className="flex items-center gap-4 bg-white rounded-xl border border-slate-100 px-5 py-3">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#f97e70] to-[#fcd34d] flex items-center justify-center text-white font-bold text-sm shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{displayName}</p>
            <p className="text-xs text-slate-500 truncate">{user.email}</p>
          </div>
          <span className="text-xs text-slate-400">Session aktiv</span>
        </div>

      </div>
    </div>
  );
}
