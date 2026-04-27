-- Migration 00035: Summons history + ex-parte declaration
--
-- Order V CPC: a defendant who fails to respond to repeated summons may be
-- proceeded against ex parte. Real practice typically requires three attempts
-- before the court entertains an ex-parte motion; this app keeps that cap at
-- the application layer but records every summon issued so the audit trail is
-- complete.

CREATE TYPE public.summon_status AS ENUM (
  'active',       -- Latest unresponded summon
  'responded',    -- Defendant claimed the case before this summon expired
  'expired',      -- Time elapsed without a response
  'superseded'    -- A subsequent re-issue replaced this one
);

CREATE TABLE public.summons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  summon_number INTEGER NOT NULL,             -- 1, 2, 3 ...
  code TEXT NOT NULL,                         -- short summon code printed in the email
  token TEXT NOT NULL,                        -- long URL token
  expires_at TIMESTAMPTZ NOT NULL,
  status public.summon_status NOT NULL DEFAULT 'active',
  sent_to_email TEXT,
  email_delivered BOOLEAN NOT NULL DEFAULT false,
  email_provider TEXT,
  email_error TEXT,
  sent_by UUID NOT NULL REFERENCES public.profiles(id),
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  responded_at TIMESTAMPTZ,
  superseded_at TIMESTAMPTZ
);

CREATE INDEX idx_summons_case ON public.summons(case_id);
CREATE INDEX idx_summons_status ON public.summons(status);
CREATE UNIQUE INDEX idx_summons_case_number
  ON public.summons(case_id, summon_number);

-- Audit columns on cases for ex-parte declaration
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS ex_parte_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ex_parte_by UUID REFERENCES public.profiles(id),
  ADD COLUMN IF NOT EXISTS ex_parte_reason TEXT;

ALTER TABLE public.summons ENABLE ROW LEVEL SECURITY;

-- Anyone connected to the case may read summon history (defendant, plaintiff,
-- their lawyers, court officials).
CREATE POLICY "summons_select" ON public.summons
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = summons.case_id
      AND (
        c.plaintiff_id = auth.uid()
        OR c.defendant_id = auth.uid()
        OR c.admin_court_id = auth.uid()
        OR c.trial_judge_id = auth.uid()
        OR c.stenographer_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.case_assignments ca
          WHERE ca.case_id = c.id AND ca.lawyer_id = auth.uid()
        )
      )
    )
    OR public.get_user_role() IN ('admin_court', 'trial_judge', 'magistrate', 'stenographer')
  );

-- Only court officials can issue summons.
CREATE POLICY "summons_insert" ON public.summons
  FOR INSERT WITH CHECK (
    sent_by = auth.uid()
    AND public.get_user_role() IN ('admin_court', 'magistrate')
  );

-- Status transitions: court officials may mark expired/superseded; the
-- claim API (running with the defendant's auth) marks 'responded'.
CREATE POLICY "summons_update_court" ON public.summons
  FOR UPDATE USING (
    public.get_user_role() IN ('admin_court', 'magistrate', 'trial_judge')
  );

CREATE POLICY "summons_update_defendant" ON public.summons
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = summons.case_id
      AND c.defendant_id = auth.uid()
    )
  );
