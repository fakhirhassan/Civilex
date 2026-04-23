"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useEvidence } from "@/hooks/useEvidence";
import { useCaseIssues } from "@/hooks/useCaseIssues";
import {
  EVIDENCE_STATUS_LABELS,
  EVIDENCE_TYPE_OPTIONS,
  WITNESS_SIDE_LABELS,
} from "@/types/trial";
import type {
  EvidenceRecordWithRelations,
  EvidenceStatus,
  WitnessSide,
} from "@/types/trial";
import type { CaseIssue } from "@/types/hearing";
import { formatDateTime } from "@/lib/utils";
import {
  FileBox,
  Plus,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Eye,
  Tag,
  Link2,
  X,
} from "lucide-react";

interface EvidencePanelProps {
  caseId: string;
  isJudge?: boolean;
  isLawyer?: boolean;
}

const evidenceStatusVariants: Record<
  string,
  "default" | "success" | "danger" | "warning" | "info" | "primary"
> = {
  submitted: "info",
  admitted: "success",
  objected: "warning",
  rejected: "danger",
  marked: "primary",
};

export default function EvidencePanel({
  caseId,
  isJudge = false,
  isLawyer = false,
}: EvidencePanelProps) {
  const {
    evidence,
    isLoading,
    submitEvidence,
    updateEvidenceStatus,
    linkToIssue,
    unlinkFromIssue,
  } = useEvidence(caseId);
  const { issues } = useCaseIssues(caseId);
  const canTagIssues = isJudge || isLawyer;

  const [showForm, setShowForm] = useState(false);
  const [evidenceType, setEvidenceType] = useState("documentary");
  const [description, setDescription] = useState("");
  const [exhibitNumber, setExhibitNumber] = useState("");
  const [side, setSide] = useState<WitnessSide>("prosecution");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Review state
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [reviewRemarks, setReviewRemarks] = useState("");

  const handleSubmit = async () => {
    if (!description.trim()) {
      setError("Evidence description is required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const result = await submitEvidence({
      evidence_type: evidenceType,
      description: description.trim(),
      exhibit_number: exhibitNumber.trim() || undefined,
      submitted_by_side: side,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setDescription("");
      setExhibitNumber("");
      setShowForm(false);
    }
  };

  const handleStatusUpdate = async (
    evidenceId: string,
    status: EvidenceStatus
  ) => {
    setIsSubmitting(true);
    setError("");

    const result = await updateEvidenceStatus(
      evidenceId,
      status,
      reviewRemarks.trim() || undefined
    );

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setReviewingId(null);
      setReviewRemarks("");
    }
  };

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-base font-semibold text-primary">
          <FileBox className="mr-2 inline h-4 w-4" />
          Evidence Records
        </h4>
        <div className="flex items-center gap-2">
          <Badge variant="info">{evidence.length} items</Badge>
          {isLawyer && !showForm && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(true)}
            >
              <Plus className="h-4 w-4" />
              Submit Evidence
            </Button>
          )}
        </div>
      </div>

      {/* Evidence list */}
      {evidence.length > 0 && (
        <div className="space-y-3">
          {evidence.map((ev) => (
            <EvidenceCard
              key={ev.id}
              evidence={ev}
              isJudge={isJudge}
              isReviewing={reviewingId === ev.id}
              onStartReview={() => setReviewingId(ev.id)}
              onCancelReview={() => {
                setReviewingId(null);
                setReviewRemarks("");
              }}
              reviewRemarks={reviewRemarks}
              onReviewRemarksChange={setReviewRemarks}
              onAdmit={() => handleStatusUpdate(ev.id, "admitted")}
              onMark={() => handleStatusUpdate(ev.id, "marked")}
              onObject={() => handleStatusUpdate(ev.id, "objected")}
              onReject={() => handleStatusUpdate(ev.id, "rejected")}
              isSubmitting={isSubmitting}
              error={reviewingId === ev.id ? error : ""}
              issues={issues}
              canTagIssues={canTagIssues}
              onLinkIssue={(issueId) => linkToIssue(ev.id, issueId)}
              onUnlinkIssue={(linkId) => unlinkFromIssue(linkId)}
            />
          ))}
        </div>
      )}

      {evidence.length === 0 && !showForm && (
        <p className="text-sm text-muted">No evidence records submitted yet.</p>
      )}

      {/* Submit evidence form */}
      {showForm && (
        <div className="mt-3 space-y-3 rounded-lg border border-primary/20 bg-cream/30 p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Evidence Type
              </label>
              <select
                value={evidenceType}
                onChange={(e) => setEvidenceType(e.target.value)}
                className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {EVIDENCE_TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Submitted By Side
              </label>
              <select
                value={side}
                onChange={(e) => setSide(e.target.value as WitnessSide)}
                className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="prosecution">Prosecution / Plaintiff</option>
                <option value="defense">Defense / Defendant</option>
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Exhibit Number
            </label>
            <input
              type="text"
              value={exhibitNumber}
              onChange={(e) => setExhibitNumber(e.target.value)}
              placeholder="e.g. P-1, D-3, Exhibit A"
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Description *
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Describe the evidence being submitted..."
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
            <Button size="sm" onClick={handleSubmit} isLoading={isSubmitting}>
              Submit Evidence
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

function EvidenceCard({
  evidence,
  isJudge,
  isReviewing,
  onStartReview,
  onCancelReview,
  reviewRemarks,
  onReviewRemarksChange,
  onAdmit,
  onMark,
  onObject,
  onReject,
  isSubmitting,
  error,
  issues,
  canTagIssues,
  onLinkIssue,
  onUnlinkIssue,
}: {
  evidence: EvidenceRecordWithRelations;
  isJudge: boolean;
  isReviewing: boolean;
  onStartReview: () => void;
  onCancelReview: () => void;
  reviewRemarks: string;
  onReviewRemarksChange: (val: string) => void;
  onAdmit: () => void;
  onMark: () => void;
  onObject: () => void;
  onReject: () => void;
  isSubmitting: boolean;
  error: string;
  issues: CaseIssue[];
  canTagIssues: boolean;
  onLinkIssue: (issueId: string) => Promise<{ error: string | null }>;
  onUnlinkIssue: (linkId: string) => Promise<{ error: string | null }>;
}) {
  const [showIssuePicker, setShowIssuePicker] = useState(false);
  const [selectedIssueId, setSelectedIssueId] = useState("");
  const [tagError, setTagError] = useState("");

  const links = evidence.issue_links ?? [];
  const linkedIssueIds = new Set(links.map((l) => l.issue_id));
  const availableIssues = issues.filter((i) => !linkedIssueIds.has(i.id));

  const handleLink = async () => {
    if (!selectedIssueId) return;
    setTagError("");
    const result = await onLinkIssue(selectedIssueId);
    if (result.error) {
      setTagError(result.error);
    } else {
      setSelectedIssueId("");
      setShowIssuePicker(false);
    }
  };

  const handleUnlink = async (linkId: string) => {
    setTagError("");
    const result = await onUnlinkIssue(linkId);
    if (result.error) setTagError(result.error);
  };

  return (
    <div className="rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {evidence.exhibit_number && (
            <Badge variant="primary">
              <Tag className="mr-1 inline h-3 w-3" />
              {evidence.exhibit_number}
            </Badge>
          )}
          <Badge variant={evidenceStatusVariants[evidence.status] || "default"}>
            {EVIDENCE_STATUS_LABELS[evidence.status]}
          </Badge>
          <span className="text-xs text-muted capitalize">
            {evidence.evidence_type}
          </span>
        </div>
        <span className="text-xs text-muted">
          {formatDateTime(evidence.created_at)}
        </span>
      </div>

      <p className="mt-2 text-sm whitespace-pre-wrap">{evidence.description}</p>

      <div className="mt-2 flex items-center gap-3 text-xs text-muted">
        <span>
          Side: {WITNESS_SIDE_LABELS[evidence.submitted_by_side]}
        </span>
        {evidence.submitted_by_profile && (
          <span>By: {evidence.submitted_by_profile.full_name}</span>
        )}
      </div>

      {evidence.court_remarks && (
        <div className="mt-2 rounded-lg border border-border bg-cream/50 p-2">
          <p className="text-xs font-medium text-foreground">
            Court Remarks: {evidence.court_remarks}
          </p>
        </div>
      )}

      {evidence.objection_remarks && (
        <div className="mt-2 rounded-lg border border-danger/20 bg-danger/5 p-2">
          <p className="text-xs font-medium text-danger">
            Objection: {evidence.objection_remarks}
          </p>
        </div>
      )}

      {/* Linked issues */}
      <div className="mt-3 border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted">
            <Link2 className="mr-1 inline h-3 w-3" />
            Linked Issues ({links.length})
          </p>
          {canTagIssues && issues.length > 0 && !showIssuePicker && (
            <button
              type="button"
              onClick={() => setShowIssuePicker(true)}
              className="text-xs text-primary hover:underline"
            >
              + Tag Issue
            </button>
          )}
        </div>

        {links.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {links.map((link) => (
              <span
                key={link.id}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs text-primary"
              >
                <Tag className="h-3 w-3" />
                Issue #{link.issue?.issue_number ?? "?"}
                {link.issue?.issue_text && (
                  <span
                    className="max-w-[200px] truncate text-muted"
                    title={link.issue.issue_text}
                  >
                    · {link.issue.issue_text}
                  </span>
                )}
                {canTagIssues && (
                  <button
                    type="button"
                    onClick={() => handleUnlink(link.id)}
                    className="ml-1 rounded-full p-0.5 hover:bg-primary/20"
                    aria-label="Remove tag"
                  >
                    <X className="h-3 w-3" />
                  </button>
                )}
              </span>
            ))}
          </div>
        )}

        {canTagIssues && issues.length === 0 && (
          <p className="mt-1 text-xs text-muted">
            No issues framed yet — tag evidence after issues are framed.
          </p>
        )}

        {showIssuePicker && (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <select
              value={selectedIssueId}
              onChange={(e) => setSelectedIssueId(e.target.value)}
              className="flex-1 rounded-lg border border-border bg-cream-light px-2 py-1 text-xs focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select an issue…</option>
              {availableIssues.map((i) => (
                <option key={i.id} value={i.id}>
                  #{i.issue_number} — {i.issue_text.slice(0, 80)}
                  {i.issue_text.length > 80 ? "…" : ""}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              onClick={handleLink}
              disabled={!selectedIssueId || availableIssues.length === 0}
            >
              Link
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                setShowIssuePicker(false);
                setSelectedIssueId("");
                setTagError("");
              }}
            >
              Cancel
            </Button>
            {availableIssues.length === 0 && (
              <span className="text-xs text-muted">
                All issues already tagged.
              </span>
            )}
          </div>
        )}

        {tagError && (
          <p className="mt-1 text-xs text-danger">{tagError}</p>
        )}
      </div>

      {/* Judge can review submitted evidence */}
      {isJudge && evidence.status === "submitted" && !isReviewing && (
        <div className="mt-3">
          <Button size="sm" variant="outline" onClick={onStartReview}>
            <Eye className="h-4 w-4" />
            Review Evidence
          </Button>
        </div>
      )}

      {/* Review form */}
      {isReviewing && (
        <div className="mt-3 space-y-3 rounded-lg border border-primary/20 bg-cream/30 p-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Remarks
            </label>
            <textarea
              value={reviewRemarks}
              onChange={(e) => onReviewRemarksChange(e.target.value)}
              rows={2}
              placeholder="Enter remarks (optional)..."
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="primary"
              onClick={onAdmit}
              isLoading={isSubmitting}
            >
              <CheckCircle2 className="h-4 w-4" />
              Admit
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onMark}
              isLoading={isSubmitting}
            >
              <Tag className="h-4 w-4" />
              Mark as Exhibit
            </Button>
            <Button
              size="sm"
              variant="warning"
              onClick={onObject}
              isLoading={isSubmitting}
            >
              Objected
            </Button>
            <Button
              size="sm"
              variant="danger"
              onClick={onReject}
              isLoading={isSubmitting}
            >
              <XCircle className="h-4 w-4" />
              Reject
            </Button>
            <Button size="sm" variant="ghost" onClick={onCancelReview}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
