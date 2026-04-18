-- ============================================================
-- Civilex — Complete Database Schema
-- Single consolidated file replacing migrations 00001–00022
-- Run this in Supabase SQL Editor on a fresh project
-- ============================================================


-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE public.user_role AS ENUM (
  'client', 'lawyer', 'admin_court', 'magistrate', 'trial_judge', 'stenographer'
);

CREATE TYPE public.case_type AS ENUM ('civil', 'criminal', 'family');

CREATE TYPE public.case_status AS ENUM (
  'draft',
  'pending_lawyer_acceptance',
  'payment_pending',
  'payment_confirmed',
  'drafting',
  'submitted_to_admin',
  'under_scrutiny',
  'returned_for_revision',
  'registered',
  'summon_issued',
  'preliminary_hearing',
  'issues_framed',
  'transferred_to_trial',
  'evidence_stage',
  'arguments',
  'reserved_for_judgment',
  'judgment_delivered',
  'closed',
  'disposed'
);

CREATE TYPE public.document_type AS ENUM (
  'plaint', 'written_statement', 'affidavit', 'evidence', 'court_order',
  'judgment', 'application', 'fir_copy', 'power_of_attorney', 'vakalatnama', 'other'
);

CREATE TYPE public.assignment_status AS ENUM ('pending', 'accepted', 'declined');
CREATE TYPE public.assignment_side   AS ENUM ('plaintiff', 'defendant');

CREATE TYPE public.payment_method AS ENUM ('jazzcash', 'easypaisa', 'bank_transfer');
CREATE TYPE public.payment_status  AS ENUM ('pending', 'processing', 'completed', 'failed', 'refunded');
CREATE TYPE public.payment_type    AS ENUM ('court_fee', 'lawyer_fee', 'stamp_duty', 'miscellaneous');

CREATE TYPE public.notification_type AS ENUM (
  'case_filed', 'case_assigned', 'case_accepted', 'case_declined',
  'case_status_changed', 'payment_pending', 'payment_completed',
  'hearing_scheduled', 'hearing_reminder', 'document_uploaded',
  'scrutiny_approved', 'scrutiny_returned', 'judgment_delivered',
  'summon_issued', 'document_requested', 'general'
);

CREATE TYPE public.scrutiny_decision AS ENUM ('pending', 'approved', 'returned');

CREATE TYPE public.hearing_type   AS ENUM ('preliminary', 'regular', 'arguments', 'judgment', 'bail', 'miscellaneous');
CREATE TYPE public.hearing_status AS ENUM ('scheduled', 'in_progress', 'completed', 'adjourned', 'cancelled');
CREATE TYPE public.order_type     AS ENUM ('interim', 'final', 'adjournment', 'summon', 'bail', 'transfer', 'miscellaneous');

CREATE TYPE public.witness_status AS ENUM ('listed', 'summoned', 'examined', 'cross_examined', 'recalled', 'hostile', 'excused');
CREATE TYPE public.witness_side   AS ENUM ('prosecution', 'defense', 'court');
CREATE TYPE public.evidence_status AS ENUM ('submitted', 'admitted', 'objected', 'rejected', 'marked');


-- ============================================================
-- SHARED TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- TABLES
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
CREATE TABLE public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  phone       TEXT,
  cnic        TEXT UNIQUE,
  role        public.user_role NOT NULL,
  avatar_url  TEXT,
  address     TEXT,
  city        TEXT,
  is_active   BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── lawyer_profiles ─────────────────────────────────────────
CREATE TABLE public.lawyer_profiles (
  id                UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  bar_license_number TEXT NOT NULL UNIQUE,
  specialization    TEXT[] DEFAULT '{}',
  experience_years  INTEGER DEFAULT 0,
  bio               TEXT,
  hourly_rate       NUMERIC(10,2),
  rating            NUMERIC(3,2) DEFAULT 0.00,
  total_reviews     INTEGER DEFAULT 0,
  is_available      BOOLEAN DEFAULT true,
  location          TEXT,
  created_at        TIMESTAMPTZ DEFAULT now()
);

