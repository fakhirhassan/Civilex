-- Migration 00031: Appeals (CPC Section 96, Order XLI)
--
-- Any party aggrieved by a decree may prefer an appeal to the court
-- authorised to hear appeals from the decisions of the deciding court.
-- The aggrieved party (the appellant) files a memorandum of appeal within
-- the limitation period (30 days to District Court, 90 days to High Court
-- under the Limitation Act 1908). The respondent is the other party.
-- This table records the appeal filing; the appellate proceedings proper
-- live on the new case row that the registrar opens from it.

CREATE TYPE public.appeal_forum AS ENUM (
  'district_court',   -- First appeal from subordinate civil court
  'high_court',       -- First/second appeal lies to High Court
  'supreme_court'     -- Appeal from High Court judgments
);

CREATE TYPE public.appeal_side AS ENUM (
  'plaintiff',        -- Original plaintiff is appealing (lost or partially lost)
  'defendant'         -- Original defendant is appealing
);

CREATE TYPE public.appeal_status AS ENUM (
  'filed',            -- Memorandum filed, awaiting admission
  'admitted',         -- Court admitted the appeal and issued notice
  'rejected',         -- Summarily rejected under Order XLI Rule 11
  'dismissed',        -- Dismissed after hearing (appeal fails)
  'allowed',          -- Appeal succeeds, decree set aside/modified
  'withdrawn',        -- Appellant withdrew
  'time_barred'       -- Rejected for being filed beyond limitation
);

CREATE TABLE public.appeals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  decree_id UUID REFERENCES public.decrees(id) ON DELETE SET NULL,
  judgment_id UUID REFERENCES public.judgment_records(id) ON DELETE SET NULL,

  appeal_number TEXT,
  appellate_forum public.appeal_forum NOT NULL,
  appellant_side public.appeal_side NOT NULL,

  -- Parties for the appeal (usually mirror the case, but recorded here so
  -- later profile changes do not rewrite history)
  appellant_id UUID NOT NULL REFERENCES public.profiles(id),
  respondent_id UUID REFERENCES public.profiles(id),

  -- Limitation tracking
  judgment_date DATE NOT NULL,          -- Date the impugned judgment was delivered
  limitation_days INTEGER NOT NULL,     -- 30 / 90 / as applicable
  filed_on DATE NOT NULL DEFAULT CURRENT_DATE,
  is_time_barred BOOLEAN GENERATED ALWAYS AS (
    (filed_on - judgment_date) > limitation_days
  ) STORED,
  condonation_requested BOOLEAN NOT NULL DEFAULT false,
  condonation_reason TEXT,

  -- Memorandum of appeal
  grounds_of_appeal TEXT NOT NULL,      -- Numbered grounds under Order XLI Rule 1
  relief_sought TEXT NOT NULL,

  -- Lifecycle
  status public.appeal_status NOT NULL DEFAULT 'filed',
  admitted_at TIMESTAMPTZ,
  admitted_by UUID REFERENCES public.profiles(id),
  disposal_date TIMESTAMPTZ,
  disposal_reason TEXT,

  -- Audit
  filed_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_appeals_case ON public.appeals(case_id);
CREATE INDEX idx_appeals_decree ON public.appeals(decree_id);
CREATE INDEX idx_appeals_status ON public.appeals(status);
CREATE INDEX idx_appeals_appellant ON public.appeals(appellant_id);

CREATE TRIGGER appeals_updated_at
  BEFORE UPDATE ON public.appeals
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.appeals ENABLE ROW LEVEL SECURITY;

-- Parties to the underlying case and court officials can view appeals.
CREATE POLICY "appeals_select" ON public.appeals
  FOR SELECT USING (
    appellant_id = auth.uid()
    OR respondent_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = appeals.case_id
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

-- An appeal may be filed by the aggrieved party themselves (a client who was
-- plaintiff or defendant on the case) or by their engaged lawyer.
-- The underlying case must have a delivered judgment.
CREATE POLICY "appeals_insert" ON public.appeals
  FOR INSERT WITH CHECK (
    filed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = appeals.case_id
      AND c.status IN ('judgment_delivered', 'closed', 'disposed')
      AND (
        c.plaintiff_id = auth.uid()
        OR c.defendant_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.case_assignments ca
          WHERE ca.case_id = c.id
            AND ca.lawyer_id = auth.uid()
            AND ca.status = 'accepted'
        )
      )
    )
  );

-- Appellants may edit the memorandum while it is still in 'filed' state
-- (i.e., before the appellate court has admitted it).
CREATE POLICY "appeals_update_appellant" ON public.appeals
  FOR UPDATE USING (
    appellant_id = auth.uid()
    AND status = 'filed'
  );

-- Court officials can advance status (admit / reject / dispose).
CREATE POLICY "appeals_update_court" ON public.appeals
  FOR UPDATE USING (
    public.get_user_role() IN ('admin_court', 'trial_judge', 'magistrate')
  );
