import Badge from "./Badge";
import type { CaseStatus } from "@/lib/constants";
import { CASE_STATUS_LABELS } from "@/lib/constants";

const statusVariants: Record<string, "default" | "success" | "danger" | "warning" | "info" | "primary"> = {
  draft: "default",
  pending_lawyer_acceptance: "warning",
  lawyer_accepted: "info",
  payment_pending: "warning",
  payment_confirmed: "success",
  drafting: "info",
  submitted_to_admin: "primary",
  under_scrutiny: "primary",
  returned_for_revision: "danger",
  registered: "success",
  summon_issued: "info",
  preliminary_hearing: "primary",
  issues_framed: "info",
  transferred_to_trial: "primary",
  evidence_stage: "info",
  arguments: "info",
  reserved_for_judgment: "warning",
  judgment_delivered: "success",
  closed: "default",
  disposed: "default",
};

interface StatusBadgeProps {
  status: CaseStatus;
  className?: string;
}

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <Badge variant={statusVariants[status] || "default"} className={className}>
      {CASE_STATUS_LABELS[status] || status}
    </Badge>
  );
}