-- ── cases ────────────────────────────────────────────────────
CREATE TABLE public.cases (
  id                           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_number                  TEXT NOT NULL UNIQUE,
  case_type                    public.case_type NOT NULL,
  case_category                TEXT,
  status                       public.case_status DEFAULT 'draft' NOT NULL,
  title                        TEXT NOT NULL,
  description                  TEXT,

  -- Parties
  plaintiff_id                 UUID REFERENCES public.profiles(id),
  plaintiff_name               TEXT,
  plaintiff_phone              TEXT,
  plaintiff_cnic               TEXT,
  plaintiff_address            TEXT,

  defendant_id                 UUID REFERENCES public.profiles(id),
  defendant_name               TEXT,
  defendant_email              TEXT,
  defendant_phone              TEXT,
  defendant_address            TEXT,
  defendant_cnic               TEXT,

  -- Court assignment
  admin_court_id               UUID REFERENCES public.profiles(id),
  trial_judge_id               UUID REFERENCES public.profiles(id),
  stenographer_id              UUID REFERENCES public.profiles(id),
  judge_assigned_at            TIMESTAMPTZ,
  assigned_judge_notes         TEXT,

  -- Case details
  current_phase                TEXT DEFAULT 'filing',
  sensitivity                  TEXT DEFAULT 'normal' CHECK (sensitivity IN ('normal', 'sensitive', 'highly_sensitive')),
  filing_date                  TIMESTAMPTZ,
  registration_date            TIMESTAMPTZ,
  next_hearing_date            TIMESTAMPTZ,
  disposal_date                TIMESTAMPTZ,

  -- Summon tracking
  summon_sent_at               TIMESTAMPTZ,
  summon_sent_by               UUID REFERENCES public.profiles(id),

  -- Defendant self-linking token
  defendant_claim_token        TEXT UNIQUE,
  defendant_claim_expires_at   TIMESTAMPTZ,

  -- Family-specific
  marriage_certificate_number  TEXT,

  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_cases_plaintiff    ON public.cases(plaintiff_id);
CREATE INDEX idx_cases_defendant    ON public.cases(defendant_id);
CREATE INDEX idx_cases_status       ON public.cases(status);
CREATE INDEX idx_cases_type         ON public.cases(case_type);
CREATE INDEX idx_cases_admin_court  ON public.cases(admin_court_id);
CREATE INDEX idx_cases_trial_judge  ON public.cases(trial_judge_id);

CREATE TRIGGER cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── criminal_case_details ────────────────────────────────────
CREATE TABLE public.criminal_case_details (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id               UUID NOT NULL UNIQUE REFERENCES public.cases(id) ON DELETE CASCADE,
  fir_number            TEXT,
  police_station        TEXT,
  offense_description   TEXT,
  offense_section       TEXT,
  io_name               TEXT,
  io_contact            TEXT,
  bail_status           TEXT DEFAULT 'not_applicable'
                          CHECK (bail_status IN ('not_applicable','applied','granted','denied','cancelled')),
  arrest_date           TIMESTAMPTZ,
  investigation_status  TEXT DEFAULT 'pending'
                          CHECK (investigation_status IN ('pending','in_progress','completed','report_submitted')),
  challan_submitted     BOOLEAN DEFAULT false,
  challan_date          TIMESTAMPTZ,
  magistrate_remarks    TEXT,
  next_io_report_date   TIMESTAMPTZ,
  evidence_type         TEXT CHECK (evidence_type IN ('oral','documentary') OR evidence_type IS NULL),
  created_at            TIMESTAMPTZ DEFAULT now(),
  updated_at            TIMESTAMPTZ DEFAULT now()
);

CREATE TRIGGER criminal_case_details_updated_at
  BEFORE UPDATE ON public.criminal_case_details
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── case_assignments ─────────────────────────────────────────
CREATE TABLE public.case_assignments (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  lawyer_id         UUID NOT NULL REFERENCES public.profiles(id),
  client_id         UUID NOT NULL REFERENCES public.profiles(id),
  side              public.assignment_side NOT NULL,
  status            public.assignment_status DEFAULT 'pending' NOT NULL,
  fee_amount        NUMERIC(12,2),
  allow_installments BOOLEAN DEFAULT false,
  installment_count INTEGER DEFAULT 1,
  decline_reason    TEXT,
  assigned_at       TIMESTAMPTZ DEFAULT now(),
  responded_at      TIMESTAMPTZ
);

CREATE INDEX idx_case_assignments_case   ON public.case_assignments(case_id);
CREATE INDEX idx_case_assignments_lawyer ON public.case_assignments(lawyer_id);
CREATE INDEX idx_case_assignments_client ON public.case_assignments(client_id);

-- ── documents ────────────────────────────────────────────────
CREATE TABLE public.documents (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id       UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  uploaded_by   UUID NOT NULL REFERENCES public.profiles(id),
  document_type public.document_type NOT NULL DEFAULT 'other',
  title         TEXT NOT NULL,
  description   TEXT,
  file_path     TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  file_size     INTEGER,
  mime_type     TEXT,
  is_signed     BOOLEAN DEFAULT false,
  signed_by     UUID REFERENCES public.profiles(id),
  signed_at     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_documents_case        ON public.documents(case_id);
CREATE INDEX idx_documents_uploaded_by ON public.documents(uploaded_by);

-- ── case_activity_log ────────────────────────────────────────
CREATE TABLE public.case_activity_log (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id   UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  actor_id  UUID REFERENCES public.profiles(id),
  action    TEXT NOT NULL,
  details   JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_case_activity_log_case ON public.case_activity_log(case_id);

-- ── payments ─────────────────────────────────────────────────
CREATE TABLE public.payments (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id              UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  payer_id             UUID NOT NULL REFERENCES public.profiles(id),
  receiver_id          UUID REFERENCES public.profiles(id),
  amount               NUMERIC(12,2) NOT NULL,
  payment_type         public.payment_type NOT NULL DEFAULT 'lawyer_fee',
  payment_method       public.payment_method,
  status               public.payment_status DEFAULT 'pending' NOT NULL,
  transaction_id       TEXT,
  transaction_reference TEXT,
  is_installment       BOOLEAN DEFAULT false,
  installment_number   INTEGER DEFAULT 1,
  total_installments   INTEGER DEFAULT 1,
  parent_payment_id    UUID REFERENCES public.payments(id),
  description          TEXT,
  paid_at              TIMESTAMPTZ,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_payments_case     ON public.payments(case_id);
CREATE INDEX idx_payments_payer    ON public.payments(payer_id);
CREATE INDEX idx_payments_receiver ON public.payments(receiver_id);
CREATE INDEX idx_payments_status   ON public.payments(status);

CREATE TRIGGER payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── notifications ────────────────────────────────────────────
CREATE TABLE public.notifications (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  message        TEXT NOT NULL,
  type           public.notification_type DEFAULT 'general' NOT NULL,
  reference_type TEXT,
  reference_id   UUID,
  is_read        BOOLEAN DEFAULT false NOT NULL,
  read_at        TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user        ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;
CREATE INDEX idx_notifications_created     ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_reference   ON public.notifications(reference_type, reference_id);

-- ── scrutiny_checklist ───────────────────────────────────────
CREATE TABLE public.scrutiny_checklist (
  id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id                  UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  reviewed_by              UUID NOT NULL REFERENCES public.profiles(id),
  proper_documentation     BOOLEAN DEFAULT false NOT NULL,
  court_fees_paid          BOOLEAN DEFAULT false NOT NULL,
  jurisdiction_verified    BOOLEAN DEFAULT false NOT NULL,
  parties_identified       BOOLEAN DEFAULT false NOT NULL,
  cause_of_action_valid    BOOLEAN DEFAULT false NOT NULL,
  limitation_period_checked BOOLEAN DEFAULT false NOT NULL,
  proper_format            BOOLEAN DEFAULT false NOT NULL,
  decision                 public.scrutiny_decision DEFAULT 'pending' NOT NULL,
  remarks                  TEXT,
  reviewed_at              TIMESTAMPTZ,
  created_at               TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_scrutiny_case     ON public.scrutiny_checklist(case_id);
CREATE INDEX idx_scrutiny_reviewer ON public.scrutiny_checklist(reviewed_by);
CREATE INDEX idx_scrutiny_decision ON public.scrutiny_checklist(decision);

-- ── hearings ─────────────────────────────────────────────────
CREATE TABLE public.hearings (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id              UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  hearing_number       INT NOT NULL DEFAULT 1,
  hearing_type         public.hearing_type DEFAULT 'regular' NOT NULL,
  scheduled_date       TIMESTAMPTZ NOT NULL,
  actual_date          TIMESTAMPTZ,
  presiding_officer_id UUID REFERENCES public.profiles(id),
  courtroom            TEXT,
  proceedings_summary  TEXT,
  judge_remarks        TEXT,
  notes                TEXT,
  next_hearing_date    TIMESTAMPTZ,
  status               public.hearing_status DEFAULT 'scheduled' NOT NULL,
  created_at           TIMESTAMPTZ DEFAULT now(),
  updated_at           TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_hearings_case    ON public.hearings(case_id);
CREATE INDEX idx_hearings_date    ON public.hearings(scheduled_date);
CREATE INDEX idx_hearings_officer ON public.hearings(presiding_officer_id);
CREATE INDEX idx_hearings_status  ON public.hearings(status);

CREATE TRIGGER hearings_updated_at
  BEFORE UPDATE ON public.hearings
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── order_sheets ─────────────────────────────────────────────
CREATE TABLE public.order_sheets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hearing_id UUID REFERENCES public.hearings(id) ON DELETE CASCADE,
  case_id    UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  order_type public.order_type DEFAULT 'miscellaneous' NOT NULL,
  order_text TEXT NOT NULL,
  issued_by  UUID NOT NULL REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_orders_hearing   ON public.order_sheets(hearing_id);
CREATE INDEX idx_orders_case      ON public.order_sheets(case_id);
CREATE INDEX idx_orders_issued_by ON public.order_sheets(issued_by);

-- ── bail_applications ────────────────────────────────────────
CREATE TABLE public.bail_applications (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  applicant_id      UUID NOT NULL REFERENCES public.profiles(id),
  lawyer_id         UUID REFERENCES public.profiles(id),
  application_type  TEXT NOT NULL DEFAULT 'regular'
                      CHECK (application_type IN ('pre_arrest','post_arrest','regular','interim')),
  grounds           TEXT NOT NULL,
  surety_details    TEXT,
  surety_amount     NUMERIC(12,2),
  status            TEXT NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','hearing_scheduled','granted','denied','cancelled','withdrawn')),
  decision_date     TIMESTAMPTZ,
  decision_remarks  TEXT,
  decided_by        UUID REFERENCES public.profiles(id),
  conditions        TEXT,
  hearing_id        UUID REFERENCES public.hearings(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bail_applications_case      ON public.bail_applications(case_id);
CREATE INDEX idx_bail_applications_status    ON public.bail_applications(status);
CREATE INDEX idx_bail_applications_applicant ON public.bail_applications(applicant_id);

CREATE TRIGGER bail_applications_updated_at
  BEFORE UPDATE ON public.bail_applications
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── investigation_reports ────────────────────────────────────
CREATE TABLE public.investigation_reports (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id          UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  submitted_by     UUID NOT NULL REFERENCES public.profiles(id),
  report_type      TEXT NOT NULL DEFAULT 'progress'
                     CHECK (report_type IN ('initial','progress','final','supplementary')),
  report_text      TEXT NOT NULL,
  findings         TEXT,
  recommendations  TEXT,
  evidence_collected TEXT,
  status           TEXT NOT NULL DEFAULT 'submitted'
                     CHECK (status IN ('submitted','reviewed','accepted','returned')),
  reviewed_by      UUID REFERENCES public.profiles(id),
  review_remarks   TEXT,
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_investigation_reports_case ON public.investigation_reports(case_id);

-- ── witness_records ──────────────────────────────────────────
CREATE TABLE public.witness_records (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id           UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  hearing_id        UUID REFERENCES public.hearings(id) ON DELETE SET NULL,
  witness_name      TEXT NOT NULL,
  witness_cnic      TEXT,
  witness_contact   TEXT,
  witness_address   TEXT,
  witness_side      public.witness_side NOT NULL DEFAULT 'prosecution',
  relation_to_case  TEXT,
  statement         TEXT,
  cross_examination TEXT,
  re_examination    TEXT,
  judge_notes       TEXT,
  status            public.witness_status NOT NULL DEFAULT 'listed',
  examination_date  DATE,
  added_by          UUID REFERENCES public.profiles(id),
  created_at        TIMESTAMPTZ DEFAULT now(),
  updated_at        TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_witness_records_case    ON public.witness_records(case_id);
CREATE INDEX idx_witness_records_hearing ON public.witness_records(hearing_id);
CREATE INDEX idx_witness_records_status  ON public.witness_records(status);

CREATE TRIGGER witness_records_updated_at
  BEFORE UPDATE ON public.witness_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── evidence_records ─────────────────────────────────────────
CREATE TABLE public.evidence_records (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id             UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  document_id         UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  exhibit_number      TEXT,
  evidence_type       TEXT NOT NULL DEFAULT 'documentary',
  description         TEXT NOT NULL,
  submitted_by        UUID REFERENCES public.profiles(id),
  submitted_by_side   public.witness_side NOT NULL DEFAULT 'prosecution',
  status              public.evidence_status NOT NULL DEFAULT 'submitted',
  admission_date      DATE,
  objection_remarks   TEXT,
  court_remarks       TEXT,
  created_at          TIMESTAMPTZ DEFAULT now(),
  updated_at          TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_evidence_records_case     ON public.evidence_records(case_id);
CREATE INDEX idx_evidence_records_document ON public.evidence_records(document_id);
CREATE INDEX idx_evidence_records_status   ON public.evidence_records(status);

CREATE TRIGGER evidence_records_updated_at
  BEFORE UPDATE ON public.evidence_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── judgment_records ─────────────────────────────────────────
CREATE TABLE public.judgment_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id          UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  hearing_id       UUID REFERENCES public.hearings(id) ON DELETE SET NULL,
  judgment_text    TEXT NOT NULL,
  judgment_summary TEXT,
  verdict          TEXT NOT NULL,
  relief_granted   TEXT,
  costs_awarded    TEXT,
  sentence_details TEXT,
  delivered_by     UUID REFERENCES public.profiles(id),
  signed_by        UUID REFERENCES public.profiles(id),
  delivery_date    DATE NOT NULL DEFAULT CURRENT_DATE,
  is_signed        BOOLEAN DEFAULT false,
  signed_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_judgment_records_case ON public.judgment_records(case_id);

CREATE TRIGGER judgment_records_updated_at
  BEFORE UPDATE ON public.judgment_records
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── otp_signatures ───────────────────────────────────────────
CREATE TABLE public.otp_signatures (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id     UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  judgment_id     UUID REFERENCES public.judgment_records(id) ON DELETE SET NULL,
  entity_type     TEXT NOT NULL,
  signer_id       UUID NOT NULL REFERENCES public.profiles(id),
  signer_role     TEXT NOT NULL,
  otp_hash        TEXT NOT NULL,
  otp_verified    BOOLEAN DEFAULT false,
  otp_sent_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  otp_verified_at TIMESTAMPTZ,
  otp_expires_at  TIMESTAMPTZ NOT NULL,
  attempts        INTEGER DEFAULT 0,
  max_attempts    INTEGER DEFAULT 3,
  ip_address      TEXT,
  user_agent      TEXT,
  created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_otp_signatures_document  ON public.otp_signatures(document_id);
CREATE INDEX idx_otp_signatures_judgment  ON public.otp_signatures(judgment_id);
CREATE INDEX idx_otp_signatures_signer    ON public.otp_signatures(signer_id);
CREATE INDEX idx_otp_signatures_verified  ON public.otp_signatures(otp_verified);

-- ── judge_drafts ─────────────────────────────────────────────
CREATE TABLE public.judge_drafts (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id              UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  judge_id             UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  content              TEXT NOT NULL DEFAULT '',
  hearing_id           UUID REFERENCES public.hearings(id) ON DELETE SET NULL,
  is_published         BOOLEAN NOT NULL DEFAULT false,
  published_at         TIMESTAMPTZ,
  published_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_judge_drafts_case  ON public.judge_drafts(case_id);
CREATE INDEX idx_judge_drafts_judge ON public.judge_drafts(judge_id);

CREATE TRIGGER trg_judge_drafts_updated_at
  BEFORE UPDATE ON public.judge_drafts
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── document_requests ────────────────────────────────────────
CREATE TABLE public.document_requests (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id        UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  requested_by   UUID NOT NULL REFERENCES public.profiles(id),
  requested_from UUID NOT NULL REFERENCES public.profiles(id),
  document_type  TEXT NOT NULL,
  title          TEXT NOT NULL,
  description    TEXT,
  status         TEXT DEFAULT 'pending' CHECK (status IN ('pending','fulfilled','cancelled')),
  fulfilled_at   TIMESTAMPTZ,
  created_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_doc_requests_case ON public.document_requests(case_id);
CREATE INDEX idx_doc_requests_from ON public.document_requests(requested_from);
CREATE INDEX idx_doc_requests_by   ON public.document_requests(requested_by);


-- ============================================================
-- HELPER: get current user role (must be after profiles table)
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================
-- TRIGGERS: auto-create profile on signup
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ============================================================
-- FUNCTION: generate_case_number (race-safe, family-aware)
-- ============================================================

CREATE OR REPLACE FUNCTION public.generate_case_number(p_case_type public.case_type)
RETURNS TEXT AS $$
DECLARE
  prefix   TEXT;
  seq      INTEGER;
  lock_key BIGINT;
BEGIN
  prefix := CASE p_case_type
    WHEN 'civil'    THEN 'CIV'
    WHEN 'criminal' THEN 'CRM'
    WHEN 'family'   THEN 'FAM'
    ELSE 'CAS'
  END;

  lock_key := hashtext(p_case_type::TEXT);
  PERFORM pg_advisory_xact_lock(lock_key);

  SELECT COALESCE(MAX(CAST(SPLIT_PART(case_number, '-', 3) AS INTEGER)), 0) + 1
  INTO seq
  FROM public.cases
  WHERE case_type = p_case_type
    AND SPLIT_PART(case_number, '-', 2) = EXTRACT(YEAR FROM now())::TEXT;

  RETURN prefix || '-' || EXTRACT(YEAR FROM now())::TEXT || '-' || LPAD(seq::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql;


-- ============================================================
-- FUNCTION: create_notification helper
-- ============================================================

CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id      UUID,
  p_title        TEXT,
  p_message      TEXT,
  p_type         public.notification_type DEFAULT 'general',
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
) RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, reference_type, reference_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_reference_type, p_reference_id)
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;


-- ============================================================
-- ROW LEVEL SECURITY — enable on all tables
-- ============================================================

ALTER TABLE public.profiles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyer_profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criminal_case_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_assignments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_activity_log     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.scrutiny_checklist    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hearings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_sheets          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bail_applications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.witness_records       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.evidence_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judgment_records      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otp_signatures        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judge_drafts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_requests     ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- RLS POLICIES
-- ============================================================

-- ── profiles ────────────────────────────────────────────────
CREATE POLICY "profiles_select_all"   ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own"   ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- ── lawyer_profiles ─────────────────────────────────────────
CREATE POLICY "lawyer_profiles_select_all"  ON public.lawyer_profiles FOR SELECT USING (true);
CREATE POLICY "lawyer_profiles_insert_own"  ON public.lawyer_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "lawyer_profiles_update_own"  ON public.lawyer_profiles FOR UPDATE USING (auth.uid() = id);

-- ── cases ────────────────────────────────────────────────────

-- Clients see their own cases
CREATE POLICY "cases_select_own" ON public.cases
  FOR SELECT USING (auth.uid() = plaintiff_id OR auth.uid() = defendant_id);

-- Lawyers see assigned cases
CREATE POLICY "cases_select_assigned_lawyer" ON public.cases
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.case_assignments ca
      WHERE ca.case_id = id AND ca.lawyer_id = auth.uid()
    )
  );

-- Court officials see all cases
CREATE POLICY "cases_select_court" ON public.cases
  FOR SELECT USING (
    get_user_role() IN ('admin_court', 'magistrate', 'trial_judge', 'stenographer')
  );

-- Clients create cases
CREATE POLICY "cases_insert_client" ON public.cases
  FOR INSERT WITH CHECK (auth.uid() = plaintiff_id AND get_user_role() = 'client');

-- Clients update/withdraw own cases in early statuses
CREATE POLICY "cases_update_own_draft" ON public.cases
  FOR UPDATE
  USING (
    auth.uid() = plaintiff_id
    AND status IN ('draft', 'pending_lawyer_acceptance')
  )
  WITH CHECK (auth.uid() = plaintiff_id);

-- Lawyers with an ACCEPTED assignment can update case (status transitions)
CREATE POLICY "cases_update_lawyer" ON public.cases
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.case_assignments ca
      WHERE ca.case_id = id AND ca.lawyer_id = auth.uid() AND ca.status = 'accepted'
    )
  );

-- Lawyers with a PENDING assignment can update case (needed for accept/decline flow)
-- WITH CHECK allows the resulting status to be anything as long as the lawyer has
-- any assignment on this case (the assignment will be 'accepted' by the time the
-- case row is updated during acceptCase).
CREATE POLICY "cases_update_lawyer_pending" ON public.cases
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.case_assignments ca
      WHERE ca.case_id = id AND ca.lawyer_id = auth.uid() AND ca.status = 'pending'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.case_assignments ca
      WHERE ca.case_id = id AND ca.lawyer_id = auth.uid()
    )
  );

-- Court officials update cases
CREATE POLICY "cases_update_court" ON public.cases
  FOR UPDATE USING (
    get_user_role() IN ('admin_court', 'magistrate', 'trial_judge')
  );

-- ── criminal_case_details ────────────────────────────────────
CREATE POLICY "criminal_details_select" ON public.criminal_case_details
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c WHERE c.id = case_id AND (
        c.plaintiff_id = auth.uid() OR c.defendant_id = auth.uid()
        OR get_user_role() IN ('admin_court', 'magistrate', 'trial_judge', 'stenographer')
        OR EXISTS (SELECT 1 FROM public.case_assignments ca WHERE ca.case_id = c.id AND ca.lawyer_id = auth.uid())
      )
    )
  );

CREATE POLICY "criminal_details_insert" ON public.criminal_case_details
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.cases c WHERE c.id = case_id AND c.plaintiff_id = auth.uid())
  );

CREATE POLICY "criminal_details_update_court" ON public.criminal_case_details
  FOR UPDATE USING (get_user_role() IN ('admin_court', 'magistrate', 'trial_judge'));

-- ── case_assignments ─────────────────────────────────────────
CREATE POLICY "assignments_select" ON public.case_assignments
  FOR SELECT USING (
    auth.uid() = lawyer_id OR auth.uid() = client_id
    OR get_user_role() IN ('admin_court', 'magistrate', 'trial_judge')
  );

CREATE POLICY "assignments_insert_client" ON public.case_assignments
  FOR INSERT WITH CHECK (auth.uid() = client_id AND get_user_role() = 'client');

CREATE POLICY "assignments_update_lawyer" ON public.case_assignments
  FOR UPDATE USING (auth.uid() = lawyer_id);

-- ── documents ────────────────────────────────────────────────

-- Plaintiff / defendant can view documents for their cases
CREATE POLICY "docs_select_plaintiff_defendant" ON public.documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c WHERE c.id = documents.case_id
        AND (c.plaintiff_id = auth.uid() OR c.defendant_id = auth.uid())
    )
  );

-- Lawyers with pending OR accepted assignment can view documents
-- (pending needed so lawyer can review docs before deciding to accept)
CREATE POLICY "docs_select_lawyer" ON public.documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.case_assignments ca
      WHERE ca.case_id = documents.case_id
        AND ca.lawyer_id = auth.uid()
        AND ca.status IN ('pending', 'accepted')
    )
  );

