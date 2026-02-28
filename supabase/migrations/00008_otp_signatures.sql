-- Phase 8: Digital Signatures (OTP-based)
-- otp_signatures audit table for tracking all signing events

-- Create otp_signatures table
CREATE TABLE public.otp_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What is being signed
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  judgment_id UUID REFERENCES public.judgment_records(id) ON DELETE SET NULL,
  entity_type TEXT NOT NULL, -- 'document' or 'judgment'

  -- Who signed
  signer_id UUID NOT NULL REFERENCES public.profiles(id),
  signer_role TEXT NOT NULL,

  -- OTP verification
  otp_hash TEXT NOT NULL,
  otp_verified BOOLEAN DEFAULT false,
  otp_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  otp_verified_at TIMESTAMPTZ,
  otp_expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,

  -- Audit metadata
  ip_address TEXT,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Add signed_by to judgment_records (missing from Phase 7)
ALTER TABLE public.judgment_records
  ADD COLUMN IF NOT EXISTS signed_by UUID REFERENCES public.profiles(id);

-- Indexes
CREATE INDEX idx_otp_signatures_document ON public.otp_signatures(document_id);
CREATE INDEX idx_otp_signatures_judgment ON public.otp_signatures(judgment_id);
CREATE INDEX idx_otp_signatures_signer ON public.otp_signatures(signer_id);
CREATE INDEX idx_otp_signatures_verified ON public.otp_signatures(otp_verified);

-- Enable RLS
ALTER TABLE public.otp_signatures ENABLE ROW LEVEL SECURITY;

-- Users can view their own signature records
CREATE POLICY "otp_signatures_select_own" ON public.otp_signatures
  FOR SELECT USING (signer_id = auth.uid());

-- Court officials can view all signature records for audit
CREATE POLICY "otp_signatures_select_officials" ON public.otp_signatures
  FOR SELECT USING (
    public.get_user_role() IN ('admin_court', 'trial_judge', 'magistrate')
  );

-- Case parties can view signatures for documents in their cases
CREATE POLICY "otp_signatures_select_case_parties" ON public.otp_signatures
  FOR SELECT USING (
    document_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.documents d
      JOIN public.cases c ON c.id = d.case_id
      WHERE d.id = otp_signatures.document_id
      AND (
        c.plaintiff_id = auth.uid()
        OR c.defendant_id = auth.uid()
        OR c.admin_court_id = auth.uid()
        OR c.trial_judge_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.case_assignments ca
          WHERE ca.case_id = c.id AND ca.lawyer_id = auth.uid()
        )
      )
    )
  );

-- Authenticated users can create signature records (via OTP flow)
CREATE POLICY "otp_signatures_insert" ON public.otp_signatures
  FOR INSERT WITH CHECK (signer_id = auth.uid());

-- Users can update their own unverified signatures (for OTP verification)
CREATE POLICY "otp_signatures_update" ON public.otp_signatures
  FOR UPDATE USING (
    signer_id = auth.uid() AND otp_verified = false
  );
