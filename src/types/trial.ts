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

export interface EvidenceIssueLink {
  id: string;
  evidence_id: string;
  issue_id: string;
  case_id: string;
  tagged_by: string | null;
  created_at: string;
  issue?: {
    id: string;
    issue_number: number;
    issue_text: string;
  } | null;
}

export interface EvidenceRecordWithRelations extends EvidenceRecord {
  submitted_by_profile?: { full_name: string } | null;
  document?: { title: string; file_name: string; file_path: string } | null;
  issue_links?: EvidenceIssueLink[];
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

export type DecreeType =
  | "money"
  | "possession"
  | "injunction"
  | "declaration"
  | "specific_performance"
  | "partition"
  | "dismissal"
  | "compromise"
  | "other";

export type DecreeStatus =
  | "drafted"
  | "signed"
  | "executed"
  | "satisfied"
  | "pending_execution";

export interface Decree {
  id: string;
  case_id: string;
  judgment_id: string | null;
  decree_number: string | null;
  decree_type: DecreeType;
  status: DecreeStatus;
  decree_holder_id: string | null;
  judgment_debtor_id: string | null;
  operative_text: string;
  relief_granted: string | null;
  amount_awarded: number | null;
  costs_awarded: number | null;
  interest_terms: string | null;
  compliance_period_days: number | null;
  drawn_up_by: string | null;
  drawn_up_at: string | null;
  signed_by: string | null;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DecreeWithRelations extends Decree {
  decree_holder?: { id: string; full_name: string } | null;
  judgment_debtor?: { id: string; full_name: string } | null;
  drawn_up_by_profile?: { id: string; full_name: string } | null;
  signed_by_profile?: { id: string; full_name: string } | null;
}

export const DECREE_TYPE_LABELS: Record<DecreeType, string> = {
  money: "Money Decree",
  possession: "Possession",
  injunction: "Injunction",
  declaration: "Declaratory",
  specific_performance: "Specific Performance",
  partition: "Partition",
  dismissal: "Dismissal",
  compromise: "Compromise / Settlement",
  other: "Other",
};

export const DECREE_STATUS_LABELS: Record<DecreeStatus, string> = {
  drafted: "Drafted",
  signed: "Signed",
  pending_execution: "Pending Execution",
  executed: "Executed",
  satisfied: "Satisfied",
};

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

// Phase 8: Appeals (CPC Section 96, Order XLI)

export type AppealForum = "district_court" | "high_court" | "supreme_court";
export type AppealSide = "plaintiff" | "defendant";
export type AppealStatus =
  | "filed"
  | "admitted"
  | "rejected"
  | "dismissed"
  | "allowed"
  | "withdrawn"
  | "time_barred";

export interface Appeal {
  id: string;
  case_id: string;
  decree_id: string | null;
  judgment_id: string | null;
  appeal_number: string | null;
  appellate_forum: AppealForum;
  appellant_side: AppealSide;
  appellant_id: string;
  respondent_id: string | null;
  judgment_date: string;
  limitation_days: number;
  filed_on: string;
  is_time_barred: boolean;
  condonation_requested: boolean;
  condonation_reason: string | null;
  grounds_of_appeal: string;
  relief_sought: string;
  status: AppealStatus;
  admitted_at: string | null;
  admitted_by: string | null;
  disposal_date: string | null;
  disposal_reason: string | null;
  filed_by: string;
  created_at: string;
  updated_at: string;
}

export interface AppealWithRelations extends Appeal {
  appellant?: { id: string; full_name: string } | null;
  respondent?: { id: string; full_name: string } | null;
  filed_by_profile?: { id: string; full_name: string } | null;
  admitted_by_profile?: { id: string; full_name: string } | null;
}

export const APPEAL_FORUM_LABELS: Record<AppealForum, string> = {
  district_court: "District Court",
  high_court: "High Court",
  supreme_court: "Supreme Court",
};

export const APPEAL_SIDE_LABELS: Record<AppealSide, string> = {
  plaintiff: "Original Plaintiff",
  defendant: "Original Defendant",
};

export const APPEAL_STATUS_LABELS: Record<AppealStatus, string> = {
  filed: "Filed",
  admitted: "Admitted",
  rejected: "Rejected",
  dismissed: "Dismissed",
  allowed: "Allowed",
  withdrawn: "Withdrawn",
  time_barred: "Time-Barred",
};

// Default limitation periods under the Limitation Act 1908
export const APPEAL_FORUM_LIMITATION_DAYS: Record<AppealForum, number> = {
  district_court: 30,
  high_court: 90,
  supreme_court: 30,
};

// Phase 9: Execution of Decree (CPC Order XXI)

export type ExecutionMode =
  | "attachment_movable"
  | "attachment_immovable"
  | "sale_movable"
  | "sale_immovable"
  | "delivery_possession"
  | "arrest_detention"
  | "appoint_receiver"
  | "payment_into_court"
  | "other";

export type ExecutionStatus =
  | "filed"
  | "notice_issued"
  | "attachment_ordered"
  | "property_attached"
  | "sale_ordered"
  | "warrant_issued"
  | "satisfied"
  | "partially_satisfied"
  | "struck_off"
  | "dismissed";

export type WarrantType =
  | "attachment"
  | "arrest"
  | "delivery"
  | "sale_proclamation";

export type WarrantStatus =
  | "issued"
  | "served"
  | "returned_executed"
  | "returned_unexecuted"
  | "recalled";

export interface ExecutionApplication {
  id: string;
  case_id: string;
  decree_id: string;
  execution_number: string | null;
  execution_mode: ExecutionMode;
  status: ExecutionStatus;
  decree_holder_id: string;
  judgment_debtor_id: string;
  decretal_amount: number | null;
  amount_recovered: number | null;
  property_description: string | null;
  property_location: string | null;
  grounds: string;
  relief_sought: string;
  filed_on: string;
  notice_issued_at: string | null;
  attachment_ordered_at: string | null;
  satisfied_at: string | null;
  satisfaction_note: string | null;
  filed_by: string;
  presiding_officer_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ExecutionWarrant {
  id: string;
  execution_id: string;
  warrant_number: string | null;
  warrant_type: WarrantType;
  status: WarrantStatus;
  issued_on: string;
  returnable_by: string | null;
  bailiff_name: string | null;
  directions: string;
  served_on: string | null;
  return_note: string | null;
  issued_by: string;
  created_at: string;
  updated_at: string;
}

export interface ExecutionWarrantWithRelations extends ExecutionWarrant {
  issued_by_profile?: { id: string; full_name: string } | null;
}

export interface ExecutionApplicationWithRelations extends ExecutionApplication {
  decree_holder?: { id: string; full_name: string } | null;
  judgment_debtor?: { id: string; full_name: string } | null;
  filed_by_profile?: { id: string; full_name: string } | null;
  warrants?: ExecutionWarrantWithRelations[];
}

export const EXECUTION_MODE_LABELS: Record<ExecutionMode, string> = {
  attachment_movable: "Attachment of Movable Property",
  attachment_immovable: "Attachment of Immovable Property",
  sale_movable: "Sale of Movable Property",
  sale_immovable: "Sale of Immovable Property",
  delivery_possession: "Delivery of Possession",
  arrest_detention: "Arrest & Detention",
  appoint_receiver: "Appointment of Receiver",
  payment_into_court: "Payment into Court",
  other: "Other",
};

export const EXECUTION_STATUS_LABELS: Record<ExecutionStatus, string> = {
  filed: "Filed",
  notice_issued: "Notice Issued",
  attachment_ordered: "Attachment Ordered",
  property_attached: "Property Attached",
  sale_ordered: "Sale Ordered",
  warrant_issued: "Warrant Issued",
  satisfied: "Satisfied",
  partially_satisfied: "Partially Satisfied",
  struck_off: "Struck Off",
  dismissed: "Dismissed",
};

export const WARRANT_TYPE_LABELS: Record<WarrantType, string> = {
  attachment: "Attachment Warrant",
  arrest: "Arrest Warrant",
  delivery: "Delivery Warrant",
  sale_proclamation: "Sale Proclamation",
};

export const WARRANT_STATUS_LABELS: Record<WarrantStatus, string> = {
  issued: "Issued",
  served: "Served",
  returned_executed: "Returned — Executed",
  returned_unexecuted: "Returned — Unexecuted",
  recalled: "Recalled",
};

export const VERDICT_OPTIONS = [
  { value: "in_favor_plaintiff", label: "In Favor of Plaintiff" },
  { value: "in_favor_defendant", label: "In Favor of Defendant" },
  { value: "partially_allowed", label: "Partially Allowed" },
  { value: "dismissed", label: "Dismissed" },
  { value: "convicted", label: "Convicted" },
  { value: "acquitted", label: "Acquitted" },
  { value: "compromised", label: "Compromised / Settlement" },
];
