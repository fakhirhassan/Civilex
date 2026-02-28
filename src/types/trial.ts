// Phase 7: Trial Court Proceedings Types

export type WitnessStatus =
  | "listed"
  | "summoned"
  | "examined"
  | "cross_examined"
  | "recalled"
  | "hostile"
  | "excused";

export type WitnessSide = "prosecution" | "defense" | "court";

export type EvidenceStatus =
  | "submitted"
  | "admitted"
  | "objected"
  | "rejected"
  | "marked";

export interface WitnessRecord {
  id: string;
  case_id: string;
  hearing_id: string | null;
  witness_name: string;
  witness_cnic: string | null;
  witness_contact: string | null;
  witness_address: string | null;
  witness_side: WitnessSide;
  relation_to_case: string | null;
  statement: string | null;
  cross_examination: string | null;
  re_examination: string | null;
  judge_notes: string | null;
  status: WitnessStatus;
  examination_date: string | null;
  added_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface WitnessRecordWithRelations extends WitnessRecord {
  added_by_profile?: { full_name: string } | null;
  hearing?: { hearing_number: number; scheduled_date: string } | null;
}

export interface EvidenceRecord {
  id: string;
  case_id: string;
  document_id: string | null;
  exhibit_number: string | null;
  evidence_type: string;
  description: string;
  submitted_by: string | null;
  submitted_by_side: WitnessSide;
  status: EvidenceStatus;
  admission_date: string | null;
  objection_remarks: string | null;
  court_remarks: string | null;
  created_at: string;
  updated_at: string;
}

export interface EvidenceRecordWithRelations extends EvidenceRecord {
  submitted_by_profile?: { full_name: string } | null;
  document?: { title: string; file_name: string; file_path: string } | null;
}

export interface JudgmentRecord {
  id: string;
  case_id: string;
  hearing_id: string | null;
  judgment_text: string;
  judgment_summary: string | null;
  verdict: string;
  relief_granted: string | null;
  costs_awarded: string | null;
  sentence_details: string | null;
  delivered_by: string | null;
  delivery_date: string;
  is_signed: boolean;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JudgmentRecordWithRelations extends JudgmentRecord {
  delivered_by_profile?: { full_name: string } | null;
  hearing?: { hearing_number: number; scheduled_date: string } | null;
}

// Label maps
export const WITNESS_STATUS_LABELS: Record<WitnessStatus, string> = {
  listed: "Listed",
  summoned: "Summoned",
  examined: "Examined",
  cross_examined: "Cross-Examined",
  recalled: "Recalled",
  hostile: "Hostile",
  excused: "Excused",
};

export const WITNESS_SIDE_LABELS: Record<WitnessSide, string> = {
  prosecution: "Prosecution",
  defense: "Defense",
  court: "Court Witness",
};

export const EVIDENCE_STATUS_LABELS: Record<EvidenceStatus, string> = {
  submitted: "Submitted",
  admitted: "Admitted",
  objected: "Objected",
  rejected: "Rejected",
  marked: "Marked as Exhibit",
};

export const EVIDENCE_TYPE_OPTIONS = [
  { value: "documentary", label: "Documentary" },
  { value: "physical", label: "Physical" },
  { value: "digital", label: "Digital" },
  { value: "testimonial", label: "Testimonial" },
  { value: "forensic", label: "Forensic" },
  { value: "photographic", label: "Photographic" },
  { value: "expert_opinion", label: "Expert Opinion" },
  { value: "other", label: "Other" },
];

export const VERDICT_OPTIONS = [
  { value: "in_favor_plaintiff", label: "In Favor of Plaintiff" },
  { value: "in_favor_defendant", label: "In Favor of Defendant" },
  { value: "partially_allowed", label: "Partially Allowed" },
  { value: "dismissed", label: "Dismissed" },
  { value: "convicted", label: "Convicted" },
  { value: "acquitted", label: "Acquitted" },
  { value: "compromised", label: "Compromised / Settlement" },
];
