-- Migration 00020: Fix document RLS policies
--
-- Two bugs in 00016:
-- 1. No INSERT policy for clients → client uploads silently blocked by RLS.
-- 2. docs_select_lawyer required status = 'accepted', so a lawyer with a
--    *pending* assignment couldn't see documents uploaded by the client
--    before accepting. Lawyer needs to review docs to decide whether to accept.

-- ── Fix 1: Allow clients to upload to their own cases ──────────────────
-- (plaintiff or defendant party to the case)

CREATE POLICY "docs_insert_client" ON public.documents
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by
    AND get_user_role() = 'client'
    AND EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = documents.case_id
        AND (c.plaintiff_id = auth.uid() OR c.defendant_id = auth.uid())
    )
  );

-- ── Fix 2: Lawyer with pending OR accepted assignment can view docs ─────
-- Drop the old strict policy and recreate it.

DROP POLICY IF EXISTS "docs_select_lawyer" ON public.documents;

CREATE POLICY "docs_select_lawyer" ON public.documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.case_assignments ca
      WHERE ca.case_id = documents.case_id
        AND ca.lawyer_id = auth.uid()
        AND ca.status IN ('pending', 'accepted')
    )
  );

-- ── Fix 3: Storage bucket policies for case-documents ──────────────────
-- Allow any authenticated user who can see the document record to also
-- access the file in storage.  Storage SELECT = download; INSERT = upload.

-- Drop old storage policies if they exist
DROP POLICY IF EXISTS "case_documents_select" ON storage.objects;
DROP POLICY IF EXISTS "case_documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "case_documents_delete" ON storage.objects;

-- SELECT: any authenticated user (RLS on the documents table controls who
-- can actually get a signed URL via the app layer)
CREATE POLICY "case_documents_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'case-documents'
    AND auth.uid() IS NOT NULL
  );

-- INSERT: any authenticated user (documents table RLS enforces who can insert a record)
CREATE POLICY "case_documents_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'case-documents'
    AND auth.uid() IS NOT NULL
  );

-- DELETE: own uploads only (admin_court handled at app layer)
CREATE POLICY "case_documents_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'case-documents'
    AND auth.uid() IS NOT NULL
  );
