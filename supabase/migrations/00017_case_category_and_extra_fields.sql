-- ============================================================
-- Add case_category, plaintiff contact fields, defendant CNIC,
-- and criminal evidence_type to support the updated filing form.
-- ============================================================

-- Case category: narrows down the case type (sub-classification)
--   civil           → 'civil'
--   family          → 'family' | 'marriage_divorce' | 'frc' | 'documents' | 'affidavits'
--   criminal        → 'criminal'
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS case_category TEXT,
  -- Plaintiff contact details (the filing user's own info stored on the case)
  ADD COLUMN IF NOT EXISTS plaintiff_name    TEXT,
  ADD COLUMN IF NOT EXISTS plaintiff_phone   TEXT,
  ADD COLUMN IF NOT EXISTS plaintiff_cnic    TEXT,
  ADD COLUMN IF NOT EXISTS plaintiff_address TEXT,
  -- Defendant CNIC (phone/address already exist)
  ADD COLUMN IF NOT EXISTS defendant_cnic    TEXT,
  -- Marriage / divorce certificate reference
  ADD COLUMN IF NOT EXISTS marriage_certificate_number TEXT;

-- Criminal case details: evidence type
ALTER TABLE public.criminal_case_details
  ADD COLUMN IF NOT EXISTS evidence_type TEXT
    CHECK (evidence_type IN ('oral', 'documentary') OR evidence_type IS NULL);
