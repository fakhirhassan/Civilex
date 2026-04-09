"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { formatDateTime } from "@/lib/utils";
import { CASE_STATUS_LABELS } from "@/lib/constants";
import type { CaseStatus } from "@/lib/constants";
import type { CaseActivityLog } from "@/types/case";
import {
  FileText,
  UserCheck,
  UserX,
  CreditCard,
  Briefcase,
  Clock,
  CheckCircle,
  AlertCircle,
  Upload,
  Shield,
  Scale,
  Gavel,
  Mail,
  Users,
  Calendar,
} from "lucide-react";

interface CaseTimelineProps {
  caseId: string;
  currentStatus: string;
}

// ── 7-Stage Pipeline ───────────────────────────────────────────────────────────

interface PipelineStage {
  id: string;
  label: string;
  description: string;
  icon: typeof Briefcase;
  /** DB statuses that count as "this stage completed" */
  completedWhen: string[];
  /** DB statuses that mean "currently in this stage" */
  activeWhen: string[];
}

const PIPELINE_STAGES: PipelineStage[] = [
  {
    id: "filed",
    label: "Filed",
    description: "Case submitted and lawyer confirmed payment",
    icon: Briefcase,
    completedWhen: [
      "submitted_to_admin", "under_scrutiny", "returned_for_revision",
      "registered", "summon_issued", "preliminary_hearing", "issues_framed",
      "transferred_to_trial", "evidence_stage", "arguments",
      "reserved_for_judgment", "judgment_delivered", "closed", "disposed",
    ],
    activeWhen: ["draft", "pending_lawyer_acceptance", "payment_pending", "payment_confirmed", "drafting"],
  },
  {
    id: "verified",
    label: "Verified by Admin",
    description: "Admin court scrutiny approved and case registered",
    icon: Shield,
    completedWhen: [
      "registered", "summon_issued", "preliminary_hearing", "issues_framed",
      "transferred_to_trial", "evidence_stage", "arguments",
      "reserved_for_judgment", "judgment_delivered", "closed", "disposed",
    ],
    activeWhen: ["submitted_to_admin", "under_scrutiny", "returned_for_revision"],
  },
  {
    id: "summon",
    label: "Summon Sent",
    description: "Defendant formally summoned to appear",
    icon: Mail,
    completedWhen: [
      "preliminary_hearing", "issues_framed", "transferred_to_trial",
      "evidence_stage", "arguments", "reserved_for_judgment",
      "judgment_delivered", "closed", "disposed",
    ],
    activeWhen: ["summon_issued"],
  },
  {
    id: "defendant",
    label: "Defendant Responded",
    description: "Defendant acknowledged summon and responded",
    icon: Users,
    completedWhen: [
      "issues_framed", "transferred_to_trial", "evidence_stage",
      "arguments", "reserved_for_judgment", "judgment_delivered",
      "closed", "disposed",
    ],
    activeWhen: ["preliminary_hearing"],
  },
  {
    id: "judge",
    label: "Assigned to Judge",
    description: "Judge appointed to preside over hearings",
    icon: Gavel,
    completedWhen: [
      "evidence_stage", "arguments", "reserved_for_judgment",
      "judgment_delivered", "closed", "disposed",
    ],
    activeWhen: ["issues_framed", "transferred_to_trial"],
  },
  {
    id: "hearings",
    label: "Hearings Scheduled",
    description: "Hearings are being conducted before the judge",
    icon: Calendar,
    completedWhen: [
      "reserved_for_judgment", "judgment_delivered", "closed", "disposed",
    ],
    activeWhen: ["evidence_stage", "arguments"],
  },
  {
    id: "decision",
    label: "Decision / Reconciliation",
    description: "Judgment delivered or case reconciled",
    icon: Scale,
    completedWhen: ["judgment_delivered", "closed", "disposed"],
    activeWhen: ["reserved_for_judgment"],
  },
];

function getStagePipelineState(
  stage: PipelineStage,
  status: string
): "completed" | "active" | "future" {
  if (stage.completedWhen.includes(status)) return "completed";
  if (stage.activeWhen.includes(status)) return "active";
  return "future";
}

// ── Activity log config ────────────────────────────────────────────────────────

const actionConfig: Record<
  string,
  { icon: typeof FileText; color: string; bg: string; label: string }
