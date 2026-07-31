"use client";

import { useEffect, useState } from "react";

interface CallRecord {
  call_sid: string;
  started_at: string;
  duration_formatted: string;
  outcome: string;
  quality_score: number;
  cost_euro: number;
}

export default function LastCallsSection({
  agentActive,
}: {
  agentActive: boolean;
}) {
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!agentActive) {
      setLoading(false);
      return;
    }

    const fetchCalls = async () => {
      try {
        const response = await fetch("/api/customer/calls?limit=5");
        if (response.ok) {
          const data = await response.json();
          setCalls(data.calls || []);
        }
      } catch (error) {
        console.error("Failed to fetch calls:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCalls();
  }, [agentActive]);

  if (!agentActive) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Letzte Anrufe</h3>
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <span className="text-xl">{String.fromCodePoint(0x1F4CB)}</span>
          </div>
          <p className="text-sm text-slate-500">
            Anrufdaten werden hier erscheinen, sobald Ihr Assistent aktiv ist.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h3 className="font-semibold text-slate-900 mb-4">Letzte Anrufe</h3>
        <div className="flex items-center justify-center py-8 text-center">
          <p className="text-sm text-slate-500">Wird geladen...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-slate-900">
          Letzte Anrufe
        </h3>
        {calls.length > 0 && (
          <span className="text-xs text-slate-400">
            {calls.length} Anruf{calls.length !== 1 ? "e" : ""}
          </span>
        )}
      </div>

      {calls.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <span className="text-xl">{String.fromCodePoint(0x1F4CB)}</span>
          </div>
          <p className="text-sm text-slate-500">
            Erste Daten erscheinen nach Ihrem ersten Anruf.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {calls.map((call) => (
            <div
              key={call.call_sid}
              className="flex items-center justify-between py-2.5 px-3 bg-slate-50 rounded-lg"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-2 h-2 rounded-full ${
                    call.outcome === "completed"
                      ? "bg-emerald-500"
                      : call.outcome === "escalated"
                      ? "bg-amber-500"
                      : "bg-slate-400"
                  }`}
                />
                <div>
                  <p className="text-sm font-medium text-slate-900">
                    {new Date(call.started_at).toLocaleDateString("de-DE", {
                      day: "2-digit",
                      month: "short",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="text-xs text-slate-500">
                    {call.duration_formatted}
                    {call.cost_euro > 0 && ` \u00b7 ${String.fromCodePoint(0x20AC)}${call.cost_euro.toFixed(2)}`}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span
                  className={`text-xs font-medium px-2 py-0.5 rounded ${
                    call.quality_score >= 8
                      ? "bg-emerald-50 text-emerald-700"
                      : call.quality_score >= 6
                      ? "bg-amber-50 text-amber-700"
                      : "bg-red-50 text-red-700"
                  }`}
                >
                  {call.quality_score.toFixed(1)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
