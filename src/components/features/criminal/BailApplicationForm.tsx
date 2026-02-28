"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useBailApplications } from "@/hooks/useBailApplications";
import {
  BAIL_APPLICATION_TYPE_LABELS,
  BAIL_STATUS_LABELS,
} from "@/types/criminal";
import type {
  BailApplicationType,
  BailApplicationWithRelations,
} from "@/types/criminal";
import { formatDateTime } from "@/lib/utils";
import { Scale, Plus, AlertCircle, CheckCircle2, XCircle } from "lucide-react";

interface BailApplicationFormProps {
  caseId: string;
  isCourtOfficial?: boolean;
  canApply?: boolean;
}

const bailStatusVariants: Record<string, "default" | "success" | "danger" | "warning" | "info" | "primary"> = {
  pending: "warning",
  hearing_scheduled: "info",
  granted: "success",
  denied: "danger",
  cancelled: "default",
  withdrawn: "default",
};

export default function BailApplicationForm({
  caseId,
  isCourtOfficial = false,
  canApply = false,
}: BailApplicationFormProps) {
  const { applications, isLoading, createApplication, decideBail } =
    useBailApplications(caseId);

  const [showForm, setShowForm] = useState(false);
  const [applicationType, setApplicationType] =
    useState<BailApplicationType>("regular");
  const [grounds, setGrounds] = useState("");
  const [suretyDetails, setSuretyDetails] = useState("");
  const [suretyAmount, setSuretyAmount] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Decision state
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decisionRemarks, setDecisionRemarks] = useState("");
  const [decisionConditions, setDecisionConditions] = useState("");
  const [decisionSurety, setDecisionSurety] = useState("");

  const handleSubmit = async () => {
    if (!grounds.trim()) {
      setError("Grounds for bail are required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const result = await createApplication({
      application_type: applicationType,
      grounds: grounds.trim(),
      surety_details: suretyDetails.trim() || undefined,
      surety_amount: suretyAmount ? parseFloat(suretyAmount) : undefined,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setGrounds("");
      setSuretyDetails("");
      setSuretyAmount("");
      setShowForm(false);
    }
  };

  const handleDecision = async (
    applicationId: string,
    decision: "granted" | "denied"
  ) => {
    if (!decisionRemarks.trim()) {
      setError("Remarks are required for bail decision.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const result = await decideBail(
      applicationId,
      decision,
      decisionRemarks.trim(),
      decisionConditions.trim() || undefined,
      decisionSurety ? parseFloat(decisionSurety) : undefined
    );

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setDecidingId(null);
      setDecisionRemarks("");
      setDecisionConditions("");
      setDecisionSurety("");
    }
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-base font-semibold text-primary">
          <Scale className="mr-2 inline h-4 w-4" />
          Bail Applications
        </h4>
        {canApply && !showForm && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowForm(true)}
          >
            <Plus className="h-4 w-4" />
            Apply for Bail
          </Button>
        )}
      </div>

      {/* Existing applications */}
      {applications.length > 0 && (
        <div className="mb-4 space-y-3">
          {applications.map((app) => (
            <BailApplicationCard
              key={app.id}
              application={app}
              isCourtOfficial={isCourtOfficial}
              isDeciding={decidingId === app.id}
              onStartDecision={() => setDecidingId(app.id)}
              onCancelDecision={() => {
                setDecidingId(null);
                setDecisionRemarks("");
                setDecisionConditions("");
                setDecisionSurety("");
              }}
              decisionRemarks={decisionRemarks}
              decisionConditions={decisionConditions}
              decisionSurety={decisionSurety}
              onDecisionRemarksChange={setDecisionRemarks}
              onDecisionConditionsChange={setDecisionConditions}
              onDecisionSuretyChange={setDecisionSurety}
              onGrant={() => handleDecision(app.id, "granted")}
              onDeny={() => handleDecision(app.id, "denied")}
              isSubmitting={isSubmitting}
              error={error}
            />
          ))}
        </div>
      )}

      {applications.length === 0 && !showForm && (
        <p className="text-sm text-muted">No bail applications filed.</p>
      )}

      {/* New bail application form */}
      {showForm && (
        <div className="mt-3 space-y-3 rounded-lg border border-primary/20 bg-cream/30 p-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Bail Type
            </label>
            <select
              value={applicationType}
              onChange={(e) =>
                setApplicationType(e.target.value as BailApplicationType)
              }
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {Object.entries(BAIL_APPLICATION_TYPE_LABELS).map(
                ([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Grounds for Bail *
            </label>
            <textarea
              value={grounds}
              onChange={(e) => setGrounds(e.target.value)}
              rows={4}
              placeholder="State the grounds for bail application..."
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Surety Details
              </label>
              <input
                type="text"
                value={suretyDetails}
                onChange={(e) => setSuretyDetails(e.target.value)}
                placeholder="Name and details of surety"
                className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Surety Amount (PKR)
              </label>
              <input
                type="number"
                value={suretyAmount}
                onChange={(e) => setSuretyAmount(e.target.value)}
                placeholder="e.g. 100000"
                className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button size="sm" onClick={handleSubmit} isLoading={isSubmitting}>
              Submit Application
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setError("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

function BailApplicationCard({
  application,
  isCourtOfficial,
  isDeciding,
  onStartDecision,
  onCancelDecision,
  decisionRemarks,
  decisionConditions,
  decisionSurety,
  onDecisionRemarksChange,
  onDecisionConditionsChange,
  onDecisionSuretyChange,
  onGrant,
  onDeny,
  isSubmitting,
  error,
}: {
  application: BailApplicationWithRelations;
  isCourtOfficial: boolean;
  isDeciding: boolean;
  onStartDecision: () => void;
  onCancelDecision: () => void;
  decisionRemarks: string;
  decisionConditions: string;
  decisionSurety: string;
  onDecisionRemarksChange: (val: string) => void;
  onDecisionConditionsChange: (val: string) => void;
  onDecisionSuretyChange: (val: string) => void;
  onGrant: () => void;
  onDeny: () => void;
  isSubmitting: boolean;
  error: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={bailStatusVariants[application.status] || "default"}>
            {BAIL_STATUS_LABELS[application.status]}
          </Badge>
          <Badge variant="default">
            {BAIL_APPLICATION_TYPE_LABELS[application.application_type]}
          </Badge>
        </div>
        <span className="text-xs text-muted">
          {formatDateTime(application.created_at)}
        </span>
      </div>

      <div className="mt-2 text-sm">
        <p className="font-medium text-foreground">Grounds:</p>
        <p className="mt-1 whitespace-pre-wrap text-muted">
          {application.grounds}
        </p>
      </div>

      {application.applicant && (
        <p className="mt-2 text-xs text-muted">
          Filed by: {application.applicant.full_name}
        </p>
      )}

      {application.surety_details && (
        <p className="mt-1 text-xs text-muted">
          Surety: {application.surety_details}
          {application.surety_amount &&
            ` (PKR ${application.surety_amount.toLocaleString()})`}
        </p>
      )}

      {/* Decision info */}
      {application.decision_remarks && (
        <div className="mt-3 rounded-lg border border-border bg-cream/50 p-2">
          <p className="text-xs font-medium text-foreground">
            {application.status === "granted" ? (
              <CheckCircle2 className="mr-1 inline h-3 w-3 text-success" />
            ) : (
              <XCircle className="mr-1 inline h-3 w-3 text-danger" />
            )}
            Decision Remarks:
          </p>
          <p className="mt-1 text-xs text-muted">
            {application.decision_remarks}
          </p>
          {application.conditions && (
            <p className="mt-1 text-xs text-muted">
              Conditions: {application.conditions}
            </p>
          )}
          {application.decided_by_profile && (
            <p className="mt-1 text-xs text-muted">
              Decided by: {application.decided_by_profile.full_name}
              {application.decision_date &&
                ` on ${formatDateTime(application.decision_date)}`}
            </p>
          )}
        </div>
      )}

      {/* Court official can decide on pending applications */}
      {isCourtOfficial && application.status === "pending" && !isDeciding && (
        <div className="mt-3">
          <Button size="sm" variant="outline" onClick={onStartDecision}>
            Make Decision
          </Button>
        </div>
      )}

      {/* Decision form */}
      {isDeciding && (
        <div className="mt-3 space-y-3 rounded-lg border border-primary/20 bg-cream/30 p-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Remarks *
            </label>
            <textarea
              value={decisionRemarks}
              onChange={(e) => onDecisionRemarksChange(e.target.value)}
              rows={3}
              placeholder="Enter decision remarks..."
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Conditions (if granting)
            </label>
            <textarea
              value={decisionConditions}
              onChange={(e) => onDecisionConditionsChange(e.target.value)}
              rows={2}
              placeholder="Bail conditions (e.g., report to police station weekly)..."
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Surety Amount (PKR)
            </label>
            <input
              type="number"
              value={decisionSurety}
              onChange={(e) => onDecisionSuretyChange(e.target.value)}
              placeholder="e.g. 100000"
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              size="sm"
              variant="primary"
              onClick={onGrant}
              isLoading={isSubmitting}
            >
              <CheckCircle2 className="h-4 w-4" />
              Grant Bail
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={onDeny}
              isLoading={isSubmitting}
            >
              <XCircle className="h-4 w-4" />
              Deny Bail
            </Button>
            <Button size="sm" variant="outline" onClick={onCancelDecision}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