> = {
  case_created: { icon: Briefcase, color: "text-primary", bg: "bg-primary/10", label: "Case Filed" },
  lawyer_accepted: { icon: UserCheck, color: "text-success", bg: "bg-green-50", label: "Lawyer Accepted" },
  lawyer_declined: { icon: UserX, color: "text-danger", bg: "bg-red-50", label: "Lawyer Declined" },
  payment_confirmed: { icon: CreditCard, color: "text-success", bg: "bg-green-50", label: "Payment Confirmed" },
  status_changed: { icon: Clock, color: "text-info", bg: "bg-blue-50", label: "Status Changed" },
  document_uploaded: { icon: Upload, color: "text-primary", bg: "bg-primary/10", label: "Document Uploaded" },
  scrutiny_approved: { icon: Shield, color: "text-success", bg: "bg-green-50", label: "Scrutiny Approved" },
  scrutiny_returned: { icon: AlertCircle, color: "text-warning", bg: "bg-amber-50", label: "Returned for Revision" },
  hearing_scheduled: { icon: Calendar, color: "text-info", bg: "bg-blue-50", label: "Hearing Scheduled" },
  judgment_delivered: { icon: Scale, color: "text-primary", bg: "bg-primary/10", label: "Judgment Delivered" },
  judge_assigned: { icon: Gavel, color: "text-info", bg: "bg-blue-50", label: "Judge Assigned" },
  summon_issued: { icon: Mail, color: "text-primary", bg: "bg-primary/10", label: "Summon Issued" },
};

const defaultConfig = {
  icon: FileText,
  color: "text-muted",
  bg: "bg-cream-dark",
  label: "Activity",
};

