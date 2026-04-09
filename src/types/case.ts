import type { CaseType, CaseStatus, CaseCategory } from "@/lib/constants";

export interface Case {
  id: string;
  case_number: string;
  case_type: CaseType;
  /** Sub-classification stored in case_category column */
  case_category: CaseCategory | null;
  status: CaseStatus;
  title: string;
  description: string | null;

  plaintiff_id: string | null;
  defendant_id: string | null;

  admin_court_id: string | null;
  trial_judge_id: string | null;
  stenographer_id: string | null;

  current_phase: string;
  sensitivity: "normal" | "sensitive" | "highly_sensitive";
  filing_date: string | null;
  registration_date: string | null;
  next_hearing_date: string | null;
  disposal_date: string | null;

  /** Plaintiff contact info captured at filing */
  plaintiff_name: string | null;
  plaintiff_phone: string | null;
  plaintiff_cnic: string | null;
  plaintiff_address: string | null;

  defendant_name: string | null;
  defendant_email: string | null;
  defendant_phone: string | null;
  defendant_cnic: string | null;
  defendant_address: string | null;

  /** Marriage/divorce certificate number (family cases) */
  marriage_certificate_number: string | null;

  summon_sent_at: string | null;
  summon_sent_by: string | null;

  created_at: string;
  updated_at: string;
}

export interface CaseWithRelations extends Case {
  plaintiff?: { id: string; full_name: string; email: string } | null;
  defendant?: { id: string; full_name: string; email: string } | null;
  trial_judge?: { id: string; full_name: string; email: string } | null;
  assignments?: CaseAssignment[];
  criminal_details?: CriminalCaseDetails | null;
}

export interface CriminalCaseDetails {
  id: string;
  case_id: string;
  fir_number: string | null;
  police_station: string | null;
  offense_description: string | null;
  offense_section: string | null;
  io_name: string | null;
  io_contact: string | null;
  bail_status: "not_applicable" | "applied" | "granted" | "denied" | "cancelled";
  arrest_date: string | null;
  evidence_type: "oral" | "documentary" | null;
  created_at: string;
}

export type AssignmentStatus = "pending" | "accepted" | "declined";
export type AssignmentSide = "plaintiff" | "defendant";

export interface CaseAssignment {
  id: string;
  case_id: string;
  lawyer_id: string;
  client_id: string;
  side: AssignmentSide;
  status: AssignmentStatus;
  fee_amount: number | null;
  allow_installments: boolean;
  installment_count: number;
  decline_reason: string | null;
  assigned_at: string;
  responded_at: string | null;
  lawyer?: {
    id: string;
    full_name: string;
    email: string;
  };
}

export type DocumentType =
  | "plaint"
  | "written_statement"
  | "affidavit"
  | "evidence"
  | "court_order"
  | "judgment"
  | "application"
  | "fir_copy"
  | "power_of_attorney"
  | "vakalatnama"
  | "other";

export interface CaseDocument {
  id: string;
  case_id: string;
  uploaded_by: string;
  document_type: DocumentType;
  title: string;
  description: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  mime_type: string | null;
  is_signed: boolean;
  signed_by: string | null;
  signed_at: string | null;
  created_at: string;
  /** Joined from profiles — available when fetched via useCase */
  uploader?: { id: string; full_name: string; email: string } | null;
}

export interface JudgeDraft {
  id: string;
  case_id: string;
  judge_id: string;
  title: string;
  content: string;
  hearing_id: string | null;
  is_published: boolean;
  published_at: string | null;
  published_document_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CaseActivityLog {
  id: string;
  case_id: string;
  actor_id: string | null;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
  actor?: { full_name: string };
}

export interface LawyerWithProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  city: string | null;
  lawyer_profiles: {
    bar_license_number: string;
    specialization: string[];
    experience_years: number;
    bio: string | null;
    hourly_rate: number | null;
    rating: number;
    total_reviews: number;
    is_available: boolean;
    location: string | null;
  };
}
