-- Allow lawyers with a pending assignment to update the case (needed for decline flow)
-- The existing cases_update_lawyer policy only allows updates when assignment is 'accepted',
-- which blocks the lawyer from reverting the case to 'draft' when declining.
CREATE POLICY "cases_update_lawyer_pending" ON public.cases
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.case_assignments ca
      WHERE ca.case_id = id
        AND ca.lawyer_id = auth.uid()
        AND ca.status = 'pending'
    )
  );
