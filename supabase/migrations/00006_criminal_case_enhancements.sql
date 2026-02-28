-- Phase 6: Criminal Case Flow Enhancements
-- Adds bail applications table, IO investigation tracking, and magistrate-specific features

-- =============================================================
-- 1. Bail Applications Table
-- =============================================================
CREATE TABLE public.bail_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  applicant_id UUID NOT NULL REFERENCES public.profiles(id),
  lawyer_id UUID REFERENCES public.profiles(id),

  application_type TEXT NOT NULL DEFAULT 'regular' CHECK (application_type IN ('pre_arrest', 'post_arrest', 'regular', 'interim')),
  grounds TEXT NOT NULL,
  surety_details TEXT,
  surety_amount NUMERIC(12, 2),

  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'hearing_scheduled', 'granted', 'denied', 'cancelled', 'withdrawn')),
  decision_date TIMESTAMPTZ,
  decision_remarks TEXT,
  decided_by UUID REFERENCES public.profiles(id),

  conditions TEXT,
  hearing_id UUID REFERENCES public.hearings(id),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.bail_applications ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- 2. IO Investigation Reports Table
-- =============================================================
CREATE TABLE public.investigation_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  submitted_by UUID NOT NULL REFERENCES public.profiles(id),

  report_type TEXT NOT NULL DEFAULT 'progress' CHECK (report_type IN ('initial', 'progress', 'final', 'supplementary')),
  report_text TEXT NOT NULL,
  findings TEXT,
  recommendations TEXT,
  evidence_collected TEXT,

  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'reviewed', 'accepted', 'returned')),
  reviewed_by UUID REFERENCES public.profiles(id),
  review_remarks TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.investigation_reports ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- 3. Add columns to criminal_case_details
-- =============================================================
ALTER TABLE public.criminal_case_details
  ADD COLUMN IF NOT EXISTS investigation_status TEXT DEFAULT 'pending'
    CHECK (investigation_status IN ('pending', 'in_progress', 'completed', 'report_submitted')),
  ADD COLUMN IF NOT EXISTS challan_submitted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS challan_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS magistrate_remarks TEXT,
  ADD COLUMN IF NOT EXISTS next_io_report_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- =============================================================
-- 4. Indexes
-- =============================================================
CREATE INDEX IF NOT EXISTS idx_bail_applications_case ON public.bail_applications(case_id);
CREATE INDEX IF NOT EXISTS idx_bail_applications_status ON public.bail_applications(status);
CREATE INDEX IF NOT EXISTS idx_bail_applications_applicant ON public.bail_applications(applicant_id);
CREATE INDEX IF NOT EXISTS idx_investigation_reports_case ON public.investigation_reports(case_id);

-- =============================================================
-- 5. RLS Policies for bail_applications
-- =============================================================

-- Case parties can view bail applications for their cases
CREATE POLICY "bail_view_case_parties" ON public.bail_applications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = bail_applications.case_id
      AND (
        c.plaintiff_id = auth.uid()
        OR c.defendant_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.case_assignments ca
          WHERE ca.case_id = c.id AND ca.lawyer_id = auth.uid()
        )
      )
    )
    OR public.get_user_role() IN ('admin_court', 'magistrate', 'trial_judge')
  );

-- Lawyers and clients can create bail applications
CREATE POLICY "bail_create" ON public.bail_applications
  FOR INSERT WITH CHECK (
    applicant_id = auth.uid()
    OR public.get_user_role() IN ('lawyer')
  );

-- Court officials can update bail applications (for decisions)
CREATE POLICY "bail_update_court" ON public.bail_applications
  FOR UPDATE USING (
    public.get_user_role() IN ('admin_court', 'magistrate', 'trial_judge')
  );

-- =============================================================
-- 6. RLS Policies for investigation_reports
-- =============================================================

-- Court officials and case parties can view investigation reports
CREATE POLICY "ir_view" ON public.investigation_reports
  FOR SELECT USING (
    submitted_by = auth.uid()
    OR public.get_user_role() IN ('admin_court', 'magistrate', 'trial_judge')
    OR EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = investigation_reports.case_id
      AND (
        c.plaintiff_id = auth.uid()
        OR c.defendant_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.case_assignments ca
          WHERE ca.case_id = c.id AND ca.lawyer_id = auth.uid()
        )
      )
    )
  );

-- Anyone authenticated can submit investigation reports
CREATE POLICY "ir_create" ON public.investigation_reports
  FOR INSERT WITH CHECK (
    submitted_by = auth.uid()
  );

-- Court officials can update (review) investigation reports
CREATE POLICY "ir_update_court" ON public.investigation_reports
  FOR UPDATE USING (
    public.get_user_role() IN ('admin_court', 'magistrate', 'trial_judge')
  );

-- =============================================================
-- 7. Updated_at trigger for bail_applications
-- =============================================================
CREATE TRIGGER bail_applications_updated_at
  BEFORE UPDATE ON public.bail_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =============================================================
-- 8. Updated_at trigger for criminal_case_details
-- =============================================================
CREATE TRIGGER criminal_case_details_updated_at
  BEFORE UPDATE ON public.criminal_case_details
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
