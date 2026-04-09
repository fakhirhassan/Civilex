export type NotificationType =
  | "case_filed"
  | "case_assigned"
  | "case_accepted"
  | "case_declined"
  | "case_status_changed"
  | "payment_pending"
  | "payment_completed"
  | "hearing_scheduled"
  | "hearing_reminder"
  | "document_uploaded"
  | "scrutiny_approved"
  | "scrutiny_returned"
  | "judgment_delivered"
  | "summon_issued"
  | "document_requested"
  | "general";

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: NotificationType;
  reference_type: string | null;
  reference_id: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}
