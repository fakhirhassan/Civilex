-- Migration 00033: Summon claim code
--
-- The existing defendant_claim_token is a long opaque string used in the
-- summon URL. Defendants who receive the summon by email may prefer to
-- register first and then paste a short, human-friendly code on the portal
-- to link themselves to the case. This migration adds that short code.

ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS summon_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_cases_summon_code
  ON public.cases(summon_code)
  WHERE summon_code IS NOT NULL;
