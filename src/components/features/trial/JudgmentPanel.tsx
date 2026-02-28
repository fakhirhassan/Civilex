"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useJudgment } from "@/hooks/useJudgment";
import { VERDICT_OPTIONS } from "@/types/trial";
import { formatDateTime } from "@/lib/utils";
import OtpSignatureModal from "@/components/features/signatures/OtpSignatureModal";
import { Gavel, AlertCircle, CheckCircle2, ShieldCheck, PenTool } from "lucide-react";

interface JudgmentPanelProps {
  caseId: string;
  isJudge?: boolean;
  caseStatus?: string;
  onRefresh?: () => void;
}

export default function JudgmentPanel({
  caseId,
  isJudge = false,
  caseStatus,
  onRefresh,
}: JudgmentPanelProps) {
  const { judgment, isLoading, deliverJudgment, fetchJudgment } = useJudgment(caseId);

  const [showForm, setShowForm] = useState(false);
  const [showSignModal, setShowSignModal] = useState(false);
  const [judgmentText, setJudgmentText] = useState("");
  const [judgmentSummary, setJudgmentSummary] = useState("");
  const [verdict, setVerdict] = useState("");
  const [reliefGranted, setReliefGranted] = useState("");
  const [costsAwarded, setCostsAwarded] = useState("");
  const [sentenceDetails, setSentenceDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const canDeliver =
    isJudge &&
    !judgment &&
    ["reserved_for_judgment", "arguments"].includes(caseStatus || "");

  const handleDeliver = async () => {
    if (!judgmentText.trim()) {
      setError("Judgment text is required.");
      return;
    }
    if (!verdict) {
      setError("Verdict is required.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const result = await deliverJudgment({
      judgment_text: judgmentText.trim(),
      judgment_summary: judgmentSummary.trim() || undefined,
      verdict,
      relief_granted: reliefGranted.trim() || undefined,
      costs_awarded: costsAwarded.trim() || undefined,
      sentence_details: sentenceDetails.trim() || undefined,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    } else {
      setShowForm(false);
    }
  };

  // Show existing judgment
  if (judgment) {
    const verdictLabel =
      VERDICT_OPTIONS.find((v) => v.value === judgment.verdict)?.label ||
      judgment.verdict;

    return (
      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h4 className="text-base font-semibold text-primary">
            <Gavel className="mr-2 inline h-4 w-4" />
            Judgment
          </h4>
          <Badge variant="success">
            <CheckCircle2 className="mr-1 inline h-3 w-3" />
            Delivered
          </Badge>
        </div>

        <div className="rounded-lg border border-primary/20 bg-cream/30 p-4">
          <div className="mb-3 flex items-center justify-between">
            <Badge variant="primary" className="text-sm">
              Verdict: {verdictLabel}
            </Badge>
            <span className="text-xs text-muted">
              {formatDateTime(judgment.delivery_date)}
            </span>
          </div>

          {judgment.judgment_summary && (
            <div className="mb-3">
              <p className="text-xs font-semibold uppercase text-muted">
                Summary
              </p>
              <p className="mt-1 text-sm whitespace-pre-wrap">
                {judgment.judgment_summary}
              </p>
            </div>
          )}

          <div className="mb-3">
            <p className="text-xs font-semibold uppercase text-muted">
              Full Judgment
            </p>
            <p className="mt-1 text-sm whitespace-pre-wrap">
              {judgment.judgment_text}
            </p>
          </div>

          {judgment.relief_granted && (
            <div className="mb-2">
              <p className="text-xs font-medium text-foreground">
                Relief Granted:
              </p>
              <p className="text-xs text-muted">{judgment.relief_granted}</p>
            </div>
          )}

          {judgment.costs_awarded && (
            <div className="mb-2">
              <p className="text-xs font-medium text-foreground">
                Costs Awarded:
              </p>
              <p className="text-xs text-muted">{judgment.costs_awarded}</p>
            </div>
          )}

          {judgment.sentence_details && (
            <div className="mb-2">
              <p className="text-xs font-medium text-foreground">
                Sentence Details:
              </p>
              <p className="text-xs text-muted">{judgment.sentence_details}</p>
            </div>
          )}

          {judgment.delivered_by_profile && (
            <p className="mt-3 text-xs text-muted">
              Delivered by: {judgment.delivered_by_profile.full_name}
            </p>
          )}

          {/* Signature status */}
          <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
            {judgment.is_signed ? (
              <Badge variant="success">
                <ShieldCheck className="mr-1 inline h-3 w-3" />
                Digitally Signed
              </Badge>
            ) : (
              <Badge variant="warning">Unsigned</Badge>
            )}

            {isJudge && !judgment.is_signed && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => setShowSignModal(true)}
              >
                <PenTool className="h-4 w-4" />
                Sign Judgment
              </Button>
            )}
          </div>
        </div>

        {/* OTP Signature Modal */}
        <OtpSignatureModal
          isOpen={showSignModal}
          onClose={() => setShowSignModal(false)}
          entityType="judgment"
          entityId={judgment.id}
          entityLabel={`Judgment — Verdict: ${verdictLabel}`}
          onSigned={() => {
            setShowSignModal(false);
            fetchJudgment();
            onRefresh?.();
          }}
        />
      </Card>
    );
  }

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-base font-semibold text-primary">
          <Gavel className="mr-2 inline h-4 w-4" />
          Judgment
        </h4>
        {canDeliver && !showForm && (
          <Button
            size="sm"
            variant="primary"
            onClick={() => setShowForm(true)}
          >
            <Gavel className="h-4 w-4" />
            Deliver Judgment
          </Button>
        )}
      </div>

      {!showForm && (
        <p className="text-sm text-muted">
          {caseStatus === "reserved_for_judgment"
            ? "Case is reserved for judgment. Awaiting judgment delivery."
            : "No judgment delivered yet."}
        </p>
      )}

      {/* Judgment delivery form */}
      {showForm && (
        <div className="space-y-3 rounded-lg border border-primary/20 bg-cream/30 p-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Verdict *
            </label>
            <select
              value={verdict}
              onChange={(e) => setVerdict(e.target.value)}
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select verdict...</option>
              {VERDICT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Judgment Summary
            </label>
            <textarea
              value={judgmentSummary}
              onChange={(e) => setJudgmentSummary(e.target.value)}
              rows={3}
              placeholder="Brief summary of the judgment..."
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Full Judgment Text *
            </label>
            <textarea
              value={judgmentText}
              onChange={(e) => setJudgmentText(e.target.value)}
              rows={8}
              placeholder="Enter the full judgment text..."
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Relief Granted
              </label>
              <textarea
                value={reliefGranted}
                onChange={(e) => setReliefGranted(e.target.value)}
                rows={2}
                placeholder="Details of relief granted..."
                className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-foreground">
                Costs Awarded
              </label>
              <textarea
                value={costsAwarded}
                onChange={(e) => setCostsAwarded(e.target.value)}
                rows={2}
                placeholder="Court costs awarded..."
                className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-foreground">
              Sentence Details (Criminal Cases)
            </label>
            <textarea
              value={sentenceDetails}
              onChange={(e) => setSentenceDetails(e.target.value)}
              rows={2}
              placeholder="Sentence details if applicable..."
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
              onClick={handleDeliver}
              isLoading={isSubmitting}
            >
              <Gavel className="h-4 w-4" />
              Deliver Judgment
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
