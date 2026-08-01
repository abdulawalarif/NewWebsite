-- M1: plan persistence + Stripe subscriptions
-- Run in Supabase SQL Editor after 013–015.

-- Carry pricing plan choice through auth / onboarding
ALTER TABLE customer_profiles
  ADD COLUMN IF NOT EXISTS selected_plan text;

COMMENT ON COLUMN customer_profiles.selected_plan IS
  'Pricing plan key from /preise CTA (starters|main|president_suite|first_class). first_class is contact-sales only.';

-- Subscriptions (Stripe-backed; service role writes from webhooks)
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_key text NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  status text NOT NULL DEFAULT 'incomplete'
    CHECK (status IN ('trialing', 'active', 'past_due', 'canceled', 'unpaid', 'incomplete')),
  current_period_end timestamptz,
  trial_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS subscriptions_stripe_customer_idx
  ON subscriptions (stripe_customer_id);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Customers can read their own subscription row
DROP POLICY IF EXISTS "subscriptions_select_own" ON subscriptions;
CREATE POLICY "subscriptions_select_own"
  ON subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Writes happen via service role (webhook / checkout) — no insert/update for anon/authenticated
