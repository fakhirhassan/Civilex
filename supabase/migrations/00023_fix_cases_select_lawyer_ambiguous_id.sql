-- Migration 00023: Fix cases_select_assigned_lawyer RLS policy
--
-- The subquery referenced `id` without qualification, which Postgres was
-- resolving to `case_assignments.id` (the assignment PK) instead of
-- `cases.id`. Result: the EXISTS always returned false, so lawyers saw
-- zero cases even when an assignment existed.

DROP POLICY IF EXISTS "cases_select_assigned_lawyer" ON public.cases;

CREATE POLICY "cases_select_assigned_lawyer" ON public.cases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.case_assignments ca
      WHERE ca.case_id = cases.id
        AND ca.lawyer_id = auth.uid()
    )
  );
