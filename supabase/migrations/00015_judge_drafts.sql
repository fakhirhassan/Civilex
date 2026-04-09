-- ============================================================
-- Judge private drafts system
-- Only the authoring judge can view/edit their own drafts.
-- Drafts are invisible to all other users until published.
-- Publishing copies the draft as a regular document.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.judge_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  judge_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',

  -- Optional: attach to a specific hearing for context
  hearing_id UUID REFERENCES public.hearings(id) ON DELETE SET NULL,

  -- Lifecycle
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  -- Reference to the document record created on publish
  published_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_judge_drafts_case ON public.judge_drafts(case_id);
CREATE INDEX IF NOT EXISTS idx_judge_drafts_judge ON public.judge_drafts(judge_id);

-- Auto-update updated_at on every row change
CREATE OR REPLACE FUNCTION public.set_judge_draft_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_judge_drafts_updated_at ON public.judge_drafts;
CREATE TRIGGER trg_judge_drafts_updated_at
  BEFORE UPDATE ON public.judge_drafts
  FOR EACH ROW EXECUTE FUNCTION public.set_judge_draft_updated_at();

-- ============================================================
-- Row Level Security — only the authoring judge ever sees rows
-- ============================================================
ALTER TABLE public.judge_drafts ENABLE ROW LEVEL SECURITY;

-- SELECT: only the judge who wrote the draft
CREATE POLICY "judge_drafts_select_own" ON public.judge_drafts
  FOR SELECT USING (auth.uid() = judge_id);

-- INSERT: only magistrate or trial_judge roles, and they must set themselves as author
CREATE POLICY "judge_drafts_insert" ON public.judge_drafts
  FOR INSERT WITH CHECK (
    auth.uid() = judge_id
    AND get_user_role() IN ('magistrate', 'trial_judge')
  );

-- UPDATE: only the authoring judge, and only unpublished drafts
CREATE POLICY "judge_drafts_update_own" ON public.judge_drafts
  FOR UPDATE USING (
    auth.uid() = judge_id
    AND is_published = false
  );

-- DELETE: only the authoring judge, and only unpublished drafts
CREATE POLICY "judge_drafts_delete_own" ON public.judge_drafts
  FOR DELETE USING (
    auth.uid() = judge_id
    AND is_published = false
  );
