-- Phase 7: Trial Court Proceedings
-- witness_records, evidence tagging, judgment support

-- Witness status enum
CREATE TYPE public.witness_status AS ENUM (
  'listed',
  'summoned',
  'examined',
  'cross_examined',
  'recalled',
  'hostile',
  'excused'
);

-- Witness side enum
CREATE TYPE public.witness_side AS ENUM (
  'prosecution',
  'defense',
  'court'
);

-- Create witness_records table
CREATE TABLE public.witness_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  hearing_id UUID REFERENCES public.hearings(id) ON DELETE SET NULL,
  witness_name TEXT NOT NULL,
  witness_cnic TEXT,
  witness_contact TEXT,
  witness_address TEXT,
  witness_side witness_side NOT NULL DEFAULT 'prosecution',
  relation_to_case TEXT,
  statement TEXT,
  cross_examination TEXT,
  re_examination TEXT,
  judge_notes TEXT,
  status witness_status NOT NULL DEFAULT 'listed',
  examination_date DATE,
  added_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Evidence status enum
CREATE TYPE public.evidence_status AS ENUM (
  'submitted',
  'admitted',
  'objected',
  'rejected',
  'marked'
);

-- Create evidence_records table (links to documents but adds evidence-specific metadata)
CREATE TABLE public.evidence_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  exhibit_number TEXT,
  evidence_type TEXT NOT NULL DEFAULT 'documentary',
  description TEXT NOT NULL,
  submitted_by UUID REFERENCES public.profiles(id),
  submitted_by_side witness_side NOT NULL DEFAULT 'prosecution',
  status evidence_status NOT NULL DEFAULT 'submitted',
  admission_date DATE,
  objection_remarks TEXT,
  court_remarks TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Judgment records table
CREATE TABLE public.judgment_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  hearing_id UUID REFERENCES public.hearings(id) ON DELETE SET NULL,
  judgment_text TEXT NOT NULL,
  judgment_summary TEXT,
  verdict TEXT NOT NULL,
  relief_granted TEXT,
  costs_awarded TEXT,
  sentence_details TEXT,
  delivered_by UUID REFERENCES public.profiles(id),
  delivery_date DATE NOT NULL DEFAULT CURRENT_DATE,
  is_signed BOOLEAN DEFAULT false,
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_witness_records_case ON public.witness_records(case_id);
CREATE INDEX idx_witness_records_hearing ON public.witness_records(hearing_id);
CREATE INDEX idx_witness_records_status ON public.witness_records(status);
CREATE INDEX idx_evidence_records_case ON public.evidence_records(case_id);
CREATE INDEX idx_evidence_records_document ON public.evidence_records(document_id);
CREATE INDEX idx_evidence_records_status ON public.evidence_records(status);
CREATE INDEX idx_judgment_records_case ON public.judgment_records(case_id);

-- Triggers for updated_at
CREATE TRIGGER witness_records_updated_at
  BEFORE UPDATE ON public.witness_records
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER evidence_records_updated_at
  BEFORE UPDATE ON public.evidence_records
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER judgment_records_updated_at
  BEFORE UPDATE ON public.judgment_records
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.witness_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judgment_records ENABLE ROW LEVEL SECURITY;

-- RLS: witness_records
-- All case parties can view witnesses
CREATE POLICY "witness_records_select" ON public.witness_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = witness_records.case_id
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

-- Lawyers and court officials can add witnesses
CREATE POLICY "witness_records_insert" ON public.witness_records
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('lawyer', 'trial_judge', 'admin_court', 'magistrate')
  );

-- Judge/lawyers can update witness records
CREATE POLICY "witness_records_update" ON public.witness_records
  FOR UPDATE USING (
    public.get_user_role() IN ('lawyer', 'trial_judge', 'admin_court', 'magistrate', 'stenographer')
  );

-- RLS: evidence_records
-- All case parties can view evidence
CREATE POLICY "evidence_records_select" ON public.evidence_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = evidence_records.case_id
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

-- Lawyers can submit evidence
CREATE POLICY "evidence_records_insert" ON public.evidence_records
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('lawyer', 'trial_judge', 'admin_court')
  );

-- Judge can update evidence status (admit/reject)
CREATE POLICY "evidence_records_update" ON public.evidence_records
  FOR UPDATE USING (
    public.get_user_role() IN ('trial_judge', 'admin_court', 'magistrate')
  );

-- RLS: judgment_records
-- All case parties can view judgments
CREATE POLICY "judgment_records_select" ON public.judgment_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = judgment_records.case_id
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

-- Only judges can create judgments
CREATE POLICY "judgment_records_insert" ON public.judgment_records
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('trial_judge', 'admin_court', 'magistrate')
  );

-- Judges can update their own judgments
CREATE POLICY "judgment_records_update" ON public.judgment_records
  FOR UPDATE USING (
    delivered_by = auth.uid()
  );