-- Court officials can view all documents
CREATE POLICY "docs_select_court" ON public.documents
  FOR SELECT USING (
    get_user_role() IN ('admin_court', 'magistrate', 'trial_judge', 'stenographer')
  );

-- Clients can upload to their own cases
CREATE POLICY "docs_insert_client" ON public.documents
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by
    AND get_user_role() = 'client'
    AND EXISTS (
      SELECT 1 FROM public.cases c WHERE c.id = documents.case_id
        AND (c.plaintiff_id = auth.uid() OR c.defendant_id = auth.uid())
    )
  );

-- Lawyers with accepted assignment can upload
CREATE POLICY "docs_insert_lawyer" ON public.documents
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by
    AND get_user_role() = 'lawyer'
    AND EXISTS (
      SELECT 1 FROM public.case_assignments ca
      WHERE ca.case_id = documents.case_id AND ca.lawyer_id = auth.uid() AND ca.status = 'accepted'
    )
  );

-- Judges can upload
CREATE POLICY "docs_insert_judge" ON public.documents
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by AND get_user_role() IN ('magistrate', 'trial_judge')
  );

-- Admin court can upload
CREATE POLICY "docs_insert_admin" ON public.documents
  FOR INSERT WITH CHECK (
    auth.uid() = uploaded_by AND get_user_role() = 'admin_court'
  );

