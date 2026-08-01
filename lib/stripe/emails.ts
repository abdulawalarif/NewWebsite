import {
  formatPlanPrice,
  type PricingPlanKey,
} from "@/lib/pricing-plans";
import { TRIAL_DAYS } from "@/lib/stripe/config";
import type { CheckoutablePlanKey } from "@/lib/auth/plan-cookie";

export type ContractEmailPayload = {
  to: string;
  customerName: string;
  companyName: string | null;
  planKey: CheckoutablePlanKey | PricingPlanKey;
  locale: string;
  trialEndIso: string;
  avvAcceptedAt: string | null;
  listPriceLabel: string;
  trialPriceLabel: string;
  includedMinutes: string;
};

export type OutboundEmail = {
  id: string;
  type: "contract_welcome";
  to: string;
  subject: string;
  text: string;
  html: string;
  meta: Record<string, string | null>;
  created_at: string;
};

const PLAN_LABELS: Record<string, string> = {
  starters: "Starters",
  main: "Main",
  president_suite: "President Suite",
  first_class: "First Class",
};

const INCLUDED_MINUTES: Record<string, string> = {
  starters: "6.000",
  main: "15.000",
  president_suite: "25.000",
  first_class: "individuell",
};

function halfPriceLabel(planKey: PricingPlanKey, locale: string): string {
  const raw = formatPlanPrice(planKey, locale).replace(",", ".");
  const n = Number.parseFloat(raw);
  if (Number.isNaN(n)) return formatPlanPrice(planKey, locale);
  const half = n / 2;
  if (locale === "de") {
    return half.toFixed(2).replace(".", ",");
  }
  return half.toFixed(2);
}

export function buildContractEmailInput(opts: {
  to: string;
  customerName: string;
  companyName: string | null;
  planKey: PricingPlanKey;
  locale: string;
  trialEndIso: string;
  avvAcceptedAt: string | null;
}): ContractEmailPayload {
  return {
    to: opts.to,
    customerName: opts.customerName,
    companyName: opts.companyName,
    planKey: opts.planKey,
    locale: opts.locale,
    trialEndIso: opts.trialEndIso,
    avvAcceptedAt: opts.avvAcceptedAt,
    listPriceLabel: formatPlanPrice(opts.planKey, opts.locale),
    trialPriceLabel: halfPriceLabel(opts.planKey, opts.locale),
    includedMinutes: INCLUDED_MINUTES[opts.planKey] ?? "—",
  };
}

/** Builds the Sailly contract / welcome email (DE formal). No SMTP — caller logs/stores. */
export function renderContractWelcomeEmail(
  payload: ContractEmailPayload
): Omit<OutboundEmail, "id" | "created_at"> {
  const planName = PLAN_LABELS[payload.planKey] ?? payload.planKey;
  const trialEnd = new Date(payload.trialEndIso).toLocaleDateString(
    payload.locale === "de" ? "de-DE" : "en-GB",
    { day: "2-digit", month: "long", year: "numeric" }
  );
  const avvLine = payload.avvAcceptedAt
    ? `AVV akzeptiert am ${new Date(payload.avvAcceptedAt).toLocaleString(
        payload.locale === "de" ? "de-DE" : "en-GB"
      )}.`
    : "AVV-Zustimmung aus dem Onboarding liegt vor.";

  const subject = `Ihr Sailly-Abo — Bestätigung ${planName} (Testphase gestartet)`;

  const text = [
    `Guten Tag ${payload.customerName},`,
    ``,
    `vielen Dank — Ihr Sailly-Abo ist bestätigt. Die Testphase (${TRIAL_DAYS} Tage zu 50 %) hat begonnen.`,
    ``,
    `Tarif: ${planName}`,
    payload.companyName ? `Unternehmen: ${payload.companyName}` : null,
    `Listenpreis: €${payload.listPriceLabel} / Monat (netto)`,
    `In der Testphase: €${payload.trialPriceLabel} / Monat (50 %)`,
    `Inklusivminuten: ${payload.includedMinutes} Anrufminuten / Monat`,
    `Nächste volle Abrechnung ab: ${trialEnd}`,
    `Mindestlaufzeit: monatlich kündbar`,
    `Mehrverbrauch: €0,12 / Minute (v1 per manueller Rechnung)`,
    ``,
    `Mit der Zahlung akzeptieren Sie unsere AGB. ${avvLine}`,
    ``,
    `Dashboard: https://www.sailly.de/${payload.locale}/dashboard`,
    `Fragen: support@sailly.de`,
    ``,
    `Mit freundlichen Grüßen`,
    `Ihr Sailly-Team`,
  ]
    .filter((line) => line !== null)
    .join("\n");

  const html = `
    <div style="font-family:Geist,Helvetica,Arial,sans-serif;color:#0f172a;line-height:1.5;max-width:560px">
      <p>Guten Tag ${escapeHtml(payload.customerName)},</p>
      <p>vielen Dank — Ihr <strong>Sailly-Abo</strong> ist bestätigt. Die Testphase (${TRIAL_DAYS} Tage zu 50&nbsp;%) hat begonnen.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <tr><td style="padding:6px 0;color:#64748b">Tarif</td><td style="padding:6px 0;font-weight:600">${escapeHtml(planName)}</td></tr>
        ${
          payload.companyName
            ? `<tr><td style="padding:6px 0;color:#64748b">Unternehmen</td><td style="padding:6px 0">${escapeHtml(payload.companyName)}</td></tr>`
            : ""
        }
        <tr><td style="padding:6px 0;color:#64748b">Listenpreis</td><td style="padding:6px 0">€${escapeHtml(payload.listPriceLabel)} / Monat (netto)</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Testphase</td><td style="padding:6px 0">€${escapeHtml(payload.trialPriceLabel)} / Monat (50 %)</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Inklusivminuten</td><td style="padding:6px 0">${escapeHtml(payload.includedMinutes)}</td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Volle Abrechnung ab</td><td style="padding:6px 0">${escapeHtml(trialEnd)}</td></tr>
      </table>
      <p style="font-size:13px;color:#475569">Monatlich kündbar. Mehrverbrauch €0,12/Min. (v1 manuelle Rechnung). ${escapeHtml(avvLine)} AGB: sailly.de/agb</p>
      <p><a href="https://www.sailly.de/${payload.locale}/dashboard" style="display:inline-block;background:#FF9B8A;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;font-weight:600">Zum Dashboard</a></p>
      <p style="font-size:12px;color:#94a3b8">Support: support@sailly.de</p>
    </div>
  `.trim();

  return {
    type: "contract_welcome",
    to: payload.to,
    subject,
    text,
    html,
    meta: {
      plan_key: payload.planKey,
      trial_end: payload.trialEndIso,
      avv_accepted_at: payload.avvAcceptedAt,
    },
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
