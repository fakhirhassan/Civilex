-- Migration 00027: Framing of Issues (CPC Order XIV)
--
-- After preliminary hearing the trial judge records the specific disputed
-- questions ("issues") the trial will resolve. Each issue is later answered
-- at judgment time with a finding (affirmative / negative / partly).
--
-- Design:
-- - issue_text is locked once the case moves past issues_framed.
-- - finding + finding_text are written at/after reserved_for_judgment.
-- - issue_number is scoped per-case (1..N). Uniqueness enforced by DB.

CREATE TYPE public.issue_type AS ENUM ('fact', 'law', 'mixed');
CREATE TYPE public.issue_finding AS ENUM ('affirmative', 'negative', 'partly', 'not_pressed');

CREATE TABLE public.case_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  issue_number INTEGER NOT NULL,
  issue_text TEXT NOT NULL,
  issue_type public.issue_type NOT NULL DEFAULT 'fact',
  burden_of_proof TEXT,
  finding public.issue_finding,
  finding_text TEXT,
  framed_by UUID REFERENCES public.profiles(id),
  framed_at TIMESTAMPTZ DEFAULT now(),
  decided_by UUID REFERENCES public.profiles(id),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (case_id, issue_number)
);

CREATE INDEX idx_case_issues_case ON public.case_issues(case_id);

CREATE TRIGGER case_issues_updated_at
  BEFORE UPDATE ON public.case_issues
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.case_issues ENABLE ROW LEVEL SECURITY;

-- Any case party or court official can see the issues.
CREATE POLICY "case_issues_select" ON public.case_issues
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_issues.case_id
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
    OR public.get_user_role() IN ('admin_court', 'trial_judge', 'magistrate')
  );

-- Only court officials can frame an issue, and only while the case is in
-- preliminary_hearing or issues_framed (so judge can still add/remove before
-- transferring to trial).
CREATE POLICY "case_issues_insert" ON public.case_issues
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('trial_judge', 'admin_court', 'magistrate')
    AND EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_issues.case_id
      AND c.status IN ('preliminary_hearing', 'issues_framed')
    )
  );

-- Update rules:
--   - While case is still in preliminary_hearing or issues_framed: court
--     officials can fully edit issue text/type.
--   - Once case moved past those (evidence, arguments, reserved_for_judgment,
--     judgment_delivered): text is locked; only finding fields may be written
--     by court officials. We express the overall gate here; column-level
--     immutability is enforced by the hook (the only writer).
CREATE POLICY "case_issues_update" ON public.case_issues
  FOR UPDATE USING (
    public.get_user_role() IN ('trial_judge', 'admin_court', 'magistrate')
    AND EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_issues.case_id
      AND c.status IN (
        'preliminary_hearing', 'issues_framed', 'transferred_to_trial',
        'evidence_stage', 'arguments', 'reserved_for_judgment',
        'judgment_delivered'
      )
    )
  );

-- Delete only allowed while still framing.
CREATE POLICY "case_issues_delete" ON public.case_issues
  FOR DELETE USING (
    public.get_user_role() IN ('trial_judge', 'admin_court', 'magistrate')
    AND EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_issues.case_id
      AND c.status IN ('preliminary_hearing', 'issues_framed')
    )
  );
