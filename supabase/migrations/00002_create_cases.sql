-- Create case type enum
CREATE TYPE public.case_type AS ENUM ('civil', 'criminal');

-- Create case status enum
CREATE TYPE public.case_status AS ENUM (
  'draft',
  'pending_lawyer_acceptance',
  'lawyer_accepted',
  'payment_pending',
  'payment_confirmed',
  'drafting',
  'submitted_to_admin',
  'under_scrutiny',
  'returned_for_revision',
  'registered',
  'summon_issued',
  'preliminary_hearing',
  'issues_framed',
  'transferred_to_trial',
  'evidence_stage',
  'arguments',
  'reserved_for_judgment',
  'judgment_delivered',
  'closed',
  'disposed'
);

-- Create document type enum
CREATE TYPE public.document_type AS ENUM (
  'plaint',
  'written_statement',
  'affidavit',
  'evidence',
  'court_order',
  'judgment',
  'application',
  'fir_copy',
  'power_of_attorney',
  'vakalatnama',
  'other'
);

-- Create assignment status enum
CREATE TYPE public.assignment_status AS ENUM (
  'pending',
  'accepted',
  'declined'
);

-- Create assignment side enum
CREATE TYPE public.assignment_side AS ENUM (
  'plaintiff',
  'defendant'
);

-- Cases table
CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number TEXT NOT NULL UNIQUE,
  case_type public.case_type NOT NULL,
  status public.case_status DEFAULT 'draft' NOT NULL,
  title TEXT NOT NULL,
  description TEXT,

  -- Parties
  plaintiff_id UUID REFERENCES public.profiles(id),
  defendant_id UUID REFERENCES public.profiles(id),

  -- Court assignment
  admin_court_id UUID REFERENCES public.profiles(id),
  trial_judge_id UUID REFERENCES public.profiles(id),
  stenographer_id UUID REFERENCES public.profiles(id),

  -- Case details
  current_phase TEXT DEFAULT 'filing',
  sensitivity TEXT DEFAULT 'normal' CHECK (sensitivity IN ('normal', 'sensitive', 'highly_sensitive')),
  filing_date TIMESTAMPTZ,
  registration_date TIMESTAMPTZ,
  next_hearing_date TIMESTAMPTZ,
  disposal_date TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Criminal case details (additional info for criminal cases)
CREATE TABLE public.criminal_case_details (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL UNIQUE REFERENCES public.cases(id) ON DELETE CASCADE,
  fir_number TEXT,
  police_station TEXT,
  offense_description TEXT,
  offense_section TEXT,
  io_name TEXT,
  io_contact TEXT,
  bail_status TEXT DEFAULT 'not_applicable' CHECK (bail_status IN ('not_applicable', 'applied', 'granted', 'denied', 'cancelled')),
  arrest_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Case assignments (lawyer-client relationships)
CREATE TABLE public.case_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  lawyer_id UUID NOT NULL REFERENCES public.profiles(id),
  client_id UUID NOT NULL REFERENCES public.profiles(id),
  side public.assignment_side NOT NULL,
  status public.assignment_status DEFAULT 'pending' NOT NULL,
  fee_amount NUMERIC(12, 2),
  allow_installments BOOLEAN DEFAULT false,
  installment_count INTEGER DEFAULT 1,
  decline_reason TEXT,
  assigned_at TIMESTAMPTZ DEFAULT now(),
  responded_at TIMESTAMPTZ
);

-- Documents table
CREATE TABLE public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
  document_type public.document_type NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT,

  -- Signing metadata
  is_signed BOOLEAN DEFAULT false,
  signed_by UUID REFERENCES public.profiles(id),
  signed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Case activity log (immutable audit trail)
CREATE TABLE public.case_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_cases_plaintiff ON public.cases(plaintiff_id);
CREATE INDEX idx_cases_defendant ON public.cases(defendant_id);
CREATE INDEX idx_cases_status ON public.cases(status);
CREATE INDEX idx_cases_type ON public.cases(case_type);
CREATE INDEX idx_cases_admin_court ON public.cases(admin_court_id);
CREATE INDEX idx_cases_trial_judge ON public.cases(trial_judge_id);
CREATE INDEX idx_case_assignments_case ON public.case_assignments(case_id);
CREATE INDEX idx_case_assignments_lawyer ON public.case_assignments(lawyer_id);
CREATE INDEX idx_case_assignments_client ON public.case_assignments(client_id);
CREATE INDEX idx_documents_case ON public.documents(case_id);
CREATE INDEX idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX idx_case_activity_log_case ON public.case_activity_log(case_id);

-- Auto-update updated_at trigger for cases
CREATE TRIGGER cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criminal_case_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_activity_log ENABLE ROW LEVEL SECURITY;

-- ========== Cases RLS ==========

-- Clients can view their own cases (as plaintiff or defendant)
CREATE POLICY "cases_select_own" ON public.cases
  FOR SELECT USING (
    auth.uid() = plaintiff_id
    OR auth.uid() = defendant_id
  );

-- Lawyers can view cases assigned to them
CREATE POLICY "cases_select_assigned_lawyer" ON public.cases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.case_assignments ca
      WHERE ca.case_id = id AND ca.lawyer_id = auth.uid()
    )
  );

-- Court officials can view all cases
CREATE POLICY "cases_select_court" ON public.cases
  FOR SELECT USING (
    get_user_role() IN ('admin_court', 'magistrate', 'trial_judge', 'stenographer')
  );

