-- =============================================
-- Phase 5: Admin Court Module
-- Tables: scrutiny_checklist, hearings, order_sheets
-- =============================================

-- Enums
CREATE TYPE public.scrutiny_decision AS ENUM ('pending', 'approved', 'returned');

CREATE TYPE public.hearing_type AS ENUM (
  'preliminary', 'regular', 'arguments', 'judgment', 'bail', 'miscellaneous'
);

CREATE TYPE public.hearing_status AS ENUM (
  'scheduled', 'in_progress', 'completed', 'adjourned', 'cancelled'
);

CREATE TYPE public.order_type AS ENUM (
  'interim', 'final', 'adjournment', 'summon', 'bail', 'transfer', 'miscellaneous'
);

-- =============================================
-- 1. Scrutiny Checklist
-- =============================================
CREATE TABLE public.scrutiny_checklist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  reviewed_by UUID NOT NULL REFERENCES public.profiles(id),

  -- 7 verification checks
  proper_documentation BOOLEAN DEFAULT false NOT NULL,
  court_fees_paid BOOLEAN DEFAULT false NOT NULL,
  jurisdiction_verified BOOLEAN DEFAULT false NOT NULL,
  parties_identified BOOLEAN DEFAULT false NOT NULL,
  cause_of_action_valid BOOLEAN DEFAULT false NOT NULL,
  limitation_period_checked BOOLEAN DEFAULT false NOT NULL,
  proper_format BOOLEAN DEFAULT false NOT NULL,

  decision public.scrutiny_decision DEFAULT 'pending' NOT NULL,
  remarks TEXT,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scrutiny_case ON public.scrutiny_checklist(case_id);
CREATE INDEX idx_scrutiny_reviewer ON public.scrutiny_checklist(reviewed_by);
CREATE INDEX idx_scrutiny_decision ON public.scrutiny_checklist(decision);

-- =============================================
-- 2. Hearings
-- =============================================
CREATE TABLE public.hearings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  hearing_number INT NOT NULL DEFAULT 1,

  hearing_type public.hearing_type DEFAULT 'regular' NOT NULL,
  scheduled_date TIMESTAMPTZ NOT NULL,
  actual_date TIMESTAMPTZ,

  presiding_officer_id UUID REFERENCES public.profiles(id),
  courtroom TEXT,

  proceedings_summary TEXT,   -- stenographer writes this
  judge_remarks TEXT,

  next_hearing_date TIMESTAMPTZ,
  status public.hearing_status DEFAULT 'scheduled' NOT NULL,

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_hearings_case ON public.hearings(case_id);
CREATE INDEX idx_hearings_date ON public.hearings(scheduled_date);
CREATE INDEX idx_hearings_officer ON public.hearings(presiding_officer_id);
CREATE INDEX idx_hearings_status ON public.hearings(status);

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_hearings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER hearings_updated_at
  BEFORE UPDATE ON public.hearings
  FOR EACH ROW EXECUTE FUNCTION public.update_hearings_updated_at();

-- =============================================
-- 3. Order Sheets
-- =============================================
CREATE TABLE public.order_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hearing_id UUID REFERENCES public.hearings(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,

  order_type public.order_type DEFAULT 'miscellaneous' NOT NULL,
  order_text TEXT NOT NULL,
  issued_by UUID NOT NULL REFERENCES public.profiles(id),

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_orders_hearing ON public.order_sheets(hearing_id);
CREATE INDEX idx_orders_case ON public.order_sheets(case_id);
CREATE INDEX idx_orders_issued_by ON public.order_sheets(issued_by);

-- =============================================
-- RLS Policies
-- =============================================

-- Scrutiny Checklist
ALTER TABLE public.scrutiny_checklist ENABLE ROW LEVEL SECURITY;

-- Admin court can do everything
CREATE POLICY "scrutiny_admin_court_all" ON public.scrutiny_checklist
  FOR ALL USING (
    public.get_user_role() IN ('admin_court', 'magistrate')
  );

-- Case parties can read scrutiny results
CREATE POLICY "scrutiny_case_parties_select" ON public.scrutiny_checklist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = scrutiny_checklist.case_id
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

-- Hearings
ALTER TABLE public.hearings ENABLE ROW LEVEL SECURITY;

-- Court officials can manage hearings
CREATE POLICY "hearings_court_officials_all" ON public.hearings
  FOR ALL USING (
    public.get_user_role() IN ('admin_court', 'magistrate', 'trial_judge', 'stenographer')
  );

-- Case parties can view hearings
CREATE POLICY "hearings_case_parties_select" ON public.hearings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = hearings.case_id
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

-- Order Sheets
ALTER TABLE public.order_sheets ENABLE ROW LEVEL SECURITY;

-- Court officials can create and manage orders
CREATE POLICY "orders_court_officials_all" ON public.order_sheets
  FOR ALL USING (
    public.get_user_role() IN ('admin_court', 'magistrate', 'trial_judge')
  );

-- Case parties can view orders
CREATE POLICY "orders_case_parties_select" ON public.order_sheets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = order_sheets.case_id
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

-- Stenographer can view orders (for proceedings reference)
CREATE POLICY "orders_stenographer_select" ON public.order_sheets
  FOR SELECT USING (
    public.get_user_role() = 'stenographer'
  );