-- Uploaders (lawyer/judge/admin) can update their own documents
CREATE POLICY "docs_update_own" ON public.documents
  FOR UPDATE USING (
    auth.uid() = uploaded_by
    AND get_user_role() IN ('lawyer', 'magistrate', 'trial_judge', 'admin_court')
  );

-- Admin can update any document
CREATE POLICY "docs_update_admin_any" ON public.documents
  FOR UPDATE USING (get_user_role() = 'admin_court');

-- Uploaders (lawyer/judge) can delete their own documents
CREATE POLICY "docs_delete_own" ON public.documents
  FOR DELETE USING (
    auth.uid() = uploaded_by
    AND get_user_role() IN ('lawyer', 'magistrate', 'trial_judge')
  );

-- Admin can delete any document
CREATE POLICY "docs_delete_admin_any" ON public.documents
  FOR DELETE USING (get_user_role() = 'admin_court');

-- ── case_activity_log ────────────────────────────────────────
CREATE POLICY "activity_log_select" ON public.case_activity_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c WHERE c.id = case_id AND (
        c.plaintiff_id = auth.uid() OR c.defendant_id = auth.uid()
        OR get_user_role() IN ('admin_court', 'magistrate', 'trial_judge', 'stenographer')
        OR EXISTS (SELECT 1 FROM public.case_assignments ca WHERE ca.case_id = c.id AND ca.lawyer_id = auth.uid())
      )
    )
  );

