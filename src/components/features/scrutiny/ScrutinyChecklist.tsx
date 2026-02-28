"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useScrutiny } from "@/hooks/useScrutiny";
import { SCRUTINY_CHECKS } from "@/types/hearing";
import type { ScrutinyDecision } from "@/types/hearing";
import { CheckCircle2, XCircle, AlertCircle, FileCheck } from "lucide-react";

interface ScrutinyChecklistProps {
  caseId: string;
  caseTitle: string;
  isReadOnly?: boolean;
  onComplete?: () => void;
}

type CheckKey = (typeof SCRUTINY_CHECKS)[number]["key"];

export default function ScrutinyChecklistComponent({
  caseId,
  caseTitle,
  isReadOnly = false,
  onComplete,
}: ScrutinyChecklistProps) {
  const { checklist, isLoading, submitScrutiny } = useScrutiny(caseId);

  const [checks, setChecks] = useState<Record<CheckKey, boolean>>({
    proper_documentation: false,
    court_fees_paid: false,
    jurisdiction_verified: false,
    parties_identified: false,
    cause_of_action_valid: false,
    limitation_period_checked: false,
    proper_format: false,
  });
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // If checklist exists and has a decision, show read-only view
  const existingDecision = checklist?.decision;
  const showForm = !isReadOnly && (!existingDecision || existingDecision === "pending");

  const allChecked = Object.values(checks).every(Boolean);
  const checkedCount = Object.values(checks).filter(Boolean).length;

  const handleToggle = (key: CheckKey) => {
    setChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSubmit = async (decision: ScrutinyDecision) => {
    if (decision === "approved" && !allChecked) {
      setError("All checklist items must be verified before approving.");
      return;
    }
    if (decision === "returned" && !remarks.trim()) {
      setError("Please provide remarks when returning a case.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const result = await submitScrutiny({
      ...checks,
      decision,
      remarks: remarks.trim() || undefined,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      onComplete?.();
    }
  };

  if (isLoading) {
    return (
      <Card>
        <div className="flex items-center justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Card>
    );
  }

  // Read-only view for completed scrutiny
  if (!showForm && checklist) {
    return (
      <Card>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-primary">
            <FileCheck className="mr-2 inline h-5 w-5" />
            Scrutiny Result
          </h3>
          <Badge
            variant={
              checklist.decision === "approved"
                ? "success"
                : checklist.decision === "returned"
                  ? "danger"
                  : "warning"
            }
          >
            {checklist.decision === "approved"
              ? "Approved"
              : checklist.decision === "returned"
                ? "Returned"
                : "Pending"}
          </Badge>
        </div>

        <div className="space-y-2">
          {SCRUTINY_CHECKS.map((check) => (
            <div
              key={check.key}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
            >
              {checklist[check.key] ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-success" />
              ) : (
                <XCircle className="h-5 w-5 shrink-0 text-danger" />
              )}
              <div>
                <p className="text-sm font-medium">{check.label}</p>
                <p className="text-xs text-muted">{check.description}</p>
              </div>
            </div>
          ))}
        </div>

        {checklist.remarks && (
          <div className="mt-4 rounded-lg border border-border bg-cream/50 p-3">
            <p className="text-xs font-medium text-muted">Remarks</p>
            <p className="mt-1 text-sm">{checklist.remarks}</p>
          </div>
        )}

        {checklist.reviewer && (
          <p className="mt-3 text-xs text-muted">
            Reviewed by: {checklist.reviewer.full_name}
          </p>
        )}
      </Card>
    );
  }

  // Editable form
  return (
    <Card>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-primary">
          <FileCheck className="mr-2 inline h-5 w-5" />
          Scrutiny Checklist
        </h3>
        <p className="mt-1 text-sm text-muted">
          Review &ldquo;{caseTitle}&rdquo; against the following criteria:
        </p>
      </div>

      {/* Progress */}
      <div className="mb-4 flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-cream-dark">
          <div
            className="h-full rounded-full bg-primary transition-all"
            style={{ width: `${(checkedCount / 7) * 100}%` }}
          />
        </div>
        <span className="text-sm font-medium text-muted">{checkedCount}/7</span>
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {SCRUTINY_CHECKS.map((check) => (
          <label
            key={check.key}
            className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-3 transition-colors hover:bg-cream/50"
          >
            <input
              type="checkbox"
              checked={checks[check.key]}
              onChange={() => handleToggle(check.key)}
              className="mt-0.5 h-5 w-5 rounded border-border text-primary focus:ring-primary"
            />
            <div>
              <p className="text-sm font-medium">{check.label}</p>
              <p className="text-xs text-muted">{check.description}</p>
            </div>
          </label>
        ))}
      </div>

      {/* Remarks */}
      <div className="mt-4">
        <label className="mb-1 block text-sm font-medium text-foreground">
          Remarks
        </label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          rows={3}
          className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          placeholder="Add any remarks or reasons for your decision..."
        />
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-4 flex gap-3">
        <Button
          variant="primary"
          onClick={() => handleSubmit("approved")}
          isLoading={isSubmitting}
          disabled={!allChecked}
        >
          <CheckCircle2 className="h-4 w-4" />
          Approve & Register
        </Button>
        <Button
          variant="danger"
          onClick={() => handleSubmit("returned")}
          isLoading={isSubmitting}
        >
          <XCircle className="h-4 w-4" />
          Return for Revision
        </Button>
      </div>
    </Card>
  );
}
