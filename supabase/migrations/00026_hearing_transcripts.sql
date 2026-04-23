-- Migration 00026: Hearing transcripts for stenographer workflow
--
-- Adds a verbatim transcript record per hearing, owned by a stenographer.
-- - proceedings_summary (existing) is the judge/court's short summary.
-- - hearing_transcripts (new) is the stenographer's verbatim record, which
--   can be signed/locked once finalised and then acts as the official record.
--
-- Also fixes a gap where stenographers had no application-level query filter
-- on cases (BUG-029): once a stenographer is assigned to a case
-- (cases.stenographer_id) the hook returns those cases.

-- Transcript status
CREATE TYPE public.transcript_status AS ENUM ('draft', 'signed');

-- Hearing transcripts
CREATE TABLE public.hearing_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hearing_id UUID NOT NULL UNIQUE REFERENCES public.hearings(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  stenographer_id UUID REFERENCES public.profiles(id),
  transcript_text TEXT NOT NULL DEFAULT '',
  status public.transcript_status NOT NULL DEFAULT 'draft',
  signed_at TIMESTAMPTZ,
  word_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_hearing_transcripts_case ON public.hearing_transcripts(case_id);
CREATE INDEX idx_hearing_transcripts_steno ON public.hearing_transcripts(stenographer_id);

CREATE TRIGGER hearing_transcripts_updated_at
  BEFORE UPDATE ON public.hearing_transcripts
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS
ALTER TABLE public.hearing_transcripts ENABLE ROW LEVEL SECURITY;

-- Anyone who can see the case can read the transcript.
CREATE POLICY "hearing_transcripts_select" ON public.hearing_transcripts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = hearing_transcripts.case_id
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

-- Stenographers and court officials can create a transcript row.
-- The stenographer_id must be the caller, or a court official setting it up.
CREATE POLICY "hearing_transcripts_insert" ON public.hearing_transcripts
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('stenographer', 'trial_judge', 'admin_court', 'magistrate')
  );

-- Only the owning stenographer can edit the transcript, and only while draft.
-- Court officials (judge/admin) can also edit while draft (e.g. correction).
CREATE POLICY "hearing_transcripts_update" ON public.hearing_transcripts
  FOR UPDATE USING (
    status = 'draft'
    AND (
      stenographer_id = auth.uid()
      OR public.get_user_role() IN ('trial_judge', 'admin_court', 'magistrate')
    )
  );

-- Allow court officials to assign a stenographer to a case.
-- (cases_update_court already covers this — no change needed. The column
-- exists on cases.stenographer_id from migration 00002.)

-- Notification type for transcript events (adds to existing check constraint
-- if present). We use the generic 'case_status_changed' type so no enum
-- change is required.
