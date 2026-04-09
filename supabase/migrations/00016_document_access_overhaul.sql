-- ============================================================
-- Document access overhaul: align DB policies with app rules
--
-- Rules:
--   client (plaintiff / defendant)  → SELECT only
--   lawyer (accepted assignment)    → SELECT all; INSERT/UPDATE/DELETE own uploads
--   magistrate / trial_judge        → SELECT all; INSERT own; UPDATE own
--   stenographer                    → SELECT only
--   admin_court                     → SELECT all; INSERT own; UPDATE/DELETE any
-- ============================================================

-- ── Drop every existing document policy so we start clean ──────────────
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'documents'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.documents', pol.policyname);
  END LOOP;
END;
$$;

-- ── SELECT ─────────────────────────────────────────────────────────────
-- All authenticated users who are a party to the case, an assigned lawyer,
-- or a court official can view all documents for that case.

CREATE POLICY "docs_select_plaintiff_defendant" ON public.documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c
      WHERE c.id = documents.case_id
        AND (c.plaintiff_id = auth.uid() OR c.defendant_id = auth.uid())
    )
  );

CREATE POLICY "docs_select_lawyer" ON public.documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.case_assignments ca
      WHERE ca.case_id = documents.case_id
        AND ca.lawyer_id = auth.uid()
        AND ca.status = 'accepted'
    )
  );

CREATE POLICY "docs_select_court" ON public.documents
  FOR SELECT USING (
    get_user_role() IN ('admin_court', 'magistrate', 'trial_judge', 'stenographer')
  );

-- ── INSERT ─────────────────────────────────────────────────────────────
-- Lawyers (accepted assignment), judges, and admin_court can upload.
-- Clients / stenographers cannot upload.

CREATE POLICY "docs_insert_lawyer" ON public.documents
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by
    AND get_user_role() = 'lawyer'
    AND EXISTS (
      SELECT 1 FROM public.case_assignments ca
      WHERE ca.case_id = documents.case_id
        AND ca.lawyer_id = auth.uid()
        AND ca.status = 'accepted'
    )
  );

CREATE POLICY "docs_insert_judge" ON public.documents
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by
    AND get_user_role() IN ('magistrate', 'trial_judge')
  );

CREATE POLICY "docs_insert_admin" ON public.documents
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by
    AND get_user_role() = 'admin_court'
  );

-- ── UPDATE ─────────────────────────────────────────────────────────────
-- Lawyers and judges can update their OWN uploads.
-- Admin can update any document.

CREATE POLICY "docs_update_own" ON public.documents
  FOR UPDATE USING (
    auth.uid() = uploaded_by
    AND get_user_role() IN ('lawyer', 'magistrate', 'trial_judge', 'admin_court')
  );

CREATE POLICY "docs_update_admin_any" ON public.documents
  FOR UPDATE USING (
    get_user_role() = 'admin_court'
  );

-- ── DELETE ─────────────────────────────────────────────────────────────
-- Lawyers and judges can delete their OWN uploads.
-- Admin can delete any document.

CREATE POLICY "docs_delete_own" ON public.documents
  FOR DELETE USING (
    auth.uid() = uploaded_by
    AND get_user_role() IN ('lawyer', 'magistrate', 'trial_judge')
  );

CREATE POLICY "docs_delete_admin_any" ON public.documents
  FOR DELETE USING (
    get_user_role() = 'admin_court'
  );
