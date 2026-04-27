-- Migration 00034: Allow client to advance case from payment_pending -> payment_confirmed
--
-- The simulatePayment hook runs as the paying client. After all payments are
-- completed it tries to flip the case to 'payment_confirmed'. The existing
-- cases_update RLS policies only let the plaintiff edit while status='draft'
-- (cases_update_own_draft) — there is no policy that lets a client advance
-- their case past payment, so the update silently affects 0 rows and the
-- case stays stuck at 'payment_pending' even though every payment row is
-- 'completed'.
--
-- This policy lets either side of the case (plaintiff or defendant) flip
-- status from 'payment_pending' to 'payment_confirmed'. Other transitions
-- remain blocked for clients.

CREATE POLICY "cases_update_client_payment_confirm" ON public.cases
  FOR UPDATE USING (
    (auth.uid() = plaintiff_id OR auth.uid() = defendant_id)
    AND status = 'payment_pending'
  );