CREATE POLICY "activity_log_insert" ON public.case_activity_log
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── payments ─────────────────────────────────────────────────
CREATE POLICY "payments_select_own" ON public.payments
  FOR SELECT USING (auth.uid() = payer_id OR auth.uid() = receiver_id);

CREATE POLICY "payments_select_court" ON public.payments
  FOR SELECT USING (get_user_role() IN ('admin_court', 'magistrate', 'trial_judge'));

CREATE POLICY "payments_insert_payer" ON public.payments
  FOR INSERT WITH CHECK (auth.uid() = payer_id);

CREATE POLICY "payments_update_own" ON public.payments
  FOR UPDATE USING (auth.uid() = payer_id);

-- Lawyers can insert payment records on behalf of the case (fee setup on accept)
CREATE POLICY "payments_insert_lawyer" ON public.payments
  FOR INSERT WITH CHECK (
    get_user_role() = 'lawyer'
    AND auth.uid() = receiver_id
  );

-- ── notifications ────────────────────────────────────────────
CREATE POLICY "notifications_select_own"        ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_update_own"        ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_authenticated" ON public.notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "notifications_delete_own"        ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- ── scrutiny_checklist ───────────────────────────────────────
CREATE POLICY "scrutiny_admin_court_all" ON public.scrutiny_checklist
  FOR ALL USING (get_user_role() IN ('admin_court', 'magistrate'));

