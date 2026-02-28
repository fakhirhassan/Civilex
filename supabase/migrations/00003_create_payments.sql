-- Payment method enum
CREATE TYPE public.payment_method AS ENUM (
  'jazzcash',
  'easypaisa',
  'bank_transfer'
);

-- Payment status enum
CREATE TYPE public.payment_status AS ENUM (
  'pending',
  'processing',
  'completed',
  'failed',
  'refunded'
);

-- Payment type enum
CREATE TYPE public.payment_type AS ENUM (
  'court_fee',
  'lawyer_fee',
  'stamp_duty',
  'miscellaneous'
);

-- Payments table
CREATE TABLE public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  payer_id UUID NOT NULL REFERENCES public.profiles(id),
  receiver_id UUID REFERENCES public.profiles(id),

  amount NUMERIC(12, 2) NOT NULL,
  payment_type public.payment_type NOT NULL DEFAULT 'lawyer_fee',
  payment_method public.payment_method,
  status public.payment_status DEFAULT 'pending' NOT NULL,

  -- Transaction details
  transaction_id TEXT,
  transaction_reference TEXT,

  -- Installment tracking
  is_installment BOOLEAN DEFAULT false,
  installment_number INTEGER DEFAULT 1,
  total_installments INTEGER DEFAULT 1,
  parent_payment_id UUID REFERENCES public.payments(id),

  -- Metadata
  description TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_payments_case ON public.payments(case_id);
CREATE INDEX idx_payments_payer ON public.payments(payer_id);
CREATE INDEX idx_payments_receiver ON public.payments(receiver_id);
CREATE INDEX idx_payments_status ON public.payments(status);

-- Auto-update updated_at trigger
CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Payer and receiver can view their payments
CREATE POLICY "payments_select_own" ON public.payments
  FOR SELECT USING (
    auth.uid() = payer_id
    OR auth.uid() = receiver_id
  );

-- Court officials can view all payments
CREATE POLICY "payments_select_court" ON public.payments
  FOR SELECT USING (
    get_user_role() IN ('admin_court', 'magistrate', 'trial_judge')
  );

-- Clients can create payments (payer)
CREATE POLICY "payments_insert_payer" ON public.payments
  FOR INSERT WITH CHECK (
    auth.uid() = payer_id
  );

-- Payer can update own pending payments (for simulated confirmation)
CREATE POLICY "payments_update_own" ON public.payments
  FOR UPDATE USING (
    auth.uid() = payer_id
  );
