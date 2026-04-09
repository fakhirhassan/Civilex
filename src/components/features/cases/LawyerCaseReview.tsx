"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Textarea from "@/components/ui/Textarea";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import { useCases } from "@/hooks/useCases";
import { formatDate } from "@/lib/utils";
import { feeStructureSchema } from "@/lib/validations/payment";
import { Check, X, Briefcase } from "lucide-react";
import type { CaseWithRelations } from "@/types/case";

interface LawyerCaseReviewProps {
  pendingCases: CaseWithRelations[];
  lawyerId: string;
  onActionComplete: () => void;
}

export default function LawyerCaseReview({
  pendingCases,
  lawyerId,
  onActionComplete,
}: LawyerCaseReviewProps) {
  const { acceptCase, declineCase } = useCases();
  const [acceptModal, setAcceptModal] = useState<{
    assignmentId: string;
    caseId: string;
    caseTitle: string;
  } | null>(null);
  const [declineModal, setDeclineModal] = useState<{
    assignmentId: string;
    caseId: string;
    caseTitle: string;
  } | null>(null);

  // Accept form state
  const [feeAmount, setFeeAmount] = useState("");
  const [allowInstallments, setAllowInstallments] = useState(false);
  const [installmentCount, setInstallmentCount] = useState("1");
  const [feeErrors, setFeeErrors] = useState<Record<string, string>>({});
  const [isAccepting, setIsAccepting] = useState(false);

  // Decline form state
  const [declineReason, setDeclineReason] = useState("");
  const [isDeclining, setIsDeclining] = useState(false);

  const handleAccept = async () => {
    if (!acceptModal) return;

    setFeeErrors({});
    const result = feeStructureSchema.safeParse({
      fee_amount: parseFloat(feeAmount),
      allow_installments: allowInstallments,
      installment_count: allowInstallments ? parseInt(installmentCount) : 1,
    });

    if (!result.success) {
      const errs: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) errs[err.path[0] as string] = err.message;
      });
      setFeeErrors(errs);
      return;
    }

    setIsAccepting(true);
    const { error } = await acceptCase(
      acceptModal.assignmentId,
      acceptModal.caseId,
      parseFloat(feeAmount),
      allowInstallments,
      allowInstallments ? parseInt(installmentCount) : 1
    );

    setIsAccepting(false);

    if (!error) {
      setAcceptModal(null);
      setFeeAmount("");
      setAllowInstallments(false);
      setInstallmentCount("1");
      onActionComplete();
    }
  };

  const handleDecline = async () => {
    if (!declineModal) return;

    if (!declineReason.trim()) return;

    setIsDeclining(true);
    const { error } = await declineCase(
      declineModal.assignmentId,
      declineModal.caseId,
      declineReason
    );

    setIsDeclining(false);

    if (!error) {
      setDeclineModal(null);
      setDeclineReason("");
      onActionComplete();
    }
  };

  if (pendingCases.length === 0) return null;

  return (
    <>
      <Card>
        <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-primary">
          <Briefcase className="h-5 w-5" />
          Pending Case Requests ({pendingCases.length})
        </h3>
        <div className="space-y-3">
          {pendingCases.map((c) => {
            const assignment = c.assignments?.find(
              (a) => a.lawyer_id === lawyerId && a.status === "pending"
            );
            if (!assignment) return null;

            return (
              <div
                key={c.id}
                className="flex flex-col gap-3 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="font-medium text-foreground">{c.title}</p>
                  <div className="mt-1 flex flex-wrap gap-2 text-xs text-muted">
                    <span>{c.case_number}</span>
                    <Badge
                      variant={
                        c.case_type === "civil" ? "primary" : c.case_type === "family" ? "warning" : "danger"
                      }
                    >
                      {c.case_type}
                    </Badge>
                    <Badge variant={assignment.side === "defendant" ? "warning" : "info"}>
                      {assignment.side === "defendant" ? "Defendant side" : "Plaintiff side"}
                    </Badge>
                    <span>
                      Client: {assignment.side === "defendant"
                        ? (c.defendant?.full_name || c.defendant_name || "Defendant")
                        : (c.plaintiff?.full_name || "Unknown")}
                    </span>
                    {c.filing_date && (
                      <span>Filed: {formatDate(c.filing_date)}</span>
                    )}
                  </div>
                  {c.description && (
                    <p className="mt-1 line-clamp-2 text-sm text-muted">
                      {c.description}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 gap-2">
                  <Button
                    size="sm"
                    onClick={() =>
                      setAcceptModal({
                        assignmentId: assignment.id,
                        caseId: c.id,
                        caseTitle: c.title,
                      })
                    }
                  >
                    <Check className="h-4 w-4" />
                    Accept
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() =>
                      setDeclineModal({
                        assignmentId: assignment.id,
                        caseId: c.id,
                        caseTitle: c.title,
                      })
                    }
                  >
                    <X className="h-4 w-4" />
                    Decline
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Accept Modal - Fee Structure */}
      <Modal
        isOpen={!!acceptModal}
        onClose={() => setAcceptModal(null)}
        title="Accept Case & Set Fee"
      >
        <p className="mb-4 text-sm text-muted">
          Set your fee structure for &ldquo;{acceptModal?.caseTitle}&rdquo;
        </p>

        <div className="space-y-4">
          <Input
            id="feeAmount"
            label="Fee Amount (PKR)"
            type="number"
            placeholder="e.g., 50000"
            value={feeAmount}
            onChange={(e) => setFeeAmount(e.target.value)}
            error={feeErrors.fee_amount}
          />

          <div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={allowInstallments}
                onChange={(e) => setAllowInstallments(e.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              <span className="font-medium text-primary">
                Allow Installments
              </span>
            </label>
          </div>

          {allowInstallments && (
            <Input
              id="installmentCount"
              label="Number of Installments"
              type="number"
              min="2"
              max="12"
              placeholder="e.g., 3"
              value={installmentCount}
              onChange={(e) => setInstallmentCount(e.target.value)}
              error={feeErrors.installment_count}
            />
          )}

          {feeAmount && (
            <div className="rounded-lg bg-primary/5 p-3 text-sm">
              <p className="font-medium text-primary">Fee Summary</p>
              <p className="mt-1 text-foreground">
                Total: PKR {parseInt(feeAmount || "0").toLocaleString()}
              </p>
              {allowInstallments && parseInt(installmentCount) > 1 && (
                <p className="text-muted">
                  {installmentCount} installments of PKR{" "}
                  {Math.ceil(
                    parseInt(feeAmount || "0") / parseInt(installmentCount || "1")
                  ).toLocaleString()}{" "}
                  each
                </p>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setAcceptModal(null)}>
            Cancel
          </Button>
          <Button onClick={handleAccept} isLoading={isAccepting}>
            <Check className="h-4 w-4" />
            Accept Case
          </Button>
        </div>
      </Modal>

      {/* Decline Modal */}
      <Modal
        isOpen={!!declineModal}
        onClose={() => setDeclineModal(null)}
        title="Decline Case"
      >
        <p className="mb-4 text-sm text-muted">
          Please provide a reason for declining &ldquo;{declineModal?.caseTitle}
          &rdquo;
        </p>

        <Textarea
          id="declineReason"
          label="Reason"
          placeholder="Explain why you're declining this case..."
          value={declineReason}
          onChange={(e) => setDeclineReason(e.target.value)}
        />

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={() => setDeclineModal(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDecline}
            isLoading={isDeclining}
            disabled={!declineReason.trim()}
          >
            <X className="h-4 w-4" />
            Decline Case
          </Button>
        </div>
      </Modal>
    </>
  );
}
