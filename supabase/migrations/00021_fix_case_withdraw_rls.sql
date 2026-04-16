-- Migration 00021: Allow clients to withdraw (dispose) their own cases
--
-- USING  = which rows the client can target (pre-update check)
-- WITH CHECK = what the row is allowed to look like after the update
--
-- Without WITH CHECK the clause defaults to the same as USING, which means
-- the post-update row must still have status IN ('draft','pending_lawyer_acceptance').
-- Setting status = 'disposed' fails that check — hence the RLS error.
-- We explicitly allow any resulting status as long as the owner matches.

DROP POLICY IF EXISTS "cases_update_own_draft" ON public.cases;

CREATE POLICY "cases_update_own_draft" ON public.cases
  FOR UPDATE
  USING (
    auth.uid() = plaintiff_id
    AND status IN ('draft', 'pending_lawyer_acceptance')
  )
  WITH CHECK (
    auth.uid() = plaintiff_id
  );
