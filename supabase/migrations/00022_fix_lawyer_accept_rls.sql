-- Migration 00022: Fix RLS so lawyers can transition case to payment_pending on accept
--
-- Problem: cases_update_lawyer_pending allows a lawyer with a pending assignment
-- to update the case row (needed for decline flow). However, without WITH CHECK,
-- the post-update row must still satisfy the USING clause — meaning the assignment
-- must still be 'pending' after the update, which blocks transitioning to
-- 'payment_pending' (which happens right after the assignment is set to 'accepted').
--
-- Fix: Drop and recreate the policy with an explicit WITH CHECK that allows the
-- case to land in any status as long as a valid assignment exists for this lawyer.

DROP POLICY IF EXISTS "cases_update_lawyer_pending" ON public.cases;

CREATE POLICY "cases_update_lawyer_pending" ON public.cases
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.case_assignments ca
      WHERE ca.case_id = id
        AND ca.lawyer_id = auth.uid()
        AND ca.status = 'pending'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.case_assignments ca
      WHERE ca.case_id = id
        AND ca.lawyer_id = auth.uid()
    )
  );
