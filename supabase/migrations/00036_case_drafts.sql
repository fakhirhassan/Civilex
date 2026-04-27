-- Migration 00036: Case drafts (lawyer's working plaint before submission)
--
-- During the 'drafting' / 'returned_for_revision' stages the lawyer composes
-- the plaint section by section. The resulting draft is stored here so the
-- admin court can scrutinise it section by section and return for revision
-- with comments. Only one active draft per case.

CREATE TYPE public.draft_status AS ENUM (
  'in_progress',   -- Lawyer is editing
  'submitted',     -- Sent to admin court for scrutiny
  'returned',      -- Admin court returned with revision notes
  'approved'       -- Admin court approved (case_status moves on independently)
);

CREATE TABLE public.case_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL UNIQUE REFERENCES public.cases(id) ON DELETE CASCADE,

  -- Section content (free-text). Lawyer fills these in.
  cause_title TEXT NOT NULL DEFAULT '',
  parties_block TEXT NOT NULL DEFAULT '',
  suit_subject TEXT NOT NULL DEFAULT '',          -- e.g., "SUIT FOR RECOVERY OF MAINTENANCE"
  jurisdiction_clause TEXT NOT NULL DEFAULT '',
  facts JSONB NOT NULL DEFAULT '[]'::jsonb,        -- [{ number: 1, text: "..." }, ...]
  cause_of_action TEXT NOT NULL DEFAULT '',
  limitation_clause TEXT NOT NULL DEFAULT '',
  court_fees_paid TEXT NOT NULL DEFAULT '',
  reliefs_sought TEXT NOT NULL DEFAULT '',
  verification_clause TEXT NOT NULL DEFAULT '',

  status public.draft_status NOT NULL DEFAULT 'in_progress',
  revision_notes TEXT,                             -- Admin court's reasons when returned
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,

  created_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_case_drafts_status ON public.case_drafts(status);

CREATE TRIGGER case_drafts_updated_at
  BEFORE UPDATE ON public.case_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.case_drafts ENABLE ROW LEVEL SECURITY;

-- Lawyer assigned to the case (or court officials) can read.
CREATE POLICY "case_drafts_select" ON public.case_drafts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_drafts.case_id
      AND (
        c.plaintiff_id = auth.uid()
        OR c.defendant_id = auth.uid()
        OR c.admin_court_id = auth.uid()
        OR c.trial_judge_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.case_assignments ca
          WHERE ca.case_id = c.id AND ca.lawyer_id = auth.uid() AND ca.status = 'accepted'
        )
      )
    )
    OR public.get_user_role() IN ('admin_court', 'trial_judge', 'magistrate')
  );

-- Only the assigned lawyer can insert a draft for the case, and only while
-- the case is in a draftable status.
CREATE POLICY "case_drafts_insert" ON public.case_drafts
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_drafts.case_id
      AND c.status IN ('payment_confirmed', 'drafting', 'returned_for_revision')
      AND EXISTS (
        SELECT 1 FROM public.case_assignments ca
        WHERE ca.case_id = c.id AND ca.lawyer_id = auth.uid() AND ca.status = 'accepted'
      )
    )
  );

-- Lawyer can update while draft is in_progress or returned.
CREATE POLICY "case_drafts_update_lawyer" ON public.case_drafts
  FOR UPDATE USING (
    status IN ('in_progress', 'returned')
    AND EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_drafts.case_id
      AND EXISTS (
        SELECT 1 FROM public.case_assignments ca
        WHERE ca.case_id = c.id AND ca.lawyer_id = auth.uid() AND ca.status = 'accepted'
      )
    )
  );

-- Court officials can update status (approve / return) any time.
CREATE POLICY "case_drafts_update_court" ON public.case_drafts
  FOR UPDATE USING (
    public.get_user_role() IN ('admin_court', 'trial_judge', 'magistrate')
  );
