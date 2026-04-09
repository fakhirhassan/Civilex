-- Fix document access permissions:
-- 1. Replace the lawyer SELECT policy to only allow accepted assignments
-- 2. Add UPDATE policy (only document uploader can update)
-- 3. Add DELETE policy (only document uploader can delete)
-- 4. Add UPDATE policy for judges to save drafts

-- Drop and recreate the lawyer select policy to require accepted assignment
DROP POLICY IF EXISTS "documents_select_lawyer" ON public.documents;

CREATE POLICY "documents_select_lawyer" ON public.documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.case_assignments ca
      WHERE ca.case_id = documents.case_id
        AND ca.lawyer_id = auth.uid()
        AND ca.status = 'accepted'
    )
  );

-- Document uploader can update their own documents
CREATE POLICY "documents_update_owner" ON public.documents
  FOR UPDATE USING (
    auth.uid() = uploaded_by
  );

-- Document uploader can delete their own documents
CREATE POLICY "documents_delete_owner" ON public.documents
  FOR DELETE USING (
    auth.uid() = uploaded_by
  );

-- Judges can update documents (for draft saves, annotations)
CREATE POLICY "documents_update_judge" ON public.documents
  FOR UPDATE USING (
    get_user_role() IN ('magistrate', 'trial_judge')
  );
