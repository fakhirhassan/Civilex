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
} from "lucide-react";

interface CaseTimelineProps {
  caseId: string;
  currentStatus: string;
}

const actionConfig: Record<
  string,
  { icon: typeof FileText; color: string; bg: string; label: string }
> = {
  case_created: {
    icon: Briefcase,
    color: "text-primary",
    bg: "bg-primary/10",
    label: "Case Filed",
  },
  lawyer_accepted: {
    icon: UserCheck,
    color: "text-success",
    bg: "bg-green-50",
    label: "Lawyer Accepted",
  },
  lawyer_declined: {
    icon: UserX,
    color: "text-danger",
    bg: "bg-red-50",
    label: "Lawyer Declined",
  },
  payment_confirmed: {
    icon: CreditCard,
    color: "text-success",
    bg: "bg-green-50",
    label: "Payment Confirmed",
  },
  status_changed: {
    icon: Clock,
    color: "text-info",
    bg: "bg-blue-50",
    label: "Status Changed",
  },
  document_uploaded: {
    icon: Upload,
    color: "text-primary",
    bg: "bg-primary/10",
    label: "Document Uploaded",
  },
  scrutiny_approved: {
    icon: Shield,
    color: "text-success",
    bg: "bg-green-50",
    label: "Scrutiny Approved",
  },
  scrutiny_returned: {
    icon: AlertCircle,
    color: "text-warning",
    bg: "bg-amber-50",
    label: "Returned for Revision",
  },
  hearing_scheduled: {
    icon: Clock,
    color: "text-info",
    bg: "bg-blue-50",
    label: "Hearing Scheduled",
  },
  judgment_delivered: {
    icon: Scale,
    color: "text-primary",
    bg: "bg-primary/10",
    label: "Judgment Delivered",
  },
};

const defaultConfig = {
  icon: FileText,
  color: "text-muted",
  bg: "bg-cream-dark",
  label: "Activity",
};

export default function CaseTimeline({
  caseId,
  currentStatus,
}: CaseTimelineProps) {
  const [activities, setActivities] = useState<CaseActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchActivities = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();
        const { data, error } = await supabase
          .from("case_activity_log")
          .select(`
            *,
            actor:profiles!case_activity_log_actor_id_fkey(full_name)
          `)
          .eq("case_id", caseId)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error fetching activities:", error);
        } else {
          setActivities((data as CaseActivityLog[]) || []);
        }
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
      {/* Status Stepper */}
      <CaseStatusStepper currentStatus={currentStatus} />

      {/* Activity Log */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-primary">
          Activity Log
        </h3>

        {activities.length === 0 ? (
          <p className="text-sm text-muted">No activity recorded yet.</p>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-border" />

            <div className="space-y-0">
              {activities.map((activity, i) => {
                const config = actionConfig[activity.action] || defaultConfig;
                const Icon = config.icon;
                const details = activity.details || {};

                return (
                  <div key={activity.id} className="relative flex gap-4 pb-6 last:pb-0">
                    {/* Timeline dot */}
                    <div
                      className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${config.bg} ring-4 ring-cream-light`}
                    >
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 pt-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {config.label}
                          </p>
                          {activity.actor?.full_name && (
                            <p className="text-xs text-muted">
                              by {activity.actor.full_name}
                            </p>
                          )}
                        </div>
                        <span className="shrink-0 text-xs text-muted">
                          {formatDateTime(activity.created_at)}
                        </span>
                      </div>

                      {/* Details */}
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
                          {"title" in details && details.title != null && !("fee_amount" in details) && !("reason" in details) && (
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

// Status Stepper sub-component
function CaseStatusStepper({ currentStatus }: { currentStatus: string }) {
  const statusSteps = [
    "draft",
    "pending_lawyer_acceptance",
    "lawyer_accepted",
    "payment_pending",
    "payment_confirmed",
    "drafting",
    "submitted_to_admin",
    "under_scrutiny",
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
  ];

  const currentStepIndex = statusSteps.indexOf(currentStatus);

  // Show a window of steps around the current status
  const windowStart = Math.max(0, currentStepIndex - 2);
  const windowEnd = Math.min(statusSteps.length, currentStepIndex + 4);
  const visibleSteps = statusSteps.slice(windowStart, windowEnd);

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-primary">
        Case Progress
      </h3>

      {/* Progress bar */}
      <div className="mb-6">
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
              width: `${Math.max(
                5,
                ((currentStepIndex + 1) / statusSteps.length) * 100
              )}%`,
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
          const isFuture = globalIndex > currentStepIndex;

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
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    globalIndex + 1
                  )}
                </div>
                {i < visibleSteps.length - 1 && (
                  <div
                    className={`h-8 w-0.5 ${
                      isCompleted ? "bg-success" : "bg-cream-dark"
                    }`}
                  />
                )}
              </div>
              <div className="pb-4 pt-1">
                <p
                  className={`text-sm font-medium ${
                    isCurrent
                      ? "text-primary"
                      : isCompleted
                        ? "text-success"
                        : "text-muted"
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
    </Card>
  );
}
