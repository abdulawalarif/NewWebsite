# NextSteps — Sailly Website Handoff

**Audience:** the freelancer taking over this repository.
**Repo:** `https://github.com/Chilix2/NewWebsite` · **Live:** `https://www.sailly.de`
**Last updated:** 2026-07-31

Read this file fully before touching anything. Then read `README.md` (the master technical doc). Together they are the complete onboarding.

---

## 1. The Business — What Sailly Is and Why This Site Exists

**Sailly** is a German B2B SaaS that sells **AI voice agents** ("Voice Agents") to small and medium service businesses (KMU). The agent answers the business's phone 24/7, takes reservations and orders, answers FAQs, forwards urgent calls, and sends confirmations by email/SMS/WhatsApp — in 50+ languages, GDPR-compliant (German/EU hosting, AVV, ISO 27001 messaging).

**Target customers:** hotels, restaurants & cafés, medical practices, law firms, and local services (beauty, automotive, real estate). These businesses lose revenue on every missed call; Sailly turns missed calls into bookings.

**The website's job** is the entire top-of-funnel and customer self-service layer:

1. **Market** the product (industry pages, product pages, pricing, demo call).
2. **Convert** visitors into paying customers **fully self-serve** — sign up, pick a plan, pay, and get an agent — like big-tech SaaS (email or Google sign-up, no sales call required).
3. **Serve** existing customers (dashboard: is my agent live? recent calls? test call? settings?).

Point 1 is done. Point 2 is **the main unfinished work** (see §5, Milestone M1). Point 3 is partially done (M2–M3).

### Pricing model (as implemented — source of truth: `lib/pricing-plans.ts` + `dictionaries/de.json → pricing_page`)

| Plan key | Name | Price/mo | Minutes | Notes |
|---|---|---|---|---|
| `starters` | Starters | €59.99 | 6,000 call min | Entry; "Powered by Grok Voice Agent" |
| `main` | Main | €149 | 15,000 call min | Most popular; calendar integration, call summaries, premium models |
| `president_suite` | President Suite | €279 | 25,000 call min + **unlimited WhatsApp** | WhatsApp ordering, 0% commission gastro delivery, PMS/POS integrations |
| `first_class` | First Class | from €449 | custom | Multi-location, custom workflows, SLA, dedicated contact |

Commercial terms (AGB): **30-day trial at 50% off** all plans; overage **€0.12/min** from the first extra minute; net prices; **monthly cancellable**. Billing today is contractual/manual (monthly invoice) — there is **no payment provider integrated yet**.

---

## 2. Tech Stack (fixed)

- **Next.js 16.0.7** (App Router) + **React 19.2** + **TypeScript** (strict; builds enforce type-checking).
- **Tailwind CSS v4** via `@tailwindcss/postcss` — **there is no `tailwind.config.*`; the entire theme lives in `app/globals.css`** (CSS custom properties).
- **UI:** shadcn-style components (Radix primitives in `components/ui/`), **Framer Motion 12**, **Three.js + React Three Fiber + Drei** (the orb), `next-themes`, Vercel Analytics.
- **Auth & DB:** **Supabase** (`@supabase/ssr` + `@supabase/supabase-js`). Project ref `eaezqrfizmlkljsuhitz`. Tables: `customer_profiles`, `onboarding_drafts`, `agent_configs` (typed in `types/onboarding.ts`, helpers in `lib/supabase/schema.ts`).
- **i18n:** 13 locales — `de` (default), `en, tr, es, ar, zh, ru, pl, fr, el, ko, vi, th`. Dictionary JSON per locale in `dictionaries/`, deep-merged **over the English base** (untranslated keys fall back to English). `middleware.ts` does locale-prefix routing + Supabase session refresh. RTL: `ar`.
- **Voice-agent backend (separate system):** the FastAPI server (repo `sailly-browser-demo`, port 8080) that actually runs the phone agents. This website talks to it through the env vars `VOICE_AGENT_ORIGIN` (server-side proxy) and `NEXT_PUBLIC_VOICE_AGENT_ORIGIN` (browser). It is **not part of this repo** but the dashboard depends on it.
- **Deployment:** AWS EC2 (eu-central-1) behind **PM2**, nginx in front, served at `https://www.sailly.de`. **Not Vercel** (despite `@vercel/analytics`). See `AWS_DEPLOYMENT_GUIDE.md`.

