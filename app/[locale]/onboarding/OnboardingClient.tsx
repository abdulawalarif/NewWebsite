"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  ChevronRight,
  ChevronLeft,
  Check,
  AlertTriangle,
  Phone,
  Building2,
  Bot,
  Shield,
  CheckCircle2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type {
  OnboardingDraft,
  EscalationContact,
  BusinessHours,
  Industry,
} from "@/types/onboarding";
import { INDUSTRIES, PROVIDERS, FORWARDING_MODES } from "@/types/onboarding";

interface Props {
  locale: string;
}

const STEPS = [
  { id: 1, label: "Unternehmen", icon: Building2 },
  { id: 2, label: "Assistent", icon: Bot },
  { id: 3, label: "Telefonie", icon: Phone },
  { id: 4, label: "Datenschutz", icon: Shield },
];

const VOICE_OPTIONS = [
  { id: "alloy", label: "Alloy – Neutral, professionell" },
  { id: "echo", label: "Echo – Klar, freundlich" },
  { id: "nova", label: "Nova – Warm, einladend" },
  { id: "shimmer", label: "Shimmer – Ruhig, vertrauensvoll" },
];

const LANGUAGE_OPTIONS = [
  { value: "de", label: "Deutsch" },
  { value: "en", label: "Englisch" },
  { value: "tr", label: "Türkisch" },
  { value: "fr", label: "Französisch" },
  { value: "ar", label: "Arabisch" },
  { value: "es", label: "Spanisch" },
];

const DAY_LABELS: Record<string, string> = {
  monday: "Montag",
  tuesday: "Dienstag",
  wednesday: "Mittwoch",
  thursday: "Donnerstag",
  friday: "Freitag",
  saturday: "Samstag",
  sunday: "Sonntag",
};

const DEFAULT_HOURS: BusinessHours = {
  monday: { open: "09:00", close: "18:00" },
  tuesday: { open: "09:00", close: "18:00" },
  wednesday: { open: "09:00", close: "18:00" },
  thursday: { open: "09:00", close: "18:00" },
  friday: { open: "09:00", close: "17:00" },
  saturday: { open: "10:00", close: "14:00", closed: true },
  sunday: { open: "10:00", close: "14:00", closed: true },
};