CREATE POLICY "scrutiny_case_parties_select" ON public.scrutiny_checklist
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c WHERE c.id = scrutiny_checklist.case_id AND (
        c.plaintiff_id = auth.uid() OR c.defendant_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.case_assignments ca WHERE ca.case_id = c.id AND ca.lawyer_id = auth.uid())
      )
    )
  );

-- ── hearings ─────────────────────────────────────────────────
CREATE POLICY "hearings_court_officials_all" ON public.hearings
  FOR ALL USING (get_user_role() IN ('admin_court', 'magistrate', 'trial_judge', 'stenographer'));

CREATE POLICY "hearings_case_parties_select" ON public.hearings
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c WHERE c.id = hearings.case_id AND (
        c.plaintiff_id = auth.uid() OR c.defendant_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.case_assignments ca WHERE ca.case_id = c.id AND ca.lawyer_id = auth.uid())
      )
    )
  );

-- ── order_sheets ─────────────────────────────────────────────
CREATE POLICY "orders_court_officials_all" ON public.order_sheets
  FOR ALL USING (get_user_role() IN ('admin_court', 'magistrate', 'trial_judge'));

CREATE POLICY "orders_case_parties_select" ON public.order_sheets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.cases c WHERE c.id = order_sheets.case_id AND (
        c.plaintiff_id = auth.uid() OR c.defendant_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.case_assignments ca WHERE ca.case_id = c.id AND ca.lawyer_id = auth.uid())
      )
    )
  );