---

## 3. DO NOT TOUCH — The Design Is Finished

The visual design was completed in a full "Sierra-style v2" redesign (July 2026). **Do not redesign, re-skin, re-color, or change fonts.** Your job is to add functionality **inside** this design system.

### 3.1 Non-negotiable rules for any new page or component

1. **Reuse the existing page kit.** New pages must be built from:
   - `components/page-layout.tsx` (cosmic-gradient page shell),
   - `components/page-hero.tsx`,
   - `components/sierra/page-kit.tsx` (`SierraHero`, `Section`, `CtaBand`, `Reveal`),
   - glass primitives: `components/ui/glass-card.tsx`, `glass-icon.tsx`, `spotlight-card.tsx`.
2. **Use only the brand tokens below** — never introduce new hex colors. If you need a color, it already exists as a token or an approved gradient.
3. **Every new route goes under `app/[locale]/...` and ships in all 13 locales** via the dictionaries (German first, formal "Sie", product term is "Voice Agent" — see `AUDIT_CHECKLIST.md`).
4. Keep the glassmorphism + flashlight + motion language (cards with `.glass-panel`, backdrop blur, soft shadows, reveal-on-scroll).

### 3.2 Brand tokens (from `app/globals.css`)

| Token | Value | Use |
|---|---|---|
| `--color-brand-primary` | `#FF9B8A` (soft coral) | core brand, `--primary`, `--ring` |
| `--color-brand-secondary` | `#FFC8B9` (light peach) | secondary accents |
| `--color-brand-accent` | `#A8E6CF` (mint) | accent |
| `--color-brand-yellow` | `#FCD34D` (golden) | logo gradient |
| `--color-brand-orange` | `#FFBE8C` (warm orange) | accents |
| `--color-brand-pink` | `#FFB6CB` (soft pink) | accents |

- Base: `--background: 0 0% 99%` (warm near-white), `--foreground: 222 47% 11%`, `--radius: 0.75rem`. Dark-mode overrides exist via `.dark`.
- Gradients: `.text-gradient-brand` (135° coral→orange→pink), `.bg-gradient-sailly` (5-stop warm), `.bg-gradient-soft`, `.shadow-sailly` (`0 10px 40px -10px rgba(255,155,138,.3)`).
- Pricing card gradients (fixed per tier, `lib/pricing-plans.ts → PRICING_PLAN_CARD_CLASSES`): Starters lilac `#c9b6e8→#9b7fd4` · Main orange `#f5c4b0→#e8957a` · President Suite blue `#b8c4dc→#8a9bc4` · First Class sand/gold `#d9c9a8→#c4ad82`.

### 3.3 Fonts

- **UI/body:** Geist Sans + Geist Mono (`next/font/google`, loaded in `app/layout.tsx`).
- **Logo:** custom `Sys Falso Italic` (`public/fonts/SysFalso-Italic.*`, class `.font-logo`).
- Fluid type scale `--text-hero … --text-body` → `.text-fluid-*` utilities.

### 3.4 Signature effects (keep, don't remove)

- **iOS glassmorphism:** SVG displacement filters (`components/ios-glass-filters.tsx`) + `.glass-panel` — see `GLASSMORPHISM_INTEGRATION_SUMMARY.md`.
- **Mouse-follow flashlight/spotlight** on glass containers (`--spotlight-x/y`, RAF-throttled) — `UNIVERSAL_FLASHLIGHT_IMPLEMENTATION.md`; custom cursor `components/qortex-cursor.tsx`.
- **3D orb:** `components/sailly-orb.tsx` (R3F shader sphere, idle/listening/speaking states, brand coral/peach/pink).
- **Cinematic hero:** `components/hero-v2.tsx` (video clips + `hero-chat-overlay.tsx` + `hero-slogan-sequence.tsx`).
- **Brand orbit / proof bands:** `brand-orbit.tsx`, `integration-orbit-band.tsx`, `proof-band-v2.tsx`.
- **Header/footer:** `components/sailly-header-v2.tsx` (active), `components/sailly-footer.tsx`. Old `sailly-header.tsx` is kept only for rollback — do not revive it.

