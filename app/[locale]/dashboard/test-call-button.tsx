"use client";

import { useState } from "react";

export default function TestCallButton({
  agentActive,
  phoneNumber,
  locale,
}: {
  agentActive: boolean;
  phoneNumber?: string;
  locale: string;
}) {
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  const handleTestCall = async () => {
    if (!agentActive) return;
    setStatus("loading");
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_VOICE_AGENT_ORIGIN || "http://127.0.0.1:8080"}/api/demo/initiate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone_number: phoneNumber || "" }),
        }
      );
      if (response.ok) {
        setStatus("done");
        setTimeout(() => setStatus("idle"), 3000);
      } else {
        setStatus("error");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const buttonText = {
    idle: "Test starten",
    loading: "Startet...",
    done: "Gestartet!",
    error: "Fehler — erneut versuchen",
  };

  if (!agentActive) {
    return (
      <span className="text-sm text-slate-400">
        Verf\u00fcgbar nach Aktivierung
      </span>
    );
  }

  return (
    <button
      onClick={handleTestCall}
      disabled={status !== "idle"}
      className={`inline-flex items-center gap-1.5 text-sm font-medium cursor-pointer transition-colors ${
        status === "loading"
          ? "text-slate-400"
          : status === "done"
          ? "text-emerald-600"
          : status === "error"
          ? "text-red-600"
          : "text-emerald-600 hover:underline"
      }`}
    >
      {buttonText[status]} {String.fromCodePoint(0x2192)}
    </button>
  );
}