export default function OnboardingClient({ locale }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();
  const isEditMode = searchParams.get("edit") === "true";

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasDraft, setHasDraft] = useState(false);
  const [showResumeBanner, setShowResumeBanner] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  // Step 1
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState<Industry | "">("");
  const [businessHours, setBusinessHours] = useState<BusinessHours>(DEFAULT_HOURS);
  const [services, setServices] = useState("");
  const [languages, setLanguages] = useState<string[]>(["de"]);
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");

  // Step 2
  const [agentName, setAgentName] = useState("Sailly");
  const [voiceId, setVoiceId] = useState("nova");
  const [greetingText, setGreetingText] = useState("");
  const [escalationContacts, setEscalationContacts] = useState<EscalationContact[]>([
    { name: "", phone: "", role: "" },
  ]);

  // Step 3
  const [phoneNumber, setPhoneNumber] = useState("");
  const [provider, setProvider] = useState("");
  const [forwardingMode, setForwardingMode] = useState("no_answer");
  const [forwardingInstructions, setForwardingInstructions] = useState("");

  // Step 4
  const [avvAccepted, setAvvAccepted] = useState(false);
  const [transcriptConsent, setTranscriptConsent] = useState(false);
  const [dataRetentionDays, setDataRetentionDays] = useState(90);

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.replace(`/${locale}/login`);
        return;
      }
      setUserId(user.id);

      const { data: draft } = await supabase
        .from("onboarding_drafts")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (draft) {
        setHasDraft(true);
        if (!isEditMode) setShowResumeBanner(true);
        populateDraft(draft as OnboardingDraft);
      }

      if (!draft?.company_name) {
        const { data: profile } = await supabase
          .from("customer_profiles")
          .select("company_name, selected_plan")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.company_name) setCompanyName(profile.company_name);
        if (profile?.selected_plan) setSelectedPlan(profile.selected_plan);
      } else {
        const { data: profile } = await supabase
          .from("customer_profiles")
          .select("selected_plan")
          .eq("id", user.id)
          .maybeSingle();
        if (profile?.selected_plan) setSelectedPlan(profile.selected_plan);
      }

      setLoading(false);
    }
    load();
  }, [locale, isEditMode]); // eslint-disable-line react-hooks/exhaustive-deps

  function populateDraft(draft: OnboardingDraft) {
    if (draft.current_step) setStep(draft.current_step);
    if (draft.company_name) setCompanyName(draft.company_name);
    if (draft.industry) setIndustry(draft.industry as Industry);
    if (draft.business_hours) setBusinessHours(draft.business_hours as BusinessHours);
    if (draft.services) setServices(draft.services.join(", "));
    if (draft.languages) setLanguages(draft.languages);
    if (draft.google_maps_url) setGoogleMapsUrl(draft.google_maps_url);
    if (draft.agent_name) setAgentName(draft.agent_name);
    if (draft.voice_id) setVoiceId(draft.voice_id);
    if (draft.greeting_text) setGreetingText(draft.greeting_text);
    if (draft.escalation_contacts) setEscalationContacts(draft.escalation_contacts as EscalationContact[]);
    if (draft.phone_number) setPhoneNumber(draft.phone_number);
    if (draft.provider) setProvider(draft.provider);
    if (draft.forwarding_mode) setForwardingMode(draft.forwarding_mode);
    if (draft.forwarding_instructions) setForwardingInstructions(draft.forwarding_instructions);
    if (draft.avv_accepted !== undefined) setAvvAccepted(draft.avv_accepted);
    if (draft.transcript_consent !== undefined) setTranscriptConsent(draft.transcript_consent);
    if (draft.data_retention_days) setDataRetentionDays(draft.data_retention_days);
  }

  const saveDraft = useCallback(async (currentStep: number) => {
    if (!userId) return;
    setSaving(true);
    try {
      await supabase.from("onboarding_drafts").upsert(
        {
          user_id: userId,
          current_step: currentStep,
          company_name: companyName,
          industry: industry || null,
          business_hours: businessHours,
          services: services.split(",").map((s) => s.trim()).filter(Boolean),
          languages,
          google_maps_url: googleMapsUrl || null,
          agent_name: agentName,
          voice_id: voiceId,
          greeting_text: greetingText || null,
          escalation_contacts: escalationContacts,
          phone_number: phoneNumber || null,
          provider: provider || null,
          forwarding_mode: forwardingMode,
          forwarding_instructions: forwardingInstructions || null,
          avv_accepted: avvAccepted,
          transcript_consent: transcriptConsent,
          data_retention_days: dataRetentionDays,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" }
      );
    } finally {
      setSaving(false);
    }
  }, [userId, companyName, industry, businessHours, services, languages, googleMapsUrl, agentName, voiceId, greetingText, escalationContacts, phoneNumber, provider, forwardingMode, forwardingInstructions, avvAccepted, transcriptConsent, dataRetentionDays, supabase]);

  const validateStep = (): boolean => {
    const errs: Record<string, string> = {};
    if (step === 1) {
      if (!companyName.trim()) errs.companyName = "Unternehmensname ist erforderlich.";
      if (!industry) errs.industry = "Bitte Branche auswählen.";
    }
    if (step === 2) {
      if (!agentName.trim()) errs.agentName = "Assistenzname ist erforderlich.";
      if (!greetingText.trim()) errs.greetingText = "Begrüßungstext ist erforderlich.";
      const hasContact = escalationContacts.some((c) => c.name.trim() && c.phone.trim());
      if (!hasContact) errs.escalationContacts = "Mindestens ein Notfallkontakt mit Name und Telefon ist erforderlich.";
    }
    if (step === 4) {
      if (!avvAccepted) errs.avvAccepted = "Bitte AVV akzeptieren, um fortzufahren.";
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleNext = async () => {
    if (!validateStep()) return;
    await saveDraft(step + 1);
    if (step < 4) {
      setStep((s) => s + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleBack = () => {
    setStep((s) => s - 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmit = async () => {
    if (!validateStep() || !userId) return;
    setSaving(true);
    try {
      await saveDraft(4);
      const res = await fetch("/api/onboarding/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company_name: companyName,
          industry,
          business_hours: businessHours,
          services: services.split(",").map((s) => s.trim()).filter(Boolean),
          languages,
          google_maps_url: googleMapsUrl || null,
          agent_name: agentName,
          voice_id: voiceId,
          greeting_text: greetingText,
          escalation_contacts: escalationContacts,
          phone_number: phoneNumber || null,
          provider: provider || null,
          forwarding_mode: forwardingMode,
          forwarding_instructions: forwardingInstructions || null,
          avv_accepted: avvAccepted,
          transcript_consent: transcriptConsent,
          data_retention_days: dataRetentionDays,
        }),
      });
      if (res.ok) {
        await supabase.from("onboarding_drafts").delete().eq("user_id", userId);
        setSubmitted(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else {
        setErrors({ submit: "Fehler beim Speichern. Bitte erneut versuchen." });
      }
    } finally {
      setSaving(false);
    }
  };

  const toggleLanguage = (lang: string) => {
    setLanguages((prev) =>
      prev.includes(lang) ? prev.filter((l) => l !== lang) : [...prev, lang]
    );
  };

  const updateEscalationContact = (index: number, field: keyof EscalationContact, value: string) => {
    setEscalationContacts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleCheckout = async () => {
    setCheckoutError("");
    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale, plan: selectedPlan }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setCheckoutError(data.error ?? "Checkout fehlgeschlagen.");
        return;
      }
      window.location.href = data.url;
    } catch {
      setCheckoutError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setCheckoutLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[calc(100dvh-5rem)] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  if (submitted) {
    const checkoutable =
      selectedPlan === "starters" ||
      selectedPlan === "main" ||
      selectedPlan === "president_suite";

    return (
      <div className="min-h-[calc(100dvh-5rem)] flex flex-col items-center justify-center px-4 py-12 bg-gradient-soft">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-100 p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-50 flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Ihr Assistent ist eingerichtet!</h1>
          <p className="text-slate-600 mb-6 leading-relaxed">
            Als Nächstes schließen Sie die Zahlung ab — danach aktivieren wir Ihren KI-Telefonassistenten
            (in der Regel ca. 24 Stunden).
          </p>
          <div className="bg-slate-50 rounded-xl p-5 mb-6 text-left space-y-3">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-4">
              Nächste Schritte
            </p>
            {[
              { label: "Konfiguration gespeichert", done: true },
              { label: "Zahlung / Abo abschließen", done: false },
              { label: "Rufweiterleitung einrichten", done: false },
              { label: "Assistent aktivieren", done: false },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${item.done ? "bg-emerald-100" : "bg-slate-200"}`}>
                  {item.done && <Check className="w-3 h-3 text-emerald-600" aria-hidden />}
                </div>
                <span className={`text-sm ${item.done ? "text-slate-900 font-medium" : "text-slate-500"}`}>{item.label}</span>
              </div>
            ))}
          </div>
          {checkoutError && (
            <p role="alert" className="text-sm text-red-600 mb-3">{checkoutError}</p>
          )}
          <div className="flex flex-col gap-3">
            {checkoutable ? (
              <button
                type="button"
                onClick={handleCheckout}
                disabled={checkoutLoading}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 inline-flex items-center justify-center gap-2"
              >
                {checkoutLoading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
                Weiter zur Zahlung
              </button>
            ) : (
              <a
                href={`/${locale}/preise`}
                className="w-full bg-primary text-white py-3 rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors text-center"
              >
                Tarif wählen
              </a>
            )}
            <button
              type="button"
              onClick={() => router.push(`/${locale}/dashboard`)}
              className="w-full border border-slate-200 text-slate-700 py-3 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors"
            >
              Zum Dashboard (später bezahlen)
            </button>
            <a
              href={`mailto:support@sailly.de?subject=Einrichtungsfragen – ${companyName}`}
              className="w-full border border-slate-200 text-slate-700 py-3 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors text-center"
            >
              Support kontaktieren
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100dvh-5rem)] flex flex-col items-center px-4 py-10 bg-gradient-soft">
      <div className="w-full max-w-xl">

        {showResumeBanner && hasDraft && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <div className="w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center shrink-0 mt-0.5">
              <span className="text-white text-xs font-bold">i</span>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-blue-900">Entwurf gefunden</p>
              <p className="text-xs text-blue-700 mt-0.5">Wir haben einen gespeicherten Entwurf gefunden. Sie können dort weitermachen, wo Sie aufgehört haben.</p>
            </div>
            <button onClick={() => setShowResumeBanner(false)} className="text-blue-400 hover:text-blue-600 text-xs shrink-0">✕</button>
          </div>
        )}

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h1 className="text-xl font-bold text-slate-900">
              {isEditMode ? "Einstellungen bearbeiten" : "Assistenten einrichten"}
            </h1>
            <span className="text-sm text-slate-500">Schritt {step} von 4</span>
          </div>
          <div className="flex gap-1.5">
            {STEPS.map((s) => (
              <div key={s.id} className={`flex-1 h-1.5 rounded-full transition-colors ${s.id < step ? "bg-emerald-500" : s.id === step ? "bg-primary" : "bg-slate-200"}`} />
            ))}
          </div>
          <div className="flex mt-2">
            {STEPS.map((s) => {
              const Icon = s.icon;
              return (
                <div key={s.id} className="flex-1 flex flex-col items-center">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center mb-0.5 ${s.id < step ? "bg-emerald-100" : s.id === step ? "bg-primary/10" : "bg-slate-100"}`}>
                    {s.id < step ? <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden /> : <Icon className={`w-3.5 h-3.5 ${s.id === step ? "text-primary" : "text-slate-400"}`} aria-hidden />}
                  </div>
                  <span className={`text-[10px] font-medium ${s.id === step ? "text-primary" : "text-slate-400"}`}>{s.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 md:p-8">

          {/* STEP 1 */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Ihr Unternehmen</h2>
                <p className="text-sm text-slate-600 mt-1">Damit Ihr Assistent die richtigen Antworten gibt, benötigen wir grundlegende Informationen.</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="maps-url" className="text-sm font-medium text-slate-900">Google Maps URL <span className="text-slate-400 font-normal">(optional)</span></label>
                <input id="maps-url" type="url" value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="https://maps.google.com/?q=..." />
                <p className="text-xs text-slate-500">Fügen Sie Ihren Google Maps-Link ein und wir übernehmen automatisch Name und Adresse.</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="company-name" className="text-sm font-medium text-slate-900">Unternehmensname</label>
                <input id="company-name" type="text" value={companyName} onChange={(e) => { setCompanyName(e.target.value); setErrors((p) => ({ ...p, companyName: "" })); }} className={`w-full px-4 py-3 rounded-lg border text-sm outline-none transition-all ${errors.companyName ? "border-red-400" : "border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"}`} placeholder="Hotel Alpina GmbH" aria-invalid={!!errors.companyName} />
                {errors.companyName && <p role="alert" className="text-xs text-red-600">{errors.companyName}</p>}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="industry" className="text-sm font-medium text-slate-900">Branche</label>
                <select id="industry" value={industry} onChange={(e) => { setIndustry(e.target.value as Industry); setErrors((p) => ({ ...p, industry: "" })); }} className={`w-full px-4 py-3 rounded-lg border text-sm outline-none bg-white transition-all ${errors.industry ? "border-red-400" : "border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"}`} aria-invalid={!!errors.industry}>
                  <option value="">Bitte wählen…</option>
                  {INDUSTRIES.map((ind) => <option key={ind.value} value={ind.value}>{ind.label}</option>)}
                </select>
                {errors.industry && <p role="alert" className="text-xs text-red-600">{errors.industry}</p>}
                {industry === "medical" && (
                  <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg mt-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" aria-hidden />
                    <p className="text-xs text-amber-800"><strong>Hinweis für medizinische Praxen:</strong> Sailly kann allgemeine Anfragen bearbeiten und Termine koordinieren. Für medizinische Notfälle wird der Anrufer immer an den Notruf weitergeleitet.</p>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="services" className="text-sm font-medium text-slate-900">Dienstleistungen <span className="text-slate-400 font-normal">(optional)</span></label>
                <input id="services" type="text" value={services} onChange={(e) => setServices(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="Zimmer buchen, Restaurant, Spa…" />
                <p className="text-xs text-slate-500">Kommagetrennte Liste Ihrer wichtigsten Angebote.</p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-900">Sprachen des Assistenten</p>
                <div className="flex flex-wrap gap-2">
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <button key={lang.value} type="button" onClick={() => toggleLanguage(lang.value)} className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${languages.includes(lang.value) ? "bg-primary text-white border-primary" : "border-slate-200 text-slate-600 hover:border-primary/50"}`}>{lang.label}</button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-900">Öffnungszeiten</p>
                <div className="space-y-2">
                  {Object.entries(DAY_LABELS).map(([day, label]) => {
                    const hours = businessHours[day as keyof BusinessHours] || { open: "09:00", close: "18:00" };
                    const isClosed = hours.closed === true;
                    return (
                      <div key={day} className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-slate-600 w-20 shrink-0">{label}</span>
                        <label className="flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer">
                          <input type="checkbox" checked={!isClosed} onChange={(e) => setBusinessHours((prev) => ({ ...prev, [day]: { ...hours, closed: !e.target.checked } }))} className="w-3.5 h-3.5 accent-primary" />
                          Geöffnet
                        </label>
                        {!isClosed && (
                          <>
                            <input type="time" value={hours.open} onChange={(e) => setBusinessHours((prev) => ({ ...prev, [day]: { ...hours, open: e.target.value } }))} className="px-2 py-1 rounded border border-slate-200 text-xs outline-none focus:border-primary" />
                            <span className="text-xs text-slate-400">–</span>
                            <input type="time" value={hours.close} onChange={(e) => setBusinessHours((prev) => ({ ...prev, [day]: { ...hours, close: e.target.value } }))} className="px-2 py-1 rounded border border-slate-200 text-xs outline-none focus:border-primary" />
                          </>
                        )}
                        {isClosed && <span className="text-xs text-slate-400 italic">Geschlossen</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Ihr Assistent</h2>
                <p className="text-sm text-slate-600 mt-1">Passen Sie Name, Stimme und Begrüßung Ihres KI-Assistenten an.</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="agent-name" className="text-sm font-medium text-slate-900">Name des Assistenten</label>
                <input id="agent-name" type="text" value={agentName} onChange={(e) => { setAgentName(e.target.value); setErrors((p) => ({ ...p, agentName: "" })); }} className={`w-full px-4 py-3 rounded-lg border text-sm outline-none transition-all ${errors.agentName ? "border-red-400" : "border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"}`} placeholder="Sailly" aria-invalid={!!errors.agentName} />
                {errors.agentName && <p role="alert" className="text-xs text-red-600">{errors.agentName}</p>}
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-900">Stimme</p>
                <div className="space-y-2">
                  {VOICE_OPTIONS.map((voice) => (
                    <label key={voice.id} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${voiceId === voice.id ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"}`}>
                      <input type="radio" name="voice" value={voice.id} checked={voiceId === voice.id} onChange={() => setVoiceId(voice.id)} className="accent-primary" />
                      <span className="text-sm text-slate-700">{voice.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="greeting" className="text-sm font-medium text-slate-900">Begrüßungstext</label>
                <textarea id="greeting" value={greetingText} onChange={(e) => { setGreetingText(e.target.value); setErrors((p) => ({ ...p, greetingText: "" })); }} className={`w-full px-4 py-3 rounded-lg border text-sm outline-none transition-all resize-none ${errors.greetingText ? "border-red-400" : "border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"}`} rows={3} placeholder={`Guten Tag, Sie sind verbunden mit ${companyName || "unserem Unternehmen"}. Mein Name ist ${agentName}. Wie kann ich Ihnen helfen?`} aria-invalid={!!errors.greetingText} />
                {errors.greetingText && <p role="alert" className="text-xs text-red-600">{errors.greetingText}</p>}
                <p className="text-xs text-slate-500">Dieser Text wird auch als Betreff für E-Mail-Anrufzusammenfassungen verwendet.</p>
              </div>

              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium text-slate-900">Notfallkontakte</p>
                  <p className="text-xs text-slate-500 mt-0.5">An wen soll bei dringenden Anliegen weitergeleitet werden?</p>
                </div>
                {errors.escalationContacts && <p role="alert" className="text-xs text-red-600">{errors.escalationContacts}</p>}
                <div className="space-y-3">
                  {escalationContacts.map((contact, i) => (
                    <div key={i} className="p-3 bg-slate-50 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-slate-600">Kontakt {i + 1}</span>
                        {escalationContacts.length > 1 && <button type="button" onClick={() => setEscalationContacts((prev) => prev.filter((_, idx) => idx !== i))} className="text-xs text-red-400 hover:text-red-600">Entfernen</button>}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <input type="text" value={contact.name} onChange={(e) => updateEscalationContact(i, "name", e.target.value)} className="px-3 py-2 rounded border border-slate-200 text-sm outline-none focus:border-primary" placeholder="Name" />
                        <input type="tel" value={contact.phone} onChange={(e) => updateEscalationContact(i, "phone", e.target.value)} className="px-3 py-2 rounded border border-slate-200 text-sm outline-none focus:border-primary" placeholder="+49 30 1234567" />
                      </div>
                      <input type="text" value={contact.role || ""} onChange={(e) => updateEscalationContact(i, "role", e.target.value)} className="w-full px-3 py-2 rounded border border-slate-200 text-sm outline-none focus:border-primary" placeholder="Rolle (z.B. Rezeption)" />
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setEscalationContacts((prev) => [...prev, { name: "", phone: "", role: "" }])} className="text-sm text-primary hover:underline">+ Weiteren Kontakt hinzufügen</button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Telefonweiterleitung</h2>
                <p className="text-sm text-slate-600 mt-1">Damit Ihr Assistent Anrufe entgegennehmen kann, richten Sie die Rufweiterleitung ein.</p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="phone" className="text-sm font-medium text-slate-900">Ihre Rufnummer <span className="text-slate-400 font-normal">(optional)</span></label>
                <input id="phone" type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" placeholder="+49 30 1234567" />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="provider" className="text-sm font-medium text-slate-900">Telefonanbieter <span className="text-slate-400 font-normal">(optional)</span></label>
                <select id="provider" value={provider} onChange={(e) => setProvider(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm outline-none bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary">
                  <option value="">Bitte wählen…</option>
                  {PROVIDERS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-900">Weiterleitungsart</p>
                <div className="space-y-2">
                  {FORWARDING_MODES.map((mode) => (
                    <label key={mode.value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${forwardingMode === mode.value ? "border-primary bg-primary/5" : "border-slate-200 hover:border-slate-300"}`}>
                      <input type="radio" name="forwarding" value={mode.value} checked={forwardingMode === mode.value} onChange={() => setForwardingMode(mode.value)} className="accent-primary" />
                      <span className="text-sm text-slate-700">{mode.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              {provider && (
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <p className="text-xs font-semibold text-blue-900 mb-2">Einrichtung bei {PROVIDERS.find((p) => p.value === provider)?.label}</p>
                  {provider === "telekom" && <p className="text-xs text-blue-800">Wählen Sie <strong>**21*[Sailly-Nummer]#</strong> (immer) oder <strong>**61*[Sailly-Nummer]**30#</strong> (bei Nichtannahme) von Ihrem Telefon.</p>}
                  {provider === "vodafone" && <p className="text-xs text-blue-800">Mein Vodafone App → Telefonie → Rufumleitung, oder wählen Sie <strong>**61*[Sailly-Nummer]**30#</strong>.</p>}
                  {(provider === "o2" || provider === "1und1") && <p className="text-xs text-blue-800">Wählen Sie <strong>**21*[Sailly-Nummer]#</strong> für sofortige Weiterleitung. Details per E-Mail nach Aktivierung.</p>}
                  {provider === "sipgate" && <p className="text-xs text-blue-800">Sipgate Dashboard → Ihr Gerät → Rufumleitung → Nummer eingeben.</p>}
                  {provider === "other" && <p className="text-xs text-blue-800">Probieren Sie <strong>**21*[Sailly-Nummer]#</strong> (funktioniert bei den meisten Anbietern).</p>}
                </div>
              )}

              <div className="space-y-1.5">
                <label htmlFor="fwd-instructions" className="text-sm font-medium text-slate-900">Zusätzliche Hinweise <span className="text-slate-400 font-normal">(optional)</span></label>
                <textarea id="fwd-instructions" value={forwardingInstructions} onChange={(e) => setForwardingInstructions(e.target.value)} className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none" rows={2} placeholder="z.B. Weiterleitung nur Montag–Freitag aktiv" />
              </div>
            </div>
          )}

          {/* STEP 4 */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Datenschutz & Einwilligung</h2>
                <p className="text-sm text-slate-600 mt-1">Bitte lesen und akzeptieren Sie die folgenden Vereinbarungen.</p>
              </div>

              <div className={`p-4 rounded-xl border-2 transition-colors ${avvAccepted ? "border-emerald-300 bg-emerald-50" : "border-slate-200"}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={avvAccepted} onChange={(e) => { setAvvAccepted(e.target.checked); setErrors((p) => ({ ...p, avvAccepted: "" })); }} className="w-4 h-4 mt-0.5 rounded accent-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Auftragsverarbeitungsvertrag (AVV) akzeptieren</p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Gemäß Art. 28 DSGVO erforderlich für die Verarbeitung personenbezogener Gesprächsdaten.{" "}
                      <a href="https://sailly.de/de/datenschutz#avv" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">AVV lesen →</a>
                    </p>
                  </div>
                </label>
                {errors.avvAccepted && <p role="alert" className="text-xs text-red-600 mt-2 pl-7">{errors.avvAccepted}</p>}
              </div>

              <div className={`p-4 rounded-xl border-2 transition-colors ${transcriptConsent ? "border-blue-300 bg-blue-50" : "border-slate-200"}`}>
                <label className="flex items-start gap-3 cursor-pointer">
                  <input type="checkbox" checked={transcriptConsent} onChange={(e) => setTranscriptConsent(e.target.checked)} className="w-4 h-4 mt-0.5 rounded accent-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Gesprächstranskripte speichern <span className="text-slate-400 font-normal">(optional)</span></p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">Ich bin einverstanden, dass Sailly Transkripte für {dataRetentionDays} Tage speichert.</p>
                  </div>
                </label>
              </div>

              {transcriptConsent && (
                <div className="space-y-1.5">
                  <label htmlFor="retention" className="text-sm font-medium text-slate-900">Aufbewahrungsdauer</label>
                  <select id="retention" value={dataRetentionDays} onChange={(e) => setDataRetentionDays(Number(e.target.value))} className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm outline-none bg-white focus:ring-2 focus:ring-primary/20 focus:border-primary">
                    <option value={30}>30 Tage</option>
                    <option value={60}>60 Tage</option>
                    <option value={90}>90 Tage (empfohlen)</option>
                    <option value={180}>180 Tage</option>
                  </select>
                </div>
              )}

              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Zusammenfassung</p>
                <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                  <span className="text-slate-500">Unternehmen</span><span className="font-medium text-slate-800">{companyName || "–"}</span>
                  <span className="text-slate-500">Assistent</span><span className="font-medium text-slate-800">{agentName}</span>
                  <span className="text-slate-500">Telefon</span><span className="font-medium text-slate-800">{phoneNumber || "Noch nicht angegeben"}</span>
                  <span className="text-slate-500">Sprachen</span><span className="font-medium text-slate-800">{languages.join(", ")}</span>
                </div>
              </div>

              {errors.submit && <p role="alert" className="text-sm text-red-600">{errors.submit}</p>}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100">
            <button type="button" onClick={handleBack} disabled={step === 1} className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-slate-600 hover:text-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
              <ChevronLeft className="w-4 h-4" aria-hidden />Zurück
            </button>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              {saving && <><Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden /><span>Wird gespeichert…</span></>}
            </div>

            {step < 4 ? (
              <button type="button" onClick={handleNext} disabled={saving} className="flex items-center gap-1.5 bg-primary text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60">
                Weiter<ChevronRight className="w-4 h-4" aria-hidden />
              </button>
            ) : (
              <button type="button" onClick={handleSubmit} disabled={saving} className="flex items-center gap-1.5 bg-emerald-600 text-white px-5 py-2.5 rounded-lg text-sm font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-60">
                {saving ? <><Loader2 className="w-4 h-4 animate-spin" aria-hidden />Wird gesendet…</> : <>Assistenten aktivieren<Check className="w-4 h-4" aria-hidden /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