---

## 4. What's Done and Working

- **Full marketing site (~50+ localized pages):** home, `demo`, `contact`, `preise` (+ `preise/[plan]` detail), `technologie`, `produkt/*` (10 pages), `loesungen/{hotels,restaurants,medical,legal,services}` (shared `components/industry-template.tsx` + `lib/industry-themes.ts`), `use-cases/branche/*` (8 verticals), `ai-impacts/*` (5), content pages (`resources, news, blog, docs, community, academy`), legal (`impressum, datenschutz, agb`).
- **SEO:** `app/sitemap.ts`, `app/robots.ts`, hreflang for all locales, JSON-LD `SoftwareApplication`, OG image. Security headers + CSP in `next.config.mjs`.
- **Auth (Supabase) — working:** combined login/register at `app/[locale]/login/login-client.tsx` with **email/password, Google OAuth, and magic link**; password reset at `passwort-vergessen`; OAuth code exchange at `app/auth/callback/route.ts`; session refresh in `middleware.ts`. Login redirects to `/dashboard` if an `agent_configs` row exists, else to `/onboarding`.
- **Onboarding wizard:** `app/[locale]/onboarding/OnboardingClient.tsx` — 4 steps (1 company/industry/hours/services/languages, 2 agent name/voice/greeting/escalation contacts, 3 phone/provider/forwarding mode, 4 AVV + consent + data retention), draft-resume via `onboarding_drafts`, edit mode `?edit=true`, submit → `POST /api/onboarding/submit` → `agent_configs` row with `status: "pending"`.
- **Customer dashboard:** `app/[locale]/dashboard/` — auth-gated; agent status card (`pending/active/inactive/suspended`, "Wird eingerichtet ~24h" notice), **last-5-calls section** (`last-calls-section.tsx` → `GET /api/customer/calls` → backend `/api/member/calls`), **audio-validation section**, **test-call button** (`test-call-button.tsx` → backend `/api/demo/initiate`), logout, edit-settings link.
- **Demo call flow:** `POST /api/demo/initiate` (one free demo per browser cookie `sailly_demo_used`, 30 days) — **currently a stub** unless wired to the real backend (see §6).
- **Contact form:** `POST /api/contact` → forwards to `CONTACT_WEBHOOK_URL` if set, else just logs.

---

## 5. Where We Left Off & the Roadmap (the actual work)

**Just landed (last commits, 2026-07-30/31):** the dashboard customer-wiring — `/api/customer/calls` proxy, last-calls list, test-call button, audio-validation proxy cleanup. **This was the in-progress task when handover started.**

The overarching goal: **a visitor must be able to sign up (email or Google), pick a plan, pay, and have their agent provisioned — with zero manual work from us.** Then the dashboard must show them exactly where they stand ("am I wired? what's missing?").

### M1 — Self-serve signup → plan → pay (Stripe)  *(highest priority)*

Current gap: pricing CTAs link to `/{locale}/login?tab=register&plan={planKey}`, but **`login-client.tsx` never reads the `plan` param — the plan choice is silently dropped.** There is no payment provider at all (no Stripe/Paddle dep in `package.json`; billing is manual invoicing per AGB).

Tasks (decision: **Stripe**, confirmed by owner):

