-- Migration 00021: Allow clients to withdraw (dispose) their own cases
--
-- cases_update_own_draft only allows UPDATE when status = 'draft'.
-- Clients also need to be able to set status = 'disposed' when the case
-- is in 'draft' or 'pending_lawyer_acceptance' (all lawyers declined).
-- We broaden that policy to cover withdrawal.

DROP POLICY IF EXISTS "cases_update_own_draft" ON public.cases;

CREATE POLICY "cases_update_own_draft" ON public.cases
  FOR UPDATE USING (
    auth.uid() = plaintiff_id
    AND status IN ('draft', 'pending_lawyer_acceptance')
  );
