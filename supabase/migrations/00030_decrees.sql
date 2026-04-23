-- Migration 00030: Decrees (CPC Order XX)
--
-- After a judgment is delivered the court must draw up a formal decree —
-- the enforceable instrument that names the decree-holder (the winning
-- party) and the judgment-debtor (the losing party), records the operative
-- relief, costs, and any time granted for compliance. The decree is what
-- the decree-holder executes when the judgment-debtor does not comply.

CREATE TYPE public.decree_type AS ENUM (
  'money',          -- Payment of a sum of money
  'possession',     -- Delivery of movable/immovable property
  'injunction',     -- Mandatory/prohibitory injunction
  'declaration',    -- Declaratory decree (no further action)
  'specific_performance',
  'partition',
  'dismissal',      -- Suit dismissed
  'compromise',     -- Recorded settlement
  'other'
);

CREATE TYPE public.decree_status AS ENUM (
  'drafted',
  'signed',
  'executed',
  'satisfied',
  'pending_execution'
);

CREATE TABLE public.decrees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  judgment_id UUID REFERENCES public.judgment_records(id) ON DELETE SET NULL,
  decree_number TEXT,
  decree_type public.decree_type NOT NULL,
  status public.decree_status NOT NULL DEFAULT 'drafted',
  -- Parties (copied from case at decree time so wording remains stable)
  decree_holder_id UUID REFERENCES public.profiles(id),
  judgment_debtor_id UUID REFERENCES public.profiles(id),
  -- Operative content
  operative_text TEXT NOT NULL,
  relief_granted TEXT,
  amount_awarded NUMERIC(14, 2),
  costs_awarded NUMERIC(14, 2),
  interest_terms TEXT,
  compliance_period_days INTEGER,
  -- Audit
  drawn_up_by UUID REFERENCES public.profiles(id),
  drawn_up_at TIMESTAMPTZ DEFAULT now(),
  signed_by UUID REFERENCES public.profiles(id),
  signed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_decrees_case ON public.decrees(case_id);
CREATE INDEX idx_decrees_judgment ON public.decrees(judgment_id);
CREATE INDEX idx_decrees_status ON public.decrees(status);
CREATE UNIQUE INDEX idx_decrees_one_per_case ON public.decrees(case_id);

ALTER TABLE public.decrees ENABLE ROW LEVEL SECURITY;

-- Parties to the case and court officials can read the decree.
CREATE POLICY "decrees_select" ON public.decrees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = decrees.case_id
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

-- Only the presiding judge / magistrate / admin_court may draw up a decree,
-- and only once a judgment has been delivered on the case.
CREATE POLICY "decrees_insert" ON public.decrees
  FOR INSERT WITH CHECK (
    public.get_user_role() IN ('trial_judge', 'admin_court', 'magistrate')
    AND EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = decrees.case_id
      AND c.status IN ('judgment_delivered', 'closed', 'disposed')
    )
  );

-- Court officials may update the decree until it is signed; after signing
-- the status can still advance (executed/satisfied) but operative text is
-- frozen by application logic.
CREATE POLICY "decrees_update" ON public.decrees
  FOR UPDATE USING (
    public.get_user_role() IN ('trial_judge', 'admin_court', 'magistrate')
  );
