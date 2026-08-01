# Sailly — SaaS subscription & contract emails

Research for Charles (2026-08-01). Scope: **basic SaaS subscription** with Stripe Checkout, 30-day 50% trial, monthly cancel. Overage (€0.12/min) stays **manual invoice for v1**.

---

## When does the “contract” email go out?

For self-serve SaaS, the **contract / order confirmation** is sent **immediately after successful payment authorization** (Stripe `checkout.session.completed` / first invoice paid or trial started).

It is **not** a wet-ink contract. It is the transactional record that:

1. Confirms the customer accepted AGB (+ AVV from onboarding step 4).
2. States the plan, price, trial terms, and next charge date.
3. Links to the dashboard and billing portal.

Sailly already captures `avv_accepted` + timestamp at onboarding; the post-payment email should **reuse that consent**, not ask again.

| Trigger (Stripe) | Customer email | Sailly action |
|---|---|---|
| `checkout.session.completed` | **Contract / welcome + order confirmation** | Activate entitlement (`trialing`/`active`); send this email |
| `invoice.payment_succeeded` (renewals) | Receipt / invoice | Keep access; attach or link invoice |
| `customer.subscription.trial_will_end` (~3 days before) | Trial ending reminder | Soft nudge; portal link |
| `invoice.payment_failed` | Payment failed | Mark `past_due`; warn; portal link; suspend after policy |
| `customer.subscription.updated` (cancel_at_period_end) | Cancellation scheduled | Access until period end |
| `customer.subscription.deleted` | Access ended | Suspend agent |

Stripe can send many of these natively (Dashboard → Billing → emails). Custom branded “contract” copy usually comes from **your** app on `checkout.session.completed`.

---

## What must stand in the contract / welcome email

**Subject (DE example):**  
`Ihr Sailly-Abo — Bestätigung {Plan} (Testphase gestartet)`

**Body must include:**

| Field | Source |
|---|---|
| Customer name + email | `customer_profiles` / auth |
| Company name | onboarding / `agent_configs` |
| Plan name + monthly list price | `starters` / `main` / `president_suite` |
| Trial: 30 days at 50% | AGB + Checkout config |
| Amount due today (trial intro) | 50% of list (or €0 if free-trial-only — Sailly uses 50% intro) |
| Next full-price charge date | `trial_end` |
| Included minutes | pricing copy (6k / 15k / 25k) |
| Overage note | €0.12/min — **manual invoice v1** |
| AGB accepted | timestamp + link to `/agb` |
| AVV accepted | `avv_accepted_at` + link to AVV if hosted |
| Cancel anytime monthly | AGB |
| CTA | Dashboard + “Rechnung & Zahlung” (portal) |
| Support | `support@sailly.de` |

**Legal tone:** formal German “Sie”; product term “Voice Agent”.

---

## Mock implementation (this PR follow-up)

Under mock auth / mock Stripe:

1. Checkout redirects to a **fake payment page** (card UI, no real charge).
2. On “Pay”, subscription → `trialing` and a **stub contract email** is written to the mock outbox (logged + previewable on success / dashboard).
3. No SMTP yet — replace stub with Resend/SES/Postmark when going live.

---

## Out of scope for v1 emails

- Metered overage invoices (manual)
- First Class (contact sales)
- Multi-seat / tax ID PDF generation (can add later via Stripe Tax + Invoice PDF)
