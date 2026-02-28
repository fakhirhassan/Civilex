export type BailApplicationType = "pre_arrest" | "post_arrest" | "regular" | "interim";
export type BailStatus = "pending" | "hearing_scheduled" | "granted" | "denied" | "cancelled" | "withdrawn";
export type InvestigationStatus = "pending" | "in_progress" | "completed" | "report_submitted";
export type InvestigationReportType = "initial" | "progress" | "final" | "supplementary";
export type InvestigationReportStatus = "submitted" | "reviewed" | "accepted" | "returned";

export interface BailApplication {
  id: string;
  case_id: string;
  applicant_id: string;
  lawyer_id: string | null;
  application_type: BailApplicationType;
  grounds: string;
  surety_details: string | null;
  surety_amount: number | null;
  status: BailStatus;
  decision_date: string | null;
  decision_remarks: string | null;
  decided_by: string | null;
  conditions: string | null;
  hearing_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface BailApplicationWithRelations extends BailApplication {
  applicant?: { id: string; full_name: string; email: string };
  lawyer?: { id: string; full_name: string } | null;
  decided_by_profile?: { id: string; full_name: string } | null;
}

export interface InvestigationReport {
  id: string;
  case_id: string;
  submitted_by: string;
  report_type: InvestigationReportType;
  report_text: string;
  findings: string | null;
  recommendations: string | null;
  evidence_collected: string | null;
  status: InvestigationReportStatus;
  reviewed_by: string | null;
  review_remarks: string | null;
  created_at: string;
}

export interface InvestigationReportWithRelations extends InvestigationReport {
  submitter?: { id: string; full_name: string };
  reviewer?: { id: string; full_name: string } | null;
}

export interface CriminalCaseDetailsExtended {
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
  investigation_status: InvestigationStatus;
  challan_submitted: boolean;
  challan_date: string | null;
  magistrate_remarks: string | null;
  next_io_report_date: string | null;
  created_at: string;
  updated_at: string | null;
}

export const BAIL_APPLICATION_TYPE_LABELS: Record<BailApplicationType, string> = {
  pre_arrest: "Pre-Arrest Bail",
  post_arrest: "Post-Arrest Bail",
  regular: "Regular Bail",
  interim: "Interim Bail",
};

export const BAIL_STATUS_LABELS: Record<BailStatus, string> = {
  pending: "Pending",
  hearing_scheduled: "Hearing Scheduled",
  granted: "Granted",
  denied: "Denied",
  cancelled: "Cancelled",
  withdrawn: "Withdrawn",
};

export const INVESTIGATION_STATUS_LABELS: Record<InvestigationStatus, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
  report_submitted: "Report Submitted",
};

export const INVESTIGATION_REPORT_TYPE_LABELS: Record<InvestigationReportType, string> = {
  initial: "Initial Report",
  progress: "Progress Report",
  final: "Final Report",
  supplementary: "Supplementary Report",
};

export const INVESTIGATION_REPORT_STATUS_LABELS: Record<InvestigationReportStatus, string> = {
  submitted: "Submitted",
  reviewed: "Reviewed",
  accepted: "Accepted",
  returned: "Returned",
};
