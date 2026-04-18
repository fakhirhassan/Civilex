-- Migration 00024: Consolidate cases_update_lawyer policies
--
-- Two problems:
--   1. Ambiguous `id` in the subquery resolved to case_assignments.id
--      instead of cases.id (same bug as 00023).
--   2. The accept flow updates the assignment to 'accepted' BEFORE updating
--      the case row. By the time the case UPDATE runs, no assignment with
--      status='pending' exists for this lawyer, so the USING clause of
--      cases_update_lawyer_pending fails — silently blocking the status
--      transition to 'payment_pending'.
--
-- Fix: one consolidated policy that allows UPDATE when the lawyer has
-- either a pending or accepted assignment on the case.

DROP POLICY IF EXISTS "cases_update_lawyer_pending" ON public.cases;
DROP POLICY IF EXISTS "cases_update_lawyer" ON public.cases;

CREATE POLICY "cases_update_lawyer" ON public.cases
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.case_assignments ca
      WHERE ca.case_id = cases.id
        AND ca.lawyer_id = auth.uid()
        AND ca.status IN ('pending', 'accepted')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.case_assignments ca
      WHERE ca.case_id = cases.id
        AND ca.lawyer_id = auth.uid()
    )
  );
