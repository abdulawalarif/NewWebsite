"use client";

import { useEffect, useState } from "react";

type EmailPreview = {
  to: string;
  subject: string;
  text: string;
};

export default function ContractEmailPreview() {
  const [email, setEmail] = useState<EmailPreview | null>(null);
  const [open, setOpen] = useState(true);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("sailly_mock_contract_email");
      if (!raw) return;
      const parsed = JSON.parse(raw) as EmailPreview;
      if (parsed?.subject) setEmail(parsed);
    } catch {
      /* ignore */
    }
  }, []);

  if (!email || !open) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-sm shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Mock Vertrags-E-Mail (Outbox)
          </p>
          <p className="font-medium text-slate-900 mt-1">{email.subject}</p>
          <p className="text-xs text-slate-500">An: {email.to}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            try {
              sessionStorage.removeItem("sailly_mock_contract_email");
            } catch {
              /* ignore */
            }
          }}
          className="text-xs text-slate-400 hover:text-slate-700"
        >
          Schließen
        </button>
      </div>
      <pre className="whitespace-pre-wrap text-xs text-slate-600 bg-slate-50 rounded-lg p-3 max-h-64 overflow-auto border border-slate-100">
        {email.text}
      </pre>
    </div>
  );
}