-- Clients can create (insert) cases
CREATE POLICY "cases_insert_client" ON public.cases
  FOR INSERT WITH CHECK (
    auth.uid() = plaintiff_id
    AND get_user_role() = 'client'
  );

-- Clients can update their own draft cases
CREATE POLICY "cases_update_own_draft" ON public.cases
  FOR UPDATE USING (
    auth.uid() = plaintiff_id
    AND status = 'draft'
  );

-- Lawyers can update assigned cases (for status transitions)
CREATE POLICY "cases_update_lawyer" ON public.cases
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.case_assignments ca
      WHERE ca.case_id = id AND ca.lawyer_id = auth.uid() AND ca.status = 'accepted'
    )
  );

-- Court officials can update cases
CREATE POLICY "cases_update_court" ON public.cases
  FOR UPDATE USING (
    get_user_role() IN ('admin_court', 'magistrate', 'trial_judge')
  );

-- ========== Criminal Case Details RLS ==========

-- Same visibility as parent case
CREATE POLICY "criminal_details_select" ON public.criminal_case_details
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_id AND (
        c.plaintiff_id = auth.uid()
        OR c.defendant_id = auth.uid()
        OR get_user_role() IN ('admin_court', 'magistrate', 'trial_judge', 'stenographer')
        OR EXISTS (
          SELECT 1 FROM public.case_assignments ca
          WHERE ca.case_id = c.id AND ca.lawyer_id = auth.uid()
        )
      )
    )
  );

-- Only plaintiff (case creator) can insert criminal details
CREATE POLICY "criminal_details_insert" ON public.criminal_case_details
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_id AND c.plaintiff_id = auth.uid()
    )
  );

-- ========== Case Assignments RLS ==========

-- Parties involved can view assignments
CREATE POLICY "assignments_select" ON public.case_assignments
  FOR SELECT USING (
    auth.uid() = lawyer_id
    OR auth.uid() = client_id
    OR get_user_role() IN ('admin_court', 'magistrate', 'trial_judge')
  );

-- Clients can create assignments (request lawyer)
CREATE POLICY "assignments_insert_client" ON public.case_assignments
  FOR INSERT WITH CHECK (
    auth.uid() = client_id
    AND get_user_role() = 'client'
  );

-- Lawyers can update their own assignments (accept/decline)
CREATE POLICY "assignments_update_lawyer" ON public.case_assignments
  FOR UPDATE USING (
    auth.uid() = lawyer_id
  );

-- ========== Documents RLS ==========

-- Case parties can view documents
CREATE POLICY "documents_select" ON public.documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_id AND (
        c.plaintiff_id = auth.uid()
        OR c.defendant_id = auth.uid()
        OR get_user_role() IN ('admin_court', 'magistrate', 'trial_judge', 'stenographer')
        OR EXISTS (
          SELECT 1 FROM public.case_assignments ca
          WHERE ca.case_id = c.id AND ca.lawyer_id = auth.uid()
        )
      )
    )
  );

-- Authenticated users can upload documents to their cases
CREATE POLICY "documents_insert" ON public.documents
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by
    AND EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_id AND (
        c.plaintiff_id = auth.uid()
        OR c.defendant_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.case_assignments ca
          WHERE ca.case_id = c.id AND ca.lawyer_id = auth.uid()
        )
      )
    )
  );

-- ========== Activity Log RLS ==========

-- Case parties and court can view activity log
CREATE POLICY "activity_log_select" ON public.case_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = case_id AND (
        c.plaintiff_id = auth.uid()
        OR c.defendant_id = auth.uid()
        OR get_user_role() IN ('admin_court', 'magistrate', 'trial_judge', 'stenographer')
        OR EXISTS (
          SELECT 1 FROM public.case_assignments ca
          WHERE ca.case_id = c.id AND ca.lawyer_id = auth.uid()
        )
      )
    )
  );

-- Only system/authenticated users can insert activity (via server-side)
CREATE POLICY "activity_log_insert" ON public.case_activity_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================
-- Storage Bucket for Case Documents
-- ============================================================
-- Note: Run these in the Supabase dashboard SQL editor:
--
-- INSERT INTO storage.buckets (id, name, public) VALUES ('case-documents', 'case-documents', false);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('evidence', 'evidence', false);
--
-- Storage RLS policies (run in dashboard):
--
-- CREATE POLICY "case_docs_select" ON storage.objects
--   FOR SELECT USING (
--     bucket_id = 'case-documents'
--     AND auth.uid() IS NOT NULL
--   );
--
-- CREATE POLICY "case_docs_insert" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'case-documents'
--     AND auth.uid() IS NOT NULL
--   );
--
-- CREATE POLICY "evidence_select" ON storage.objects
--   FOR SELECT USING (
--     bucket_id = 'evidence'
--     AND auth.uid() IS NOT NULL
--   );
--
-- CREATE POLICY "evidence_insert" ON storage.objects
--   FOR INSERT WITH CHECK (
--     bucket_id = 'evidence'
--     AND auth.uid() IS NOT NULL
--   );

-- ============================================================
-- Helper: Generate next case number
-- ============================================================
CREATE OR REPLACE FUNCTION public.generate_case_number(p_case_type public.case_type)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  seq INTEGER;
BEGIN
  prefix := CASE p_case_type WHEN 'civil' THEN 'CIV' WHEN 'criminal' THEN 'CRM' END;
  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(case_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO seq
  FROM public.cases
  WHERE case_type = p_case_type
    AND SPLIT_PART(case_number, '-', 2) = EXTRACT(YEAR FROM now())::TEXT;

  RETURN prefix || '-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
