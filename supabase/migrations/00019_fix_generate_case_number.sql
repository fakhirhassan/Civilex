-- Migration 00019: Fix generate_case_number to handle family type and avoid race conditions
-- Uses advisory lock to prevent duplicate case numbers under concurrent inserts

CREATE OR REPLACE FUNCTION public.generate_case_number(p_case_type public.case_type)
RETURNS TEXT AS $$
DECLARE
  prefix TEXT;
  seq    INTEGER;
  lock_key BIGINT;
BEGIN
  prefix := CASE p_case_type
    WHEN 'civil'    THEN 'CIV'
    WHEN 'criminal' THEN 'CRM'
    WHEN 'family'   THEN 'FAM'
    ELSE 'CAS'
  END;

  -- Acquire a session-level advisory lock keyed by case_type to prevent
  -- two concurrent inserts from reading the same MAX and producing duplicates.
  lock_key := hashtext(p_case_type::TEXT);
  PERFORM pg_advisory_xact_lock(lock_key);

  SELECT COALESCE(MAX(
    CAST(SPLIT_PART(case_number, '-', 3) AS INTEGER)
  ), 0) + 1
  INTO seq
  FROM public.cases
  WHERE case_type = p_case_type
    AND SPLIT_PART(case_number, '-', 2) = EXTRACT(YEAR FROM now())::TEXT;

  RETURN prefix || '-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;
