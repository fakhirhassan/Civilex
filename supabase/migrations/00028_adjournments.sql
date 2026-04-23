-- Migration 00028: Hearing adjournments
--
-- In Pakistani practice the reader/ahlmad (here: the stenographer, who
-- doubles as reader in our app) records why a hearing was adjourned, and
-- the judge may impose a cost. The transcript is verbatim; this is the
-- structured reason code for audit/reporting.

CREATE TYPE public.adjournment_reason AS ENUM (
  'party_absent',
  'counsel_unavailable',
  'document_pending',
  'court_busy',
  'judge_absent',
  'witness_absent',
  'other'
);

CREATE TABLE public.hearing_adjournments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hearing_id UUID NOT NULL REFERENCES public.hearings(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  reason public.adjournment_reason NOT NULL,
  reason_text TEXT,
  cost_imposed NUMERIC(10, 2) DEFAULT 0,
  next_date TIMESTAMPTZ,
  adjourned_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_adjournments_hearing ON public.hearing_adjournments(hearing_id);
CREATE INDEX idx_adjournments_case ON public.hearing_adjournments(case_id);

ALTER TABLE public.hearing_adjournments ENABLE ROW LEVEL SECURITY;

-- Any case party or court official can see adjournment reasons.
CREATE POLICY "hearing_adjournments_select" ON public.hearing_adjournments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = hearing_adjournments.case_id
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

-- Court officials + assigned stenographer can record an adjournment.
CREATE POLICY "hearing_adjournments_insert" ON public.hearing_adjournments
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('trial_judge', 'admin_court', 'magistrate')
    OR (
      public.get_user_role() = 'stenographer'
      AND EXISTS (
        SELECT 1 FROM public.cases c
        WHERE c.id = hearing_adjournments.case_id
        AND c.stenographer_id = auth.uid()
      )
    )
  );
