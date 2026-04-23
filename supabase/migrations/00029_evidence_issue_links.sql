-- Migration 00029: Evidence ↔ Issue linkage
--
-- Each piece of evidence may support (or refute) one or more framed issues.
-- This is the bridge between Order XIV (issues) and the evidence stage —
-- when the judge writes findings, they can see which evidence was tendered
-- against each issue.

CREATE TABLE public.evidence_issue_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  evidence_id UUID NOT NULL REFERENCES public.evidence_records(id) ON DELETE CASCADE,
  issue_id UUID NOT NULL REFERENCES public.case_issues(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  tagged_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (evidence_id, issue_id)
);

CREATE INDEX idx_evidence_issue_links_evidence ON public.evidence_issue_links(evidence_id);
CREATE INDEX idx_evidence_issue_links_issue ON public.evidence_issue_links(issue_id);
CREATE INDEX idx_evidence_issue_links_case ON public.evidence_issue_links(case_id);

ALTER TABLE public.evidence_issue_links ENABLE ROW LEVEL SECURITY;

-- Any party to the case or a court official can see the links.
CREATE POLICY "evidence_issue_links_select" ON public.evidence_issue_links
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = evidence_issue_links.case_id
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

-- Lawyers on the case and court officials can tag evidence to issues.
-- Either side's counsel tags their own evidence; the judge may retag.
CREATE POLICY "evidence_issue_links_insert" ON public.evidence_issue_links
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('trial_judge', 'admin_court', 'magistrate')
    OR (
      public.get_user_role() = 'lawyer'
      AND EXISTS (
        SELECT 1 FROM public.case_assignments ca
        WHERE ca.case_id = evidence_issue_links.case_id
          AND ca.lawyer_id = auth.uid()
          AND ca.status = 'accepted'
      )
    )
  );

-- Same set can remove tags.
CREATE POLICY "evidence_issue_links_delete" ON public.evidence_issue_links
  FOR DELETE USING (
    public.get_user_role() IN ('trial_judge', 'admin_court', 'magistrate')
    OR (
      public.get_user_role() = 'lawyer'
      AND EXISTS (
        SELECT 1 FROM public.case_assignments ca
        WHERE ca.case_id = evidence_issue_links.case_id
          AND ca.lawyer_id = auth.uid()
          AND ca.status = 'accepted'
      )
    )
  );
