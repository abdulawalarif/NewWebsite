"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function BillingActions({
  locale,
  hasActiveSub,
  checkoutablePlan,
}: {
  locale: string;
  hasActiveSub: boolean;
  checkoutablePlan: string | null;
}) {
  const [loading, setLoading] = useState<"portal" | "checkout" | null>(null);
  const [error, setError] = useState("");

  const openPortal = async () => {
    setError("");
    setLoading("portal");
    try {
      const res = await fetch("/api/stripe/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Portal nicht verfügbar.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setLoading(null);
    }
  };

  const startCheckout = async () => {
    setError("");
    setLoading("checkout");
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, plan: checkoutablePlan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Checkout fehlgeschlagen.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-2">
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
      {hasActiveSub ? (
        <button
          type="button"
          onClick={openPortal}
          disabled={loading !== null}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline disabled:opacity-60"
        >
          {loading === "portal" && (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          )}
          Rechnung & Zahlung →
        </button>
      ) : checkoutablePlan ? (
        <button
          type="button"
          onClick={startCheckout}
          disabled={loading !== null}
          className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary/90 disabled:opacity-60"
        >
          {loading === "checkout" && (
            <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden />
          )}
          Zahlung abschließen →
        </button>
      ) : (
        <a
          href={`/${locale}/preise`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          Tarif wählen →
        </a>
      )}
    </div>
  );
}