1. Add `stripe` (server) + `@stripe/stripe-js` deps.
2. **Carry the plan through auth:** read `?plan=` in `login-client.tsx` (both register and Google OAuth) and in `app/auth/callback/route.ts`; persist it (e.g. cookie or `customer_profiles.selected_plan`) so it survives the OAuth round-trip.
3. Create a Supabase `subscriptions` table (user_id, plan_key, stripe_customer_id, stripe_subscription_id, status, current_period_end, trial flags).
4. After signup/onboarding, start **Stripe Checkout** in subscription mode for the chosen plan: map the 4 plan keys → Stripe Price IDs; configure **30-day 50% intro pricing** and **monthly cancel**; `first_class` keeps "contact sales" (no checkout).
5. **Webhook** `POST /api/stripe/webhook`: handle `checkout.session.completed`, `customer.subscription.created/updated/deleted`, `invoice.payment_failed` → upsert `subscriptions` and set entitlement on `agent_configs` (e.g. only allow activation with an active subscription; set `suspended` on payment failure).
6. **Overage/usage:** €0.12/min over included minutes. Decide: Stripe metered billing fed by the voice-agent backend's minute counters, or keep overage on manual invoice for v1. (Decide in M1, document the choice.)
7. **Customer portal** link in the dashboard (invoices, payment method, cancellation).
8. Legal: checkout must record AGB/AVV consent (step 4 already captures `avv_accepted` + timestamp — reuse).

### M2 — Dashboard "Am I wired?" status & setup checklist

Current gap: `agentConfigs.status === "active"` is a **manual DB flag**; there is no real connectivity/health check, and API proxies swallow backend errors (return empty lists).

Tasks:

1. **Real status API** (authenticated, like `/api/customer/calls`): ask the voice-agent backend for this user's agent state — number provisioned? forwarding verified? last successful call? — instead of trusting the DB flag alone. Surface: "Live", "In setup", "Action needed".
2. **Setup-completeness checklist per industry** in the dashboard: minimum data the agent needs to work, derived from `agent_configs` + industry. E.g. restaurant: greeting, opening hours, menu/services list, reservation phone, notification email/SMS; medical: hours, services, escalation contact, privacy consent. Show a progress bar and deep-links into `/onboarding?edit=true` for missing items (industry templates already exist in `lib/industry-themes.ts` and `dictionaries` industries sections).
3. Fix error handling: proxies (`/api/customer/calls`, `/api/audio-validation/tests`) should return a structured "backend unreachable" state the UI can render, not silent empty lists.
4. Header should reflect auth state: show "Dashboard" instead of "Anmelden" when logged in (`components/sailly-header-v2.tsx`).

### M3 — Automated activation pipeline

Current gap: onboarding sets `status: "pending"` and a human activates the agent in Supabase ("ca. 24 Stunden").

Tasks:

1. `POST /api/onboarding/submit` (or a new provisioning endpoint) should call the voice-agent backend's provisioning to create/configure the tenant agent automatically.
2. Backend flips `agent_configs.status → "active"` + `activated_at` on success (via webhook or callback), `suspended`/`inactive` on failure with a reason stored.
3. Send the customer an activation email (agent live + test-call link + forwarding instructions from step 3).

### M4 — Launch cleanup & hardening

- Remove dev/stale pages: `app/[locale]/test-orb/page.tsx` (3D playground, publicly reachable), `app/pricing/page.tsx` (stale, mentions "QORTEX", unstyled).
- Dedupe pricing routes: `/[locale]/pricing` vs `/[locale]/preise` — keep one canonical, redirect the other.
- Delete dead `app/api/auth/login/route.ts` (returns 410).
- **Add auth to `GET /api/audio-validation/tests`** (currently proxied without a session check, unlike `/api/customer/calls`).
- Fix `test-call-button.tsx`: it falls back to `http://127.0.0.1:8080` **in the browser** — require `NEXT_PUBLIC_VOICE_AGENT_ORIGIN` in production instead.
- Demo backend: `app/api/demo/{initiate,status,checkpoints}` is an **in-memory stub** (fake timers, `globalThis` Map — breaks across serverless instances/restarts). Set `DEMO_API_PROXY` to the real backend, or move state to Supabase.
- Create `.env.example` at repo root (currently missing) listing every var in §7.
- Verify new pages render correctly in all 13 locales (dictionary deep-merge covers gaps, but check layouts, especially `ar` RTL).

### Definition of done for the whole roadmap