CREATE POLICY "orders_stenographer_select" ON public.order_sheets
  FOR SELECT USING (get_user_role() = 'stenographer');

-- ── bail_applications ────────────────────────────────────────
CREATE POLICY "bail_view_case_parties" ON public.bail_applications
  FOR SELECT USING (
    get_user_role() IN ('admin_court', 'magistrate', 'trial_judge')
    OR EXISTS (
      SELECT 1 FROM public.cases c WHERE c.id = bail_applications.case_id AND (
        c.plaintiff_id = auth.uid() OR c.defendant_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.case_assignments ca WHERE ca.case_id = c.id AND ca.lawyer_id = auth.uid())
      )
    )
  );

CREATE POLICY "bail_create" ON public.bail_applications
  FOR INSERT WITH CHECK (applicant_id = auth.uid() OR get_user_role() = 'lawyer');

CREATE POLICY "bail_update_court" ON public.bail_applications
  FOR UPDATE USING (get_user_role() IN ('admin_court', 'magistrate', 'trial_judge'));

-- ── investigation_reports ────────────────────────────────────
CREATE POLICY "ir_view" ON public.investigation_reports
  FOR SELECT USING (
    submitted_by = auth.uid()
    OR get_user_role() IN ('admin_court', 'magistrate', 'trial_judge')
    OR EXISTS (
      SELECT 1 FROM public.cases c WHERE c.id = investigation_reports.case_id AND (
        c.plaintiff_id = auth.uid() OR c.defendant_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.case_assignments ca WHERE ca.case_id = c.id AND ca.lawyer_id = auth.uid())
      )
    )
  );

CREATE POLICY "ir_create"       ON public.investigation_reports FOR INSERT WITH CHECK (submitted_by = auth.uid());
CREATE POLICY "ir_update_court" ON public.investigation_reports FOR UPDATE USING (get_user_role() IN ('admin_court', 'magistrate', 'trial_judge'));

-- ── witness_records ──────────────────────────────────────────
CREATE POLICY "witness_records_select" ON public.witness_records
  FOR SELECT USING (
    get_user_role() IN ('admin_court', 'trial_judge', 'magistrate', 'stenographer')
    OR EXISTS (
      SELECT 1 FROM public.cases c WHERE c.id = witness_records.case_id AND (
        c.plaintiff_id = auth.uid() OR c.defendant_id = auth.uid()
        OR c.trial_judge_id = auth.uid() OR c.stenographer_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.case_assignments ca WHERE ca.case_id = c.id AND ca.lawyer_id = auth.uid())
      )
    )
  );

CREATE POLICY "witness_records_insert" ON public.witness_records
  FOR INSERT WITH CHECK (get_user_role() IN ('lawyer', 'trial_judge', 'admin_court', 'magistrate'));

CREATE POLICY "witness_records_update" ON public.witness_records
  FOR UPDATE USING (get_user_role() IN ('lawyer', 'trial_judge', 'admin_court', 'magistrate', 'stenographer'));

