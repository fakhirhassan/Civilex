export type HearingType = "preliminary" | "regular" | "arguments" | "judgment" | "bail" | "miscellaneous";
export type HearingStatus = "scheduled" | "in_progress" | "completed" | "adjourned" | "cancelled";
export type OrderType = "interim" | "final" | "adjournment" | "summon" | "bail" | "transfer" | "miscellaneous";
export type ScrutinyDecision = "pending" | "approved" | "returned";

export interface Hearing {
  id: string;
  case_id: string;
  hearing_number: number;
  hearing_type: HearingType;
  scheduled_date: string;
  actual_date: string | null;
  presiding_officer_id: string | null;
  courtroom: string | null;
  proceedings_summary: string | null;
  judge_remarks: string | null;
  next_hearing_date: string | null;
  status: HearingStatus;
  created_at: string;
  updated_at: string;
}

export interface HearingWithRelations extends Hearing {
  case?: {
    id: string;
    case_number: string;
    title: string;
    status: string;
  };
  presiding_officer?: {
    id: string;
    full_name: string;
    email: string;
  } | null;
  order_sheets?: OrderSheet[];
}

export interface OrderSheet {
  id: string;
  hearing_id: string | null;
  case_id: string;
  order_type: OrderType;
  order_text: string;
  issued_by: string;
  created_at: string;
  issuer?: {
    id: string;
    full_name: string;
  };
}

export interface ScrutinyChecklist {
  id: string;
  case_id: string;
  reviewed_by: string;
  proper_documentation: boolean;
  court_fees_paid: boolean;
  jurisdiction_verified: boolean;
  parties_identified: boolean;
  cause_of_action_valid: boolean;
  limitation_period_checked: boolean;
  proper_format: boolean;
  decision: ScrutinyDecision;
  remarks: string | null;
  reviewed_at: string | null;
  created_at: string;
  reviewer?: {
    id: string;
    full_name: string;
  };
}

export interface ScrutinyQueueItem {
  id: string;
  case_number: string;
  title: string;
  case_type: string;
  status: string;
  filing_date: string | null;
  plaintiff?: { id: string; full_name: string } | null;
  scrutiny?: ScrutinyChecklist | null;
}

export const HEARING_TYPE_LABELS: Record<HearingType, string> = {
  preliminary: "Preliminary Hearing",
  regular: "Regular Hearing",
  arguments: "Arguments",
  judgment: "Judgment",
  bail: "Bail Hearing",
  miscellaneous: "Miscellaneous",
};

export const HEARING_STATUS_LABELS: Record<HearingStatus, string> = {
  scheduled: "Scheduled",
  in_progress: "In Progress",
  completed: "Completed",
  adjourned: "Adjourned",
  cancelled: "Cancelled",
};

export const ORDER_TYPE_LABELS: Record<OrderType, string> = {
  interim: "Interim Order",
  final: "Final Order",
  adjournment: "Adjournment",
  summon: "Summon",
  bail: "Bail Order",
  transfer: "Transfer Order",
  miscellaneous: "Miscellaneous",
};

export const SCRUTINY_CHECKS = [
  { key: "proper_documentation" as const, label: "Proper Documentation", description: "All required documents are attached and complete" },
  { key: "court_fees_paid" as const, label: "Court Fees Paid", description: "Court filing fees have been paid" },
  { key: "jurisdiction_verified" as const, label: "Jurisdiction Verified", description: "Case falls within this court's jurisdiction" },
  { key: "parties_identified" as const, label: "Parties Identified", description: "All parties are properly identified with correct details" },
  { key: "cause_of_action_valid" as const, label: "Cause of Action Valid", description: "The stated cause of action is legally valid" },
  { key: "limitation_period_checked" as const, label: "Limitation Period Checked", description: "Case is within the statutory limitation period" },
  { key: "proper_format" as const, label: "Proper Format", description: "Filing follows the prescribed court format" },
] as const;