A new German restaurant owner can: land on sailly.de → see pricing → click "Jetzt starten" → register with Google → complete onboarding in 5 minutes → pay by card/SEPA via Stripe → get their agent live automatically → open the dashboard and see "Live", their last calls, and a test-call button — all without any human on our side.

---

## 6. Known Stubs / Quirks (don't be surprised)

| Area | State |
|---|---|
| Demo call backend | Stub (in-memory, fake status machine) unless `DEMO_API_PROXY` or `DEMO_LIVE_CALLS=true` + `TWILIO_*` are set |
| Contact form | Logs only unless `CONTACT_WEBHOOK_URL` is set |
| Agent activation | Manual (`pending → active` in Supabase) |
| Payment/billing | None — manual invoicing per AGB |
| `?plan=` param | Dropped at register (M1 fixes) |
| `app/api/auth/login` | Dead endpoint (410) — auth is client-side Supabase |
| `Kimi3/` | Unrelated dev tooling (Cursor→Kimi proxy) — ignore |
| `COMPLETE_CODEBASE.txt` | AI-context dump — not source |
| `gap-analysis-checklist.md` | Partially stale (auth/onboarding items it calls "stub" are now done) |

---

## 7. Environment Variables

Set these on the EC2 host (PM2 env). No `.env.example` exists yet — create it in M4.

| Var | Purpose | Required |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | auth/dashboard |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key | auth/dashboard |
| `SUPABASE_SERVICE_ROLE_KEY` | Privileged server ops (never expose client-side) | yes (server) |
| `NEXT_PUBLIC_SITE_URL` | Base URL (`https://www.sailly.de`) | yes |
| `VOICE_AGENT_ORIGIN` | Voice-agent backend for server-side proxies (default `http://127.0.0.1:8080`) | dashboard |
| `NEXT_PUBLIC_VOICE_AGENT_ORIGIN` | Backend origin for browser test-call (**must be public URL in prod**) | dashboard |
| `DEMO_API_PROXY` | Real demo-call backend URL | live demo |
| `DEMO_LIVE_CALLS` (= `"true"`) + `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` | Live demo calls via Twilio | live demo |
| `CONTACT_WEBHOOK_URL` | Contact-form lead forwarding | recommended |
| *(new in M1)* `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Stripe billing | M1 |
| `ELEVENLABS_API_KEY` | One-off audio demo generation scripts | optional |
| `BROWSERSTACK_USERNAME` / `BROWSERSTACK_ACCESS_KEY`, `BASE_URL` | Playwright/BrowserStack tests | testing |

---

## 8. How to Run, Build, Deploy

```bash
npm install
npm run dev        # local dev
npx tsc --noEmit   # type-check (builds enforce this — keep it green)
npm run build      # production build
```

Deploy (summary — full guide in `AWS_DEPLOYMENT_GUIDE.md`): build → package `.next/`, `public/`, `package.json`, `next.config.mjs` → upload to S3 → SSM deploys to EC2 and restarts PM2. App runs behind nginx at `https://www.sailly.de`. See also `MULTI_APP_SETUP.md` (shares the box with other apps) and `DEV_BUILD_SETUP.md`.

**Repo hygiene:** `main` is the live branch; commits are auto-pushed from the dev box in the current workflow — coordinate before force-pushing anything. Keep TypeScript green (the build enforces it since commit `9a51e77`).

---

## 9. Doc Map (what to read, in order)

1. **This file** — business, state, roadmap.
2. `README.md` — master technical doc (page tree, components, i18n, auth, SEO, deploy).
3. `AUDIT_CHECKLIST.md` — brand & terminology rules (German "Sie", "Voice Agent").
4. `SUPABASE_SETUP.md` — auth provider setup (Google Cloud project `sailly-voice-agent-eu`).
5. `AWS_DEPLOYMENT_GUIDE.md` — infrastructure.
6. Design deep-dives (only if you touch visuals): `GLASSMORPHISM_INTEGRATION_SUMMARY.md`, `UNIVERSAL_FLASHLIGHT_IMPLEMENTATION.md`, `LAYOUT_CONSISTENCY_SUMMARY.md`.

Questions → repo owner. Viel Erfolg!