export default function CaseTimeline({ caseId, currentStatus }: CaseTimelineProps) {
  const [activities, setActivities] = useState<CaseActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("case_activity_log")
          .select(`*, actor:profiles!case_activity_log_actor_id_fkey(full_name)`)
          .eq("case_id", caseId)
          .order("created_at", { ascending: false });

        if (!error) setActivities((data as CaseActivityLog[]) || []);
      } catch (err) {
        console.error("Error fetching activities:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchActivities();
  }, [caseId]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── 7-Stage Visual Pipeline ── */}
      <Card>
        <h3 className="mb-6 text-lg font-semibold text-primary">Case Journey</h3>

        {/* Horizontal stages — scrollable on mobile */}
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max items-start gap-0">
            {PIPELINE_STAGES.map((stage, i) => {
              const state = getStagePipelineState(stage, currentStatus);
              const Icon = stage.icon;
              const isLast = i === PIPELINE_STAGES.length - 1;

              return (
                <div key={stage.id} className="flex items-start">
                  {/* Stage node */}
                  <div className="flex w-32 flex-col items-center gap-2 px-1">
                    {/* Circle */}
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                        state === "completed"
                          ? "bg-success text-white shadow-sm"
                          : state === "active"
                            ? "bg-primary text-white ring-4 ring-primary/20 shadow-md"
                            : "bg-cream-dark text-muted"
                      }`}
                    >
                      {state === "completed" ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <Icon className="h-5 w-5" />
                      )}
                    </div>

                    {/* Label */}
                    <div className="text-center">
                      <p
                        className={`text-xs font-semibold leading-tight ${
                          state === "active"
                            ? "text-primary"
                            : state === "completed"
                              ? "text-success"
                              : "text-muted"
                        }`}
                      >
                        {stage.label}
                      </p>
                      {state === "active" && (
                        <Badge variant="primary" className="mt-1 text-[10px]">
                          Current
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Connector line */}
                  {!isLast && (
                    <div className="mt-6 flex-1 self-start">
                      <div
                        className={`h-0.5 w-8 ${
                          getStagePipelineState(stage, currentStatus) === "completed" &&
                          getStagePipelineState(PIPELINE_STAGES[i + 1], currentStatus) !== "future"
                            ? "bg-success"
                            : "bg-cream-dark"
                        }`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Current stage description */}
        {(() => {
          const activeStage = PIPELINE_STAGES.find((s) => getStagePipelineState(s, currentStatus) === "active");
          const stage = activeStage ?? PIPELINE_STAGES[PIPELINE_STAGES.length - 1];
          return (
            <div className="mt-4 rounded-lg bg-cream-light px-4 py-3">
              <p className="text-sm font-medium text-primary">
                {CASE_STATUS_LABELS[currentStatus as CaseStatus] || currentStatus.replace(/_/g, " ")}
              </p>
              <p className="mt-0.5 text-xs text-muted">{stage.description}</p>
            </div>
          );
        })()}
      </Card>

      {/* ── Detailed Status Progress ── */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-primary">Status Progress</h3>
        <DetailedStatusStepper currentStatus={currentStatus} />
      </Card>

      {/* ── Activity Log ── */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-primary">Activity Log</h3>

        {activities.length === 0 ? (
          <p className="text-sm text-muted">No activity recorded yet.</p>
        ) : (
          <div className="relative">
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-0">
              {activities.map((activity) => {
                const config = actionConfig[activity.action] || defaultConfig;
                const Icon = config.icon;
                const details = activity.details || {};

                return (
                  <div key={activity.id} className="relative flex gap-4 pb-6 last:pb-0">
                    <div
                      className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.bg} ring-4 ring-cream-light`}
                    >
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>

                    <div className="flex-1 pt-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">{config.label}</p>
                          {activity.actor?.full_name && (
                            <p className="text-xs text-muted">by {activity.actor.full_name}</p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-muted">
                          {formatDateTime(activity.created_at)}
                        </span>
                      </div>

                      {Object.keys(details).length > 0 && (
                        <div className="mt-1.5 rounded-md bg-cream/50 px-3 py-2 text-xs text-muted">
                          {"fee_amount" in details && details.fee_amount != null && (
                            <span>Fee: PKR {Number(details.fee_amount).toLocaleString()}</span>
                          )}
                          {"reason" in details && details.reason != null && (
                            <span>Reason: {String(details.reason)}</span>
                          )}
                          {"new_status" in details && details.new_status != null && (
                            <span>
                              Status:{" "}
                              {CASE_STATUS_LABELS[String(details.new_status) as CaseStatus] ||
                                String(details.new_status)}
                            </span>
                          )}
                          {"hearing_type" in details && details.hearing_type != null && (
                            <span>
                              Type: {String(details.hearing_type).replace(/_/g, " ")}
                              {"hearing_number" in details && details.hearing_number != null &&
                                ` — Hearing #${details.hearing_number}`}
                            </span>
                          )}
                          {"title" in details &&
                            details.title != null &&
                            !("fee_amount" in details) &&
                            !("reason" in details) &&
                            !("hearing_type" in details) && (
                              <span>{String(details.title)}</span>
                            )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

// ── Detailed status stepper (windowed, existing behaviour) ─────────────────────

function DetailedStatusStepper({ currentStatus }: { currentStatus: string }) {
  const statusSteps = [
    "draft",
    "pending_lawyer_acceptance",
    "payment_pending",
    "payment_confirmed",
    "drafting",
    "submitted_to_admin",
    "under_scrutiny",
    "returned_for_revision",
    "registered",
    "summon_issued",
    "preliminary_hearing",
    "issues_framed",
    "transferred_to_trial",
    "evidence_stage",
    "arguments",
    "reserved_for_judgment",
    "judgment_delivered",
    "closed",
    "disposed",
  ];

  const currentStepIndex = statusSteps.indexOf(currentStatus);
  const windowStart = Math.max(0, currentStepIndex - 2);
  const windowEnd = Math.min(statusSteps.length, currentStepIndex + 4);
  const visibleSteps = statusSteps.slice(windowStart, windowEnd);

  return (
    <div>
      {/* Progress bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs text-muted">
          <span>Filed</span>
          <span>Registered</span>
          <span>Trial</span>
          <span>Judgment</span>
        </div>
        <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-cream-dark">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{
              width: `${Math.max(5, ((currentStepIndex + 1) / statusSteps.length) * 100)}%`,
            }}
          />
        </div>
        <p className="mt-1.5 text-xs text-muted">
          Step {currentStepIndex + 1} of {statusSteps.length} —{" "}
          <span className="font-medium text-primary">
            {CASE_STATUS_LABELS[currentStatus as CaseStatus] || currentStatus}
          </span>
        </p>
      </div>

      {/* Step list */}
      <div className="space-y-0">
        {visibleSteps.map((step, i) => {
          const globalIndex = windowStart + i;
          const isCompleted = globalIndex < currentStepIndex;
          const isCurrent = globalIndex === currentStepIndex;

          return (
            <div key={step} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                    isCompleted
                      ? "bg-success text-white"
                      : isCurrent
                        ? "bg-primary text-white ring-4 ring-primary/20"
                        : "bg-cream-dark text-muted"
                  }`}
                >
                  {isCompleted ? <CheckCircle className="h-4 w-4" /> : globalIndex + 1}
                </div>
                {i < visibleSteps.length - 1 && (
                  <div className={`h-8 w-0.5 ${isCompleted ? "bg-success" : "bg-cream-dark"}`} />
                )}
              </div>
              <div className="pb-4 pt-1">
                <p
                  className={`text-sm font-medium ${
                    isCurrent ? "text-primary" : isCompleted ? "text-success" : "text-muted"
                  }`}
                >
                  {CASE_STATUS_LABELS[step as CaseStatus] || step}
                </p>
                {isCurrent && (
                  <Badge variant="primary" className="mt-1">
                    Current
                  </Badge>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {windowEnd < statusSteps.length && (
        <p className="mt-2 text-center text-xs text-muted">
          +{statusSteps.length - windowEnd} more steps remaining
        </p>
      )}
    </div>
  );
}
