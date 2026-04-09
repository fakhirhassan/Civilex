-- ============================================================
-- Defendant onboarding workflow
-- ============================================================

-- Document requests table: lawyers ask clients for specific documents
CREATE TABLE IF NOT EXISTS public.document_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.profiles(id),   -- lawyer
  requested_from UUID NOT NULL REFERENCES public.profiles(id), -- client (defendant or plaintiff)
  document_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'fulfilled', 'cancelled')),
  fulfilled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_doc_requests_case ON public.document_requests(case_id);
CREATE INDEX IF NOT EXISTS idx_doc_requests_from ON public.document_requests(requested_from);
CREATE INDEX IF NOT EXISTS idx_doc_requests_by ON public.document_requests(requested_by);

-- RLS for document requests
ALTER TABLE public.document_requests ENABLE ROW LEVEL SECURITY;

-- Lawyers see requests they made
CREATE POLICY "doc_requests_select_lawyer" ON public.document_requests
  FOR SELECT USING (auth.uid() = requested_by);

-- Clients see requests addressed to them
CREATE POLICY "doc_requests_select_client" ON public.document_requests
  FOR SELECT USING (auth.uid() = requested_from);

-- Court officials see all
CREATE POLICY "doc_requests_select_court" ON public.document_requests
  FOR SELECT USING (get_user_role() IN ('admin_court', 'magistrate', 'trial_judge'));

-- Lawyers can insert document requests
CREATE POLICY "doc_requests_insert" ON public.document_requests
  FOR INSERT WITH CHECK (auth.uid() = requested_by);

-- Lawyers can cancel their own requests; clients can mark fulfilled
CREATE POLICY "doc_requests_update" ON public.document_requests
  FOR UPDATE USING (
    auth.uid() = requested_by OR auth.uid() = requested_from
  );

-- Add document_requested notification type
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'document_requested';

-- Add a token column to cases for defendant self-linking via summon link
-- The token is included in the summon URL so the defendant can claim the case
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS defendant_claim_token TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS defendant_claim_expires_at TIMESTAMPTZ;