-- ── evidence_records ─────────────────────────────────────────
CREATE POLICY "evidence_records_select" ON public.evidence_records
  FOR SELECT USING (
    get_user_role() IN ('admin_court', 'trial_judge', 'magistrate', 'stenographer')
    OR EXISTS (
      SELECT 1 FROM public.cases c WHERE c.id = evidence_records.case_id AND (
        c.plaintiff_id = auth.uid() OR c.defendant_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.case_assignments ca WHERE ca.case_id = c.id AND ca.lawyer_id = auth.uid())
      )
    )
  );

CREATE POLICY "evidence_records_insert" ON public.evidence_records
  FOR INSERT WITH CHECK (get_user_role() IN ('lawyer', 'trial_judge', 'admin_court'));

CREATE POLICY "evidence_records_update" ON public.evidence_records
  FOR UPDATE USING (get_user_role() IN ('trial_judge', 'admin_court', 'magistrate'));

-- ── judgment_records ─────────────────────────────────────────
CREATE POLICY "judgment_records_select" ON public.judgment_records
  FOR SELECT USING (
    get_user_role() IN ('admin_court', 'trial_judge', 'magistrate', 'stenographer')
    OR EXISTS (
      SELECT 1 FROM public.cases c WHERE c.id = judgment_records.case_id AND (
        c.plaintiff_id = auth.uid() OR c.defendant_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.case_assignments ca WHERE ca.case_id = c.id AND ca.lawyer_id = auth.uid())
      )
    )
  );

CREATE POLICY "judgment_records_insert" ON public.judgment_records
  FOR INSERT WITH CHECK (get_user_role() IN ('trial_judge', 'admin_court', 'magistrate'));

CREATE POLICY "judgment_records_update" ON public.judgment_records
  FOR UPDATE USING (delivered_by = auth.uid());

-- ── otp_signatures ───────────────────────────────────────────
CREATE POLICY "otp_signatures_select_own"          ON public.otp_signatures FOR SELECT USING (signer_id = auth.uid());
CREATE POLICY "otp_signatures_select_officials"    ON public.otp_signatures FOR SELECT USING (get_user_role() IN ('admin_court', 'trial_judge', 'magistrate'));
CREATE POLICY "otp_signatures_select_case_parties" ON public.otp_signatures
  FOR SELECT USING (
    document_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.documents d JOIN public.cases c ON c.id = d.case_id
      WHERE d.id = otp_signatures.document_id AND (
        c.plaintiff_id = auth.uid() OR c.defendant_id = auth.uid()
        OR EXISTS (SELECT 1 FROM public.case_assignments ca WHERE ca.case_id = c.id AND ca.lawyer_id = auth.uid())
      )
    )
  );

CREATE POLICY "otp_signatures_insert" ON public.otp_signatures FOR INSERT WITH CHECK (signer_id = auth.uid());
CREATE POLICY "otp_signatures_update" ON public.otp_signatures FOR UPDATE USING (signer_id = auth.uid() AND otp_verified = false);

-- ── judge_drafts ─────────────────────────────────────────────
CREATE POLICY "judge_drafts_select_own"  ON public.judge_drafts FOR SELECT USING (auth.uid() = judge_id);
CREATE POLICY "judge_drafts_insert"      ON public.judge_drafts FOR INSERT WITH CHECK (auth.uid() = judge_id AND get_user_role() IN ('magistrate', 'trial_judge'));
CREATE POLICY "judge_drafts_update_own"  ON public.judge_drafts FOR UPDATE USING (auth.uid() = judge_id AND is_published = false);
CREATE POLICY "judge_drafts_delete_own"  ON public.judge_drafts FOR DELETE USING (auth.uid() = judge_id AND is_published = false);

-- ── document_requests ────────────────────────────────────────
CREATE POLICY "doc_requests_select_lawyer" ON public.document_requests FOR SELECT USING (auth.uid() = requested_by);
CREATE POLICY "doc_requests_select_client" ON public.document_requests FOR SELECT USING (auth.uid() = requested_from);
CREATE POLICY "doc_requests_select_court"  ON public.document_requests FOR SELECT USING (get_user_role() IN ('admin_court', 'magistrate', 'trial_judge'));
CREATE POLICY "doc_requests_insert"        ON public.document_requests FOR INSERT WITH CHECK (auth.uid() = requested_by);
CREATE POLICY "doc_requests_update"        ON public.document_requests FOR UPDATE USING (auth.uid() = requested_by OR auth.uid() = requested_from);


-- ============================================================
-- STORAGE BUCKET POLICIES (run after creating buckets)
-- Run: INSERT INTO storage.buckets (id, name, public) VALUES ('case-documents', 'case-documents', false);
-- ============================================================

DROP POLICY IF EXISTS "case_documents_select" ON storage.objects;
DROP POLICY IF EXISTS "case_documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "case_documents_delete" ON storage.objects;

CREATE POLICY "case_documents_select" ON storage.objects
  FOR SELECT USING (bucket_id = 'case-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "case_documents_insert" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'case-documents' AND auth.uid() IS NOT NULL);

CREATE POLICY "case_documents_delete" ON storage.objects
  FOR DELETE USING (bucket_id = 'case-documents' AND auth.uid() IS NOT NULL);


-- ============================================================
-- REALTIME
-- Enable in Supabase dashboard or run:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
-- ============================================================
