"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, Eye, EyeOff, CheckCircle2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { sanitizeNextPath, defaultPostAuthPath } from "@/lib/auth/safe-redirect";
import { parsePlanKey, setPlanCookieClient } from "@/lib/auth/plan-cookie";
import type { PricingPlanKey } from "@/lib/pricing-plans";

type Tab = "login" | "register";
type FieldErrors = Record<string, string>;

interface LoginClientProps {
  locale: string;
}

const isMockAuth =
  typeof process !== "undefined" &&
  process.env.NEXT_PUBLIC_AUTH_MODE === "mock";

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function passwordStrength(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

function strengthMeta(score: number): { label: string; color: string } {
  if (score <= 1) return { label: "Sehr schwach", color: "bg-red-400" };
  if (score === 2) return { label: "Schwach", color: "bg-orange-400" };
  if (score === 3) return { label: "Mittel", color: "bg-yellow-400" };
  if (score === 4) return { label: "Stark", color: "bg-green-400" };
  return { label: "Sehr stark", color: "bg-emerald-500" };
}

export default function LoginClient({ locale }: LoginClientProps) {
  const searchParams = useSearchParams();
  const supabase = createClient();

  const [tab, setTab] = useState<Tab>(
    searchParams.get("tab") === "register" ? "register" : "login"
  );

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoginPending, setIsLoginPending] = useState(false);
  const [showLoginPw, setShowLoginPw] = useState(false);

  // Magic link state
  const [showMagicLinkInput, setShowMagicLinkInput] = useState(false);
  const [magicEmail, setMagicEmail] = useState("");
  const [magicLinkLoading, setMagicLinkLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [mockVerifyUrl, setMockVerifyUrl] = useState<string | null>(null);

  // Register form state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [showRegPwConfirm, setShowRegPwConfirm] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [selectedPlan, setSelectedPlan] = useState<PricingPlanKey | null>(
    () => parsePlanKey(searchParams.get("plan"))
  );

  // Persist ?plan= so OAuth / magic-link round-trips keep the choice
  useEffect(() => {
    const plan = parsePlanKey(searchParams.get("plan"));
    if (plan) {
      setSelectedPlan(plan);
      setPlanCookieClient(plan);
    }
  }, [searchParams]);

  useEffect(() => {
    setErrors({});
    setRegisterError("");
    setLoginError("");
    setMagicLinkSent(false);
  }, [tab]);

  const clearFieldError = (field: string) =>
    setErrors((prev) => ({ ...prev, [field]: "" }));

  // ── Login ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!loginEmail.trim()) {
      setLoginError("Bitte E-Mail-Adresse eingeben.");
      return;
    }
    if (!loginPassword) {
      setLoginError("Bitte Passwort eingeben.");
      return;
    }
    setIsLoginPending(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.trim(),
        password: loginPassword,
      });

      if (error) {
        if (error.message.includes("Invalid login credentials")) {
          setLoginError("E-Mail oder Passwort ist falsch.");
        } else if (error.message.includes("Email not confirmed")) {
          setLoginError("Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.");
        } else if (error.message.includes("Too many requests")) {
          setLoginError("Zu viele Anmeldeversuche. Bitte warten Sie einen Moment.");
        } else {
          setLoginError(error.message);
        }
        return;
      }

      if (data.user) {
        // Update last_login_at in customer_profiles
        await fetch("/api/auth/update-login", { method: "POST" });

        // Check if user has completed onboarding
        const { data: config } = await supabase
          .from("agent_configs")
          .select("id")
          .eq("user_id", data.user.id)
          .maybeSingle();

        const safeNext = sanitizeNextPath(searchParams.get("next"), locale);
        const destination =
          safeNext ?? defaultPostAuthPath(locale, Boolean(config));
        window.location.replace(destination);
      }
    } catch {
      setLoginError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setIsLoginPending(false);
    }
  };

  // ── Google OAuth ──
  // Callback (+ middleware) decide onboarding vs dashboard from agent_configs.
  // next is only a hint; incomplete users never stay on dashboard.
  const handleGoogleLogin = async () => {
    setLoginError("");
    setRegisterError("");
    if (selectedPlan) setPlanCookieClient(selectedPlan);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/${locale}/dashboard`,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    if (error) {
      const msg = "Google-Anmeldung fehlgeschlagen. Bitte erneut versuchen.";
      tab === "login" ? setLoginError(msg) : setRegisterError(msg);
    }
  };

  // ── Magic Link ──
  const handleMagicLink = async () => {
    const email = magicEmail.trim();
    if (!email) {
      setErrors({ magicLink: "Bitte E-Mail-Adresse eingeben." });
      return;
    }
    if (!isEmail(email)) {
      setErrors({ magicLink: "Bitte eine gültige E-Mail-Adresse eingeben." });
      return;
    }
    setMagicLinkLoading(true);
    setMockVerifyUrl(null);
    if (selectedPlan) setPlanCookieClient(selectedPlan);
    try {
      const result = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/${locale}/dashboard`,
        },
      });
      if (result.error) {
        setErrors({ magicLink: "Fehler beim Senden. Bitte erneut versuchen." });
      } else {
        setMagicLinkSent(true);
        // Mock mode returns a clickable verify URL instead of sending email
        const mockUrl = (result as { mockVerifyUrl?: string }).mockVerifyUrl;
        if (mockUrl) setMockVerifyUrl(mockUrl);
      }
    } finally {
      setMagicLinkLoading(false);
    }
  };

  // ── Register ──
  const validateRegister = (): boolean => {
    const errs: FieldErrors = {};
    if (!firstName) errs.firstName = "Dieses Feld ist erforderlich.";
    if (!lastName) errs.lastName = "Dieses Feld ist erforderlich.";
    if (!regEmail) errs.regEmail = "Dieses Feld ist erforderlich.";
    else if (!isEmail(regEmail)) errs.regEmail = "Bitte eine gültige E-Mail-Adresse eingeben.";
    if (!regPassword) errs.regPassword = "Dieses Feld ist erforderlich.";
    else if (regPassword.length < 8) errs.regPassword = "Mindestens 8 Zeichen erforderlich.";
    if (!regPasswordConfirm) errs.regPasswordConfirm = "Dieses Feld ist erforderlich.";
    else if (regPassword !== regPasswordConfirm)
      errs.regPasswordConfirm = "Passwörter stimmen nicht überein.";
    if (!acceptTerms) errs.acceptTerms = "Bitte AGB und Datenschutzerklärung akzeptieren.";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegisterError("");
    if (!validateRegister()) return;
    setRegisterLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: regEmail,
        password: regPassword,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            display_name: `${firstName} ${lastName}`.trim(),
          },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=/${locale}/onboarding`,
        },
      });

      if (error) {
        if (error.message.includes("already registered")) {
          setRegisterError(
            "Diese E-Mail-Adresse ist bereits registriert. Bitte melden Sie sich an."
          );
        } else {
          setRegisterError(error.message);
        }
        return;
      }

      if (data.user) {
        if (selectedPlan) setPlanCookieClient(selectedPlan);
        // Create customer_profiles row
        await supabase.from("customer_profiles").insert({
          id: data.user.id,
          email: regEmail,
          first_name: firstName,
          last_name: lastName,
          display_name: `${firstName} ${lastName}`.trim(),
          selected_plan: selectedPlan,
        });

        // If email confirmation is disabled, session is active immediately
        if (data.session) {
          window.location.replace(`/${locale}/onboarding`);
        } else {
          // Show "check your email" message
          setRegisterError(
            "✅ Konto erstellt! Bitte prüfen Sie Ihre E-Mail und bestätigen Sie die Adresse."
          );
        }
      }
    } catch {
      setRegisterError("Netzwerkfehler. Bitte erneut versuchen.");
    } finally {
      setRegisterLoading(false);
    }
  };

  const pwStrength = passwordStrength(regPassword);
  const { label: strengthText, color: strengthColor } = strengthMeta(pwStrength);

  return (
    <div className="min-h-[calc(100dvh-5rem)] flex flex-col items-center justify-center px-4 py-12 bg-gradient-soft">
      {isMockAuth && (
        <div className="w-full max-w-md mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900 space-y-1">
          <p className="font-semibold">Mock-Auth aktiv</p>
          <p>new@sailly.test / password123 → Onboarding</p>
          <p>draft@sailly.test / password123 → Onboarding (Entwurf)</p>
          <p>done@sailly.test / password123 → Dashboard</p>
        </div>
      )}
      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100">

        {/* Logo */}
        <div className="pt-8 pb-2 flex flex-col items-center">
          <Link href={`/${locale}`} className="inline-block relative" aria-label="Zurück zur Startseite">
            <span className="text-4xl font-logo text-[#f97e70] pb-1 inline-block">Sailly</span>
            <div className="absolute -top-2 -right-8 flex items-center gap-[2px] h-7">
              {[
                { h: "h-1.5", delay: "0ms" },
                { h: "h-3", delay: "150ms" },
                { h: "h-5", delay: "300ms" },
                { h: "h-3", delay: "150ms" },
                { h: "h-1.5", delay: "0ms" },
              ].map((bar, i) => (
                <div
                  key={i}
                  className={`w-[4px] ${bar.h} bg-gradient-to-t from-[#f97e70] to-[#fcd34d] rounded-full animate-[pulse_1s_ease-in-out_infinite]`}
                  style={{ animationDelay: bar.delay }}
                />
              ))}
            </div>
          </Link>
        </div>

        {/* Headline */}
        <div className="px-8 pt-4 pb-5 text-center">
          <h1 className="text-2xl font-bold text-slate-900 leading-tight">
            Ihr Sailly-Konto.<br />In wenigen Minuten live.
          </h1>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            Anmelden oder Konto erstellen – und Ihren KI-Telefonassistenten einrichten.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="px-8 pb-5">
          <div className="flex rounded-xl bg-slate-50 border border-slate-100 p-1 gap-1">
            {(["login", "register"] as Tab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-lg transition-all ${
                  tab === t
                    ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                    : "text-slate-500 hover:text-slate-700"
                }`}
                aria-selected={tab === t}
                role="tab"
              >
                {t === "login" ? "Anmelden" : "Konto erstellen"}
              </button>
            ))}
          </div>
        </div>

        <div className="px-8 pb-8" role="tabpanel">

          {/* ── LOGIN TAB ── */}
          {tab === "login" && (
            <>
              {magicLinkSent ? (
                <div className="flex flex-col items-center text-center gap-4 py-6">
                  <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-green-600" aria-hidden />
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">
                    Wir haben einen Anmelde-Link an{" "}
                    <strong className="text-slate-900">{magicEmail}</strong>{" "}
                    gesendet. Bitte prüfen Sie Ihr Postfach.
                  </p>
                  {mockVerifyUrl && (
                    <a
                      href={mockVerifyUrl}
                      className="text-sm text-primary hover:underline font-medium"
                    >
                      Mock: Magic Link jetzt öffnen →
                    </a>
                  )}
                  <button onClick={() => setMagicLinkSent(false)} className="text-sm text-primary hover:underline">
                    Zurück zur Anmeldung
                  </button>
                </div>
              ) : (
                <form onSubmit={handleLogin} noValidate className="space-y-4">
                  {/* Global login error */}
                  {loginError && (
                    <div role="alert" className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                      <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
                      <span>{loginError}</span>
                    </div>
                  )}

                  {/* Google */}
                  <button
                    type="button"
                    onClick={handleGoogleLogin}
                    className="w-full flex items-center justify-center gap-3 border border-slate-200 rounded-lg py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
                      <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
                      <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"/>
                      <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"/>
                      <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
                    </svg>
                    Mit Google anmelden
                  </button>

                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-slate-200" />
                    <span className="text-xs text-slate-400 font-medium">oder mit E-Mail</span>
                    <div className="flex-1 h-px bg-slate-200" />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label htmlFor="login-email" className="text-sm font-medium text-slate-900">
                      E-Mail-Adresse
                    </label>
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                      placeholder="max@firma.de"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <label htmlFor="login-password" className="text-sm font-medium text-slate-900">
                        Passwort
                      </label>
                      <Link
                        href={`/${locale}/passwort-vergessen`}
                        className="text-xs text-primary hover:underline"
                      >
                        Passwort vergessen?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        id="login-password"
                        type={showLoginPw ? "text" : "password"}
                        autoComplete="current-password"
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        className="w-full px-4 py-3 pr-11 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                        placeholder="Ihr Passwort"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPw(!showLoginPw)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        aria-label={showLoginPw ? "Passwort verbergen" : "Passwort anzeigen"}
                      >
                        {showLoginPw ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
                      </button>
                    </div>
                  </div>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isLoginPending}
                    className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                  >
                    {isLoginPending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" aria-hidden />Wird angemeldet…</>
                    ) : "Anmelden"}
                  </button>

                  {/* Magic Link */}
                  <div className="pt-1">
                    {!showMagicLinkInput ? (
                      <button
                        type="button"
                        onClick={() => setShowMagicLinkInput(true)}
                        className="w-full text-center text-sm text-slate-500 hover:text-primary transition-colors py-2"
                      >
                        Ohne Passwort per Magic Link anmelden
                      </button>
                    ) : (
                      <div className="space-y-2 pt-1 border-t border-slate-100">
                        <p className="text-xs text-slate-500 pt-2">Wir senden Ihnen einen Anmelde-Link per E-Mail.</p>
                        <input
                          type="email"
                          value={magicEmail}
                          onChange={(e) => { setMagicEmail(e.target.value); clearFieldError("magicLink"); }}
                          className="w-full px-4 py-3 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                          placeholder="Ihre E-Mail-Adresse"
                          aria-label="E-Mail für Magic Link"
                        />
                        {errors.magicLink && (
                          <p role="alert" className="text-xs text-red-600">{errors.magicLink}</p>
                        )}
                        <button
                          type="button"
                          onClick={handleMagicLink}
                          disabled={magicLinkLoading}
                          className="w-full flex items-center justify-center gap-2 border border-primary text-primary py-2.5 rounded-lg text-sm font-medium hover:bg-primary/5 transition-colors disabled:opacity-60"
                        >
                          {magicLinkLoading ? (
                            <><Loader2 className="w-4 h-4 animate-spin" aria-hidden />Wird gesendet…</>
                          ) : "Magic Link senden"}
                        </button>
                      </div>
                    )}
                  </div>
                </form>
              )}
            </>
          )}

          {/* ── REGISTER TAB ── */}
          {tab === "register" && (
            <form onSubmit={handleRegister} noValidate className="space-y-4">
              {/* Global register error */}
              {registerError && (
                <div
                  role="alert"
                  className={`flex items-start gap-2 p-3 rounded-lg text-sm border ${
                    registerError.startsWith("✅")
                      ? "bg-green-50 border-green-200 text-green-700"
                      : "bg-red-50 border-red-200 text-red-700"
                  }`}
                >
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
                  <span>{registerError}</span>
                </div>
              )}

              {/* Google */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 border border-slate-200 rounded-lg py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
              >
                <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden>
                  <path fill="#4285F4" d="M23.745 12.27c0-.79-.07-1.54-.19-2.27h-11.3v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/>
                  <path fill="#34A853" d="M12.255 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96h-3.98v3.09C3.515 21.3 7.565 24 12.255 24z"/>
                  <path fill="#FBBC05" d="M5.525 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62h-3.98a11.86 11.86 0 000 10.76l3.98-3.09z"/>
                  <path fill="#EA4335" d="M12.255 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C18.205 1.19 15.495 0 12.255 0c-4.69 0-8.74 2.7-10.71 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/>
                </svg>
                Mit Google registrieren
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-slate-200" />
                <span className="text-xs text-slate-400 font-medium">oder mit E-Mail</span>
                <div className="flex-1 h-px bg-slate-200" />
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                {(["firstName", "lastName"] as const).map((field) => (
                  <div key={field} className="space-y-1.5">
                    <label htmlFor={`reg-${field}`} className="text-sm font-medium text-slate-900">
                      {field === "firstName" ? "Vorname" : "Nachname"}
                    </label>
                    <input
                      id={`reg-${field}`}
                      type="text"
                      autoComplete={field === "firstName" ? "given-name" : "family-name"}
                      value={field === "firstName" ? firstName : lastName}
                      onChange={(e) => {
                        field === "firstName" ? setFirstName(e.target.value) : setLastName(e.target.value);
                        clearFieldError(field);
                      }}
                      className={`w-full px-4 py-3 rounded-lg border text-sm outline-none transition-all ${
                        errors[field]
                          ? "border-red-400"
                          : "border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                      }`}
                      placeholder={field === "firstName" ? "Max" : "Mustermann"}
                      aria-invalid={!!errors[field]}
                    />
                    {errors[field] && <p role="alert" className="text-xs text-red-600">{errors[field]}</p>}
                  </div>
                ))}
              </div>

              {/* Email */}
              <div className="space-y-1.5">
                <label htmlFor="reg-email" className="text-sm font-medium text-slate-900">E-Mail-Adresse</label>
                <input
                  id="reg-email"
                  type="email"
                  autoComplete="email"
                  value={regEmail}
                  onChange={(e) => { setRegEmail(e.target.value); clearFieldError("regEmail"); }}
                  className={`w-full px-4 py-3 rounded-lg border text-sm outline-none transition-all ${
                    errors.regEmail ? "border-red-400" : "border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  }`}
                  placeholder="max@firma.de"
                  aria-invalid={!!errors.regEmail}
                />
                {errors.regEmail && <p role="alert" className="text-xs text-red-600">{errors.regEmail}</p>}
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label htmlFor="reg-password" className="text-sm font-medium text-slate-900">Passwort</label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showRegPw ? "text" : "password"}
                    autoComplete="new-password"
                    value={regPassword}
                    minLength={8}
                    onChange={(e) => { setRegPassword(e.target.value); clearFieldError("regPassword"); }}
                    className={`w-full px-4 py-3 pr-11 rounded-lg border text-sm outline-none transition-all ${
                      errors.regPassword ? "border-red-400" : "border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    }`}
                    placeholder="Mindestens 8 Zeichen"
                    aria-invalid={!!errors.regPassword}
                  />
                  <button type="button" onClick={() => setShowRegPw(!showRegPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showRegPw ? "Passwort verbergen" : "Passwort anzeigen"}>
                    {showRegPw ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
                  </button>
                </div>
                {errors.regPassword && <p role="alert" className="text-xs text-red-600">{errors.regPassword}</p>}
                {regPassword.length > 0 && (
                  <div className="space-y-1 mt-1.5">
                    <div className="flex gap-1" aria-hidden>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${i <= pwStrength ? strengthColor : "bg-slate-200"}`} />
                      ))}
                    </div>
                    <p className="text-xs text-slate-500">Passwortstärke: {strengthText}</p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="space-y-1.5">
                <label htmlFor="reg-password-confirm" className="text-sm font-medium text-slate-900">Passwort wiederholen</label>
                <div className="relative">
                  <input
                    id="reg-password-confirm"
                    type={showRegPwConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    value={regPasswordConfirm}
                    onChange={(e) => { setRegPasswordConfirm(e.target.value); clearFieldError("regPasswordConfirm"); }}
                    className={`w-full px-4 py-3 pr-11 rounded-lg border text-sm outline-none transition-all ${
                      errors.regPasswordConfirm ? "border-red-400" : "border-slate-200 focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    }`}
                    placeholder="Passwort wiederholen"
                    aria-invalid={!!errors.regPasswordConfirm}
                  />
                  <button type="button" onClick={() => setShowRegPwConfirm(!showRegPwConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showRegPwConfirm ? "Passwort verbergen" : "Passwort anzeigen"}>
                    {showRegPwConfirm ? <EyeOff className="w-4 h-4" aria-hidden /> : <Eye className="w-4 h-4" aria-hidden />}
                  </button>
                </div>
                {errors.regPasswordConfirm && <p role="alert" className="text-xs text-red-600">{errors.regPasswordConfirm}</p>}
              </div>

              {/* Terms */}
              <div className="space-y-1">
                <label className="flex items-start gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={acceptTerms}
                    onChange={(e) => { setAcceptTerms(e.target.checked); clearFieldError("acceptTerms"); }}
                    className="w-4 h-4 mt-0.5 rounded border-slate-300 accent-primary shrink-0"
                    aria-invalid={!!errors.acceptTerms}
                  />
                  <span className="text-sm text-slate-600 leading-snug">
                    Ich akzeptiere die{" "}
                    <Link href={`/${locale}/agb`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">AGB</Link>
                    {" "}und{" "}
                    <Link href={`/${locale}/datenschutz`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">Datenschutzerklärung</Link>
                  </span>
                </label>
                {errors.acceptTerms && <p role="alert" className="text-xs text-red-600 pl-6">{errors.acceptTerms}</p>}
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={registerLoading}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-lg font-semibold text-sm hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
              >
                {registerLoading ? (
                  <><Loader2 className="w-4 h-4 animate-spin" aria-hidden />Wird verarbeitet…</>
                ) : "Konto erstellen & Einrichten starten"}
              </button>
            </form>
          )}
        </div>
      </div>

      {/* Trust row */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-slate-500 px-4 text-center">
        <span>🔒 DSGVO-konform</span>
        <span className="text-slate-300" aria-hidden>·</span>
        <span>🇩🇪 Deutsche Server</span>
        <span className="text-slate-300" aria-hidden>·</span>
        <span>24/7 Support</span>
      </div>

      {/* Legal links */}
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-400">
        <Link href={`/${locale}/datenschutz`} className="hover:text-slate-600 transition-colors">Datenschutz</Link>
        <span aria-hidden>·</span>
        <Link href={`/${locale}/agb`} className="hover:text-slate-600 transition-colors">AGB</Link>
        <span aria-hidden>·</span>
        <Link href={`/${locale}/impressum`} className="hover:text-slate-600 transition-colors">Impressum</Link>
      </div>
    </div>
  );
}
