-- Add a direct policy for lawyers to view documents of their assigned cases
-- The existing policy uses a nested subquery through the cases table which
-- can be unreliable with RLS-on-RLS evaluation in PostgreSQL.
CREATE POLICY "documents_select_lawyer" ON public.documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.case_assignments ca
      WHERE ca.case_id = documents.case_id
        AND ca.lawyer_id = auth.uid()
    )
  );
