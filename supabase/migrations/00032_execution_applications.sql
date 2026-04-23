-- Migration 00032: Execution of Decree (CPC Order XXI)
--
-- Once a decree is drawn up and signed, the decree-holder may apply to the
-- court for execution if the judgment-debtor does not comply within the
-- compliance period. Order XXI governs the modes of execution: attachment
-- and sale of property (movable or immovable), delivery of possession,
-- arrest and detention of the judgment-debtor, appointment of a receiver,
-- or any other mode the court directs. The court issues warrants and
-- ultimately records satisfaction when the decree is fully executed.

CREATE TYPE public.execution_mode AS ENUM (
  'attachment_movable',     -- Order XXI Rule 43 — attachment of movable property
  'attachment_immovable',   -- Order XXI Rule 54 — attachment of immovable property
  'sale_movable',           -- Order XXI Rule 64-78 — sale after attachment
  'sale_immovable',         -- Order XXI Rule 82-94 — sale of immovable
  'delivery_possession',    -- Order XXI Rule 35-36 — delivery of property
  'arrest_detention',       -- Order XXI Rule 37-40 — civil prison
  'appoint_receiver',       -- Order XL — receiver appointed for execution
  'payment_into_court',     -- Direct payment of decretal amount
  'other'
);

CREATE TYPE public.execution_status AS ENUM (
  'filed',              -- Execution application filed by decree-holder
  'notice_issued',      -- Show-cause notice issued to judgment-debtor (Rule 22)
  'attachment_ordered', -- Court ordered attachment
  'property_attached',  -- Attachment effected by bailiff
  'sale_ordered',       -- Sale proclamation issued
  'warrant_issued',     -- Arrest or delivery warrant issued
  'satisfied',          -- Decree fully satisfied (Rule 2)
  'partially_satisfied',
  'struck_off',         -- Application struck off for default
  'dismissed'           -- Dismissed on merits
);

CREATE TABLE public.execution_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  decree_id UUID NOT NULL REFERENCES public.decrees(id) ON DELETE CASCADE,

  execution_number TEXT,
  execution_mode public.execution_mode NOT NULL,
  status public.execution_status NOT NULL DEFAULT 'filed',

  -- Parties (mirror decree at filing time)
  decree_holder_id UUID NOT NULL REFERENCES public.profiles(id),
  judgment_debtor_id UUID NOT NULL REFERENCES public.profiles(id),

  -- Amount / property being recovered
  decretal_amount NUMERIC(14, 2),
  amount_recovered NUMERIC(14, 2) DEFAULT 0,
  property_description TEXT,       -- For attachment / delivery modes
  property_location TEXT,

  -- Application content
  grounds TEXT NOT NULL,           -- Why execution is sought
  relief_sought TEXT NOT NULL,     -- Specific prayer

  -- Lifecycle
  filed_on DATE NOT NULL DEFAULT CURRENT_DATE,
  notice_issued_at TIMESTAMPTZ,
  attachment_ordered_at TIMESTAMPTZ,
  satisfied_at TIMESTAMPTZ,
  satisfaction_note TEXT,          -- Rule 2 recording of satisfaction

  -- Audit
  filed_by UUID NOT NULL REFERENCES public.profiles(id),
  presiding_officer_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_execution_case ON public.execution_applications(case_id);
CREATE INDEX idx_execution_decree ON public.execution_applications(decree_id);
CREATE INDEX idx_execution_status ON public.execution_applications(status);
CREATE INDEX idx_execution_holder ON public.execution_applications(decree_holder_id);

CREATE TRIGGER execution_applications_updated_at
  BEFORE UPDATE ON public.execution_applications
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Warrants issued during execution (attachment, arrest, delivery, sale).
-- Each warrant has a bailiff assigned and a return filed after service.
CREATE TYPE public.warrant_type AS ENUM (
  'attachment',
  'arrest',
  'delivery',
  'sale_proclamation'
);

CREATE TYPE public.warrant_status AS ENUM (
  'issued',
  'served',
  'returned_executed',
  'returned_unexecuted',
  'recalled'
);

CREATE TABLE public.execution_warrants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID NOT NULL REFERENCES public.execution_applications(id) ON DELETE CASCADE,

  warrant_number TEXT,
  warrant_type public.warrant_type NOT NULL,
  status public.warrant_status NOT NULL DEFAULT 'issued',

  issued_on DATE NOT NULL DEFAULT CURRENT_DATE,
  returnable_by DATE,
  bailiff_name TEXT,                -- Free-text; bailiffs are not first-class users
  directions TEXT NOT NULL,         -- What the warrant authorises

  served_on DATE,
  return_note TEXT,                 -- Bailiff's report of execution

  issued_by UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_warrants_execution ON public.execution_warrants(execution_id);
CREATE INDEX idx_warrants_status ON public.execution_warrants(status);

CREATE TRIGGER execution_warrants_updated_at
  BEFORE UPDATE ON public.execution_warrants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- RLS: execution_applications
ALTER TABLE public.execution_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "execution_select" ON public.execution_applications
  FOR SELECT USING (
    decree_holder_id = auth.uid()
    OR judgment_debtor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = execution_applications.case_id
      AND (
        c.admin_court_id = auth.uid()
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

-- Only the decree-holder (or their engaged lawyer) may file an execution
-- application, and only on a signed/executed decree.
CREATE POLICY "execution_insert" ON public.execution_applications
  FOR INSERT WITH CHECK (
    filed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.decrees d
      WHERE d.id = execution_applications.decree_id
      AND d.status IN ('signed', 'executed', 'pending_execution')
      AND (
        d.decree_holder_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.case_assignments ca
          WHERE ca.case_id = d.case_id
            AND ca.lawyer_id = auth.uid()
            AND ca.status = 'accepted'
        )
      )
    )
  );

-- Decree-holder may edit the application while still 'filed'.
CREATE POLICY "execution_update_holder" ON public.execution_applications
  FOR UPDATE USING (
    decree_holder_id = auth.uid()
    AND status = 'filed'
  );

-- Court officials advance status, issue notices, order attachment, etc.
CREATE POLICY "execution_update_court" ON public.execution_applications
  FOR UPDATE USING (
    public.get_user_role() IN ('admin_court', 'trial_judge', 'magistrate')
  );

-- RLS: execution_warrants
ALTER TABLE public.execution_warrants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "warrants_select" ON public.execution_warrants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.execution_applications e
      WHERE e.id = execution_warrants.execution_id
      AND (
        e.decree_holder_id = auth.uid()
        OR e.judgment_debtor_id = auth.uid()
      )
    )
    OR public.get_user_role() IN ('admin_court', 'trial_judge', 'magistrate', 'stenographer')
  );

-- Only court officials issue warrants.
CREATE POLICY "warrants_insert" ON public.execution_warrants
  FOR INSERT WITH CHECK (
    issued_by = auth.uid()
    AND public.get_user_role() IN ('admin_court', 'trial_judge', 'magistrate')
  );

CREATE POLICY "warrants_update" ON public.execution_warrants
  FOR UPDATE USING (
    public.get_user_role() IN ('admin_court', 'trial_judge', 'magistrate')
  );
