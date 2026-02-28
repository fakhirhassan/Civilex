"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useInvestigation } from "@/hooks/useInvestigation";
import {
  INVESTIGATION_REPORT_TYPE_LABELS,
  INVESTIGATION_REPORT_STATUS_LABELS,
  INVESTIGATION_STATUS_LABELS,
} from "@/types/criminal";
import type {
  InvestigationReportType,
  InvestigationStatus,
  InvestigationReportWithRelations,
} from "@/types/criminal";
import { formatDateTime } from "@/lib/utils";
import {
  Search,
  Plus,
  AlertCircle,
  FileText,
  CheckCircle2,
  RotateCcw,
} from "lucide-react";

interface InvestigationPanelProps {
  caseId: string;
  investigationStatus?: InvestigationStatus;
  ioName?: string | null;
  isCourtOfficial?: boolean;
  canSubmitReport?: boolean;
}

const reportStatusVariants: Record<string, "default" | "success" | "danger" | "warning" | "info" | "primary"> = {
  submitted: "info",
  reviewed: "primary",
  accepted: "success",
  returned: "warning",
};

export default function InvestigationPanel({
  caseId,
  investigationStatus = "pending",
  ioName,
  isCourtOfficial = false,
  canSubmitReport = false,
}: InvestigationPanelProps) {
  const { reports, isLoading, submitReport, reviewReport, updateInvestigationStatus } =
    useInvestigation(caseId);

  const [showForm, setShowForm] = useState(false);
  const [reportType, setReportType] = useState<InvestigationReportType>("progress");
  const [reportText, setReportText] = useState("");
  const [findings, setFindings] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [evidenceCollected, setEvidenceCollected] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Review state
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState("");

  const handleSubmitReport = async () => {
    if (!reportText.trim()) {
      setError("Report text is required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const result = await submitReport({
      report_type: reportType,
      report_text: reportText.trim(),
      findings: findings.trim() || undefined,
      recommendations: recommendations.trim() || undefined,
      evidence_collected: evidenceCollected.trim() || undefined,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setReportText("");
      setFindings("");
      setRecommendations("");
      setEvidenceCollected("");
      setShowForm(false);
    }
  };

  const handleReview = async (
    reportId: string,
    decision: "accepted" | "returned"
  ) => {
    if (!reviewRemarks.trim()) {
      setError("Review remarks are required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const result = await reviewReport(reportId, decision, reviewRemarks.trim());

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setReviewingId(null);
      setReviewRemarks("");
    }
  };

  const handleStatusUpdate = async (status: InvestigationStatus) => {
    setIsSubmitting(true);
    await updateInvestigationStatus(status);
    setIsSubmitting(false);
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-base font-semibold text-primary">
          <Search className="mr-2 inline h-4 w-4" />
          Investigation
        </h4>
        <div className="flex items-center gap-2">
          <Badge
            variant={
              investigationStatus === "completed"
                ? "success"
                : investigationStatus === "in_progress"
                  ? "warning"
                  : "info"
            }
          >
            {INVESTIGATION_STATUS_LABELS[investigationStatus]}
          </Badge>
          {canSubmitReport && !showForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4" />
              Submit Report
            </Button>
          )}
        </div>
      </div>

      {/* IO info */}
      {ioName && (
        <p className="mb-3 text-sm text-muted">
          Investigation Officer: <span className="font-medium">{ioName}</span>
        </p>
      )}

      {/* Court official: update investigation status */}
      {isCourtOfficial && (
        <div className="mb-4 flex flex-wrap gap-2">
          {investigationStatus === "pending" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusUpdate("in_progress")}
              isLoading={isSubmitting}
            >
              Mark Investigation In Progress
            </Button>
          )}
          {investigationStatus === "in_progress" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleStatusUpdate("completed")}
              isLoading={isSubmitting}
            >
              Mark Investigation Complete
            </Button>
          )}
        </div>
      )}

      {/* Reports list */}
      {reports.length > 0 && (
        <div className="space-y-3">
          {reports.map((report) => (
            <InvestigationReportCard
              key={report.id}
              report={report}
              isCourtOfficial={isCourtOfficial}
              isReviewing={reviewingId === report.id}
              onStartReview={() => setReviewingId(report.id)}
              onCancelReview={() => {
                setReviewingId(null);
                setReviewRemarks("");
              }}
              reviewRemarks={reviewRemarks}
              onReviewRemarksChange={setReviewRemarks}
              onAccept={() => handleReview(report.id, "accepted")}
              onReturn={() => handleReview(report.id, "returned")}
              isSubmitting={isSubmitting}
              error={reviewingId === report.id ? error : ""}
            />
          ))}
        </div>
      )}

      {reports.length === 0 && !showForm && (
        <p className="text-sm text-muted">No investigation reports submitted yet.</p>
      )}

      {/* Submit report form */}
      {showForm && (
        <div className="mt-3 space-y-3 rounded-lg border border-primary/20 bg-cream/30 p-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Report Type
            </label>
            <select
              value={reportType}
              onChange={(e) =>
                setReportType(e.target.value as InvestigationReportType)
              }
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {Object.entries(INVESTIGATION_REPORT_TYPE_LABELS).map(
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
              Report Text *
            </label>
            <textarea
              value={reportText}
              onChange={(e) => setReportText(e.target.value)}
              rows={4}
              placeholder="Write the investigation report..."
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Findings
            </label>
            <textarea
              value={findings}
              onChange={(e) => setFindings(e.target.value)}
              rows={2}
              placeholder="Key findings from investigation..."
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Recommendations
            </label>
            <textarea
              value={recommendations}
              onChange={(e) => setRecommendations(e.target.value)}
              rows={2}
              placeholder="Recommendations for the court..."
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Evidence Collected
            </label>
            <textarea
              value={evidenceCollected}
              onChange={(e) => setEvidenceCollected(e.target.value)}
              rows={2}
              placeholder="List of evidence collected..."
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
              onClick={handleSubmitReport}
              isLoading={isSubmitting}
            >
              Submit Report
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

function InvestigationReportCard({
  report,
  isCourtOfficial,
  isReviewing,
  onStartReview,
  onCancelReview,
  reviewRemarks,
  onReviewRemarksChange,
  onAccept,
  onReturn,
  isSubmitting,
  error,
}: {
  report: InvestigationReportWithRelations;
  isCourtOfficial: boolean;
  isReviewing: boolean;
  onStartReview: () => void;
  onCancelReview: () => void;
  reviewRemarks: string;
  onReviewRemarksChange: (val: string) => void;
  onAccept: () => void;
  onReturn: () => void;
  isSubmitting: boolean;
  error: string;
}) {
  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          <Badge variant="primary">
            {INVESTIGATION_REPORT_TYPE_LABELS[report.report_type]}
          </Badge>
          <Badge variant={reportStatusVariants[report.status] || "default"}>
            {INVESTIGATION_REPORT_STATUS_LABELS[report.status]}
          </Badge>
        </div>
        <span className="text-xs text-muted">
          {formatDateTime(report.created_at)}
        </span>
      </div>

      <div className="mt-2 text-sm">
        <p className="whitespace-pre-wrap">{report.report_text}</p>
      </div>

      {report.findings && (
        <div className="mt-2">
          <p className="text-xs font-medium text-foreground">Findings:</p>
          <p className="text-xs text-muted">{report.findings}</p>
        </div>
      )}

      {report.recommendations && (
        <div className="mt-1">
          <p className="text-xs font-medium text-foreground">Recommendations:</p>
          <p className="text-xs text-muted">{report.recommendations}</p>
        </div>
      )}

      {report.evidence_collected && (
        <div className="mt-1">
          <p className="text-xs font-medium text-foreground">Evidence:</p>
          <p className="text-xs text-muted">{report.evidence_collected}</p>
        </div>
      )}

      {report.submitter && (
        <p className="mt-2 text-xs text-muted">
          Submitted by: {report.submitter.full_name}
        </p>
      )}

      {/* Review info */}
      {report.review_remarks && (
        <div className="mt-2 rounded-lg border border-border bg-cream/50 p-2">
          <p className="text-xs font-medium text-foreground">
            Review: {report.review_remarks}
          </p>
          {report.reviewer && (
            <p className="text-xs text-muted">
              Reviewed by: {report.reviewer.full_name}
            </p>
          )}
        </div>
      )}

      {/* Court official can review submitted reports */}
      {isCourtOfficial && report.status === "submitted" && !isReviewing && (
        <div className="mt-3">
          <Button size="sm" variant="outline" onClick={onStartReview}>
            Review Report
          </Button>
        </div>
      )}

      {/* Review form */}
      {isReviewing && (
        <div className="mt-3 space-y-3 rounded-lg border border-primary/20 bg-cream/30 p-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Review Remarks *
            </label>
            <textarea
              value={reviewRemarks}
              onChange={(e) => onReviewRemarksChange(e.target.value)}
              rows={3}
              placeholder="Enter review remarks..."
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
              onClick={onAccept}
              isLoading={isSubmitting}
            >
              <CheckCircle2 className="h-4 w-4" />
              Accept
            </Button>
            <Button
              size="sm"
              variant="warning"
              onClick={onReturn}
              isLoading={isSubmitting}
            >
              <RotateCcw className="h-4 w-4" />
              Return
            </Button>
            <Button size="sm" variant="outline" onClick={onCancelReview}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
