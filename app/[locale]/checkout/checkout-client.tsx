"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, CreditCard } from "lucide-react";
import {
  formatPlanPrice,
  isPricingPlanKey,
  type PricingPlanKey,
} from "@/lib/pricing-plans";

const PLAN_LABELS: Record<string, string> = {
  starters: "Starters",
  main: "Main",
  president_suite: "President Suite",
};

const INCLUDED: Record<string, string> = {
  starters: "6.000 Min.",
  main: "15.000 Min.",
  president_suite: "25.000 Min.",
};

function halfPrice(plan: PricingPlanKey, locale: string): string {
  const raw = formatPlanPrice(plan, locale).replace(",", ".");
  const n = Number.parseFloat(raw);
  if (Number.isNaN(n)) return formatPlanPrice(plan, locale);
  const half = n / 2;
  return locale === "de"
    ? half.toFixed(2).replace(".", ",")
    : half.toFixed(2);
}

export default function MockCheckoutClient({ locale }: { locale: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planParam = searchParams.get("plan") ?? "main";
  const plan = isPricingPlanKey(planParam) ? planParam : "main";

  const [name, setName] = useState("Test Kunde");
  const [card, setCard] = useState("4242 4242 4242 4242");
  const [exp, setExp] = useState("12/34");
  const [cvc, setCvc] = useState("123");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const trialPrice = useMemo(() => halfPrice(plan, locale), [plan, locale]);
  const listPrice = formatPlanPrice(plan, locale);

  const pay = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/stripe/mock-pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locale,
          plan,
          cardNumber: card,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Zahlung fehlgeschlagen.");
        return;
      }
      if (data.email?.subject) {
        try {
          sessionStorage.setItem(
            "sailly_mock_contract_email",
            JSON.stringify(data.email)
          );
        } catch {
          /* ignore */
        }
      }
      window.location.href = data.url;
    } catch {
      setError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setLoading(false);
    }
  };

  if (plan === "first_class") {
    return (
      <div className="min-h-[calc(100dvh-5rem)] flex items-center justify-center px-4 bg-gradient-soft">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-8 text-center">
          <p className="text-slate-600 mb-4">
            First Class ist nur auf Anfrage verfügbar.
          </p>
          <Link
            href={`/${locale}/contact`}
            className="text-primary font-semibold hover:underline"
          >
            Kontakt aufnehmen →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-5rem)] flex flex-col items-center justify-center px-4 py-12 bg-gradient-soft">
      <div className="w-full max-w-lg">
        <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
          <p className="font-semibold">Mock-Stripe Checkout</p>
          <p>
            Keine echte Belastung. Karte auf <code>0002</code> endend = Ablehnung.
            Erfolg sendet die Vertrags-/Willkommens-Mail in die Mock-Outbox.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/80">
            <div className="flex items-center gap-2 text-slate-900 font-semibold">
              <Lock className="w-4 h-4 text-emerald-600" aria-hidden />
              Sichere Zahlung (Mock)
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {PLAN_LABELS[plan] ?? plan} · Testphase 30 Tage zu 50 %
            </p>
          </div>

          <div className="px-6 py-5 space-y-4">
            <div className="rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Tarif</span>
                <span className="font-medium">{PLAN_LABELS[plan]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Inklusivminuten</span>
                <span className="font-medium">{INCLUDED[plan]}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Listenpreis</span>
                <span>€{listPrice}/Mo.</span>
              </div>
              <div className="flex justify-between text-base pt-2 border-t border-slate-200 mt-2">
                <span className="font-semibold text-slate-900">Heute (50 %)</span>
                <span className="font-bold text-slate-900">€{trialPrice}</span>
              </div>
            </div>

            <label className="block text-sm">
              <span className="font-medium text-slate-900">Name auf der Karte</span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="cc-name"
              />
            </label>

            <label className="block text-sm">
              <span className="font-medium text-slate-900 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5" aria-hidden />
                Kartennummer
              </span>
              <input
                className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                value={card}
                onChange={(e) => setCard(e.target.value)}
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="4242 4242 4242 4242"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block text-sm">
                <span className="font-medium text-slate-900">Gültig bis</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                  value={exp}
                  onChange={(e) => setExp(e.target.value)}
                  autoComplete="cc-exp"
                  placeholder="MM/YY"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-900">CVC</span>
                <input
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                  value={cvc}
                  onChange={(e) => setCvc(e.target.value)}
                  autoComplete="cc-csc"
                  placeholder="123"
                />
              </label>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}

            <button
              type="button"
              onClick={pay}
              disabled={loading}
              className="w-full bg-primary text-white py-3 rounded-lg font-semibold text-sm hover:bg-primary/90 disabled:opacity-60 inline-flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
              Jetzt €{trialPrice} zahlen (Mock)
            </button>

            <button
              type="button"
              onClick={() => router.push(`/${locale}/preise/${plan}`)}
              className="w-full text-sm text-slate-500 hover:text-slate-800"
            >
              Abbrechen
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
