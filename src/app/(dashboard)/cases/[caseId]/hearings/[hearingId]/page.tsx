"use client";

import { use, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import ProceedingsEditor from "@/components/features/hearings/ProceedingsEditor";
import OrderSheetForm from "@/components/features/hearings/OrderSheetForm";
import TranscriptEditor from "@/components/features/hearings/TranscriptEditor";
import AdjournmentPanel from "@/components/features/hearings/AdjournmentPanel";
import { useHearings } from "@/hooks/useHearings";
import { useCase } from "@/hooks/useCases";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  HEARING_TYPE_LABELS,
  HEARING_STATUS_LABELS,
} from "@/types/hearing";
import type { HearingStatus } from "@/types/hearing";
import {
  ArrowLeft,
  Calendar,
  Clock,
  MapPin,
  User,
  Play,
  CheckCircle2,
  PauseCircle,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

const statusVariants: Record<string, "default" | "success" | "danger" | "warning" | "info" | "primary"> = {
  scheduled: "info",
  in_progress: "warning",
  completed: "success",
  adjourned: "default",
  cancelled: "danger",
};

export default function HearingDetailPage({
  params,
}: {
  params: Promise<{ caseId: string; hearingId: string }>;
}) {
  const { caseId, hearingId } = use(params);
  const { user } = useAuth();
  const { caseData } = useCase(caseId);
  const {
    hearings,
    isLoading,
    updateHearing,
    addProceedings,
    addJudgeRemarks,
    addOrderSheet,
  } = useHearings(caseId);

  const [nextDate, setNextDate] = useState("");
  const [judgeRemarksText, setJudgeRemarksText] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);

  const hearing = hearings.find((h) => h.id === hearingId);

  const isCourtOfficial = user && ["admin_court", "magistrate", "trial_judge"].includes(user.role);
  const isStenographer = user?.role === "stenographer";
  const isAssignedStenographer =
    isStenographer && caseData?.stenographer_id === user?.id;
  const canEditProceedings = isStenographer || isCourtOfficial;
  const canIssueOrders = isCourtOfficial;
  // Transcript: the assigned stenographer can edit & sign; court officials can edit draft but not sign.
  const canEditTranscript = !!(isAssignedStenographer || isCourtOfficial);
  const canSignTranscript = !!isAssignedStenographer;
  // Reader-style actions: the assigned steno (acting as reader/ahlmad) and
  // court officials can call cases, adjourn hearings, and set next dates.
  const canManageHearing = !!(isCourtOfficial || isAssignedStenographer);

  if (isLoading) {
    return (
      <div>
        <Topbar title="Hearing Details" />
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (!hearing) {
    return (
      <div>
        <Topbar title="Hearing Details" />
        <div className="p-6">
          <p className="text-muted">Hearing not found.</p>
          <Link
            href={`/cases/${caseId}/hearings`}
            className="mt-2 inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Hearings
          </Link>
        </div>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: HearingStatus) => {
    setIsUpdating(true);
    const updates: Record<string, string> = { status: newStatus };
    if (newStatus === "in_progress") {
      updates.actual_date = new Date().toISOString();
    }
    await updateHearing(hearingId, updates);
    setIsUpdating(false);
  };

  const handleSetNextDate = async () => {
    if (!nextDate) return;
    setIsUpdating(true);
    await updateHearing(hearingId, {
      next_hearing_date: new Date(nextDate).toISOString(),
    });
    setIsUpdating(false);
    setNextDate("");
  };

  const handleSaveJudgeRemarks = async () => {
    if (!judgeRemarksText.trim()) return;
    setIsUpdating(true);
    await addJudgeRemarks(hearingId, judgeRemarksText.trim());
    setIsUpdating(false);
  };

  return (
    <div>
      <Topbar title={`Hearing #${hearing.hearing_number}`} />

      <div className="p-6">
        <Link
          href={`/cases/${caseId}/hearings`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Hearings
        </Link>

        {/* Hearing header */}
        <Card className="mt-2">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-lg font-bold text-white">
                  {hearing.hearing_number}
                </span>
                <div>
                  <h2 className="text-lg font-bold text-primary">
                    {HEARING_TYPE_LABELS[hearing.hearing_type]}
                  </h2>
                  <Badge variant={statusVariants[hearing.status] || "default"}>
                    {HEARING_STATUS_LABELS[hearing.status]}
                  </Badge>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 md:grid-cols-4">
                <div className="flex items-center gap-2 text-muted">
                  <Calendar className="h-4 w-4" />
                  <span>Scheduled: {formatDate(hearing.scheduled_date)}</span>
                </div>
                {hearing.actual_date && (
                  <div className="flex items-center gap-2 text-muted">
                    <Clock className="h-4 w-4" />
                    <span>Held: {formatDateTime(hearing.actual_date)}</span>
                  </div>
                )}
                {hearing.courtroom && (
                  <div className="flex items-center gap-2 text-muted">
                    <MapPin className="h-4 w-4" />
                    <span>{hearing.courtroom}</span>
                  </div>
                )}
                {hearing.presiding_officer && (
                  <div className="flex items-center gap-2 text-muted">
                    <User className="h-4 w-4" />
                    <span>{hearing.presiding_officer.full_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Status actions — available to court officials and the assigned
              stenographer (who acts as reader/ahlmad in our app). */}
          {canManageHearing && (
            <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
              {hearing.status === "scheduled" && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleStatusChange("in_progress")}
                  isLoading={isUpdating}
                >
                  <Play className="h-4 w-4" />
                  Call Case
                </Button>
              )}
              {hearing.status === "in_progress" && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => handleStatusChange("completed")}
                  isLoading={isUpdating}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark Completed
                </Button>
              )}
              {/* Only court officials can outright cancel a hearing. */}
              {isCourtOfficial &&
                hearing.status !== "cancelled" &&
                hearing.status !== "completed" && (
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => handleStatusChange("cancelled")}
                    isLoading={isUpdating}
                  >
                    Cancel Hearing
                  </Button>
                )}
            </div>
          )}
        </Card>

        {/* Verbatim transcript (stenographer) */}
        <div className="mt-6">
          <TranscriptEditor
            hearingId={hearingId}
            caseId={caseId}
            canEdit={canEditTranscript}
            canSign={canSignTranscript}
          />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Proceedings */}
          <ProceedingsEditor
            hearingId={hearingId}
            existingText={hearing.proceedings_summary}
            isReadOnly={!canEditProceedings}
            onSave={addProceedings}
          />

          {/* Judge Remarks */}
          <Card>
            <h4 className="mb-3 text-base font-semibold text-primary">
              <AlertCircle className="mr-2 inline h-4 w-4" />
              Judge Remarks
            </h4>

            {isCourtOfficial ? (
              <>
                <textarea
                  value={judgeRemarksText || hearing.judge_remarks || ""}
                  onChange={(e) => setJudgeRemarksText(e.target.value)}
                  rows={6}
                  placeholder="Add judge's remarks..."
                  className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <div className="mt-3">
                  <Button
                    size="sm"
                    onClick={handleSaveJudgeRemarks}
                    isLoading={isUpdating}
                  >
                    Save Remarks
                  </Button>
                </div>
              </>
            ) : (
              <div className="whitespace-pre-wrap rounded-lg border border-border bg-cream/50 p-3 text-sm">
                {hearing.judge_remarks || "No remarks yet."}
              </div>
            )}
          </Card>
        </div>

        {/* Order Sheets */}
        <div className="mt-6">
          <OrderSheetForm
            hearingId={hearingId}
            existingOrders={hearing.order_sheets}
            isReadOnly={!canIssueOrders}
            onSubmit={async (data) => {
              const result = await addOrderSheet(data);
              return { error: result.error };
            }}
          />
        </div>

        {/* Adjournments (reader/steno + court officials) */}
        {(canManageHearing || hearing.status === "adjourned") && (
          <div className="mt-6">
            <AdjournmentPanel
              hearingId={hearingId}
              caseId={caseId}
              canAdjourn={canManageHearing}
            />
          </div>
        )}

        {/* Next hearing date */}
        {canManageHearing && (hearing.status === "completed" || hearing.status === "adjourned") && (
          <Card className="mt-6">
            <h4 className="mb-3 text-base font-semibold text-primary">
              Schedule Next Hearing
            </h4>
            <div className="flex gap-3">
              <input
                type="datetime-local"
                value={nextDate}
                onChange={(e) => setNextDate(e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="flex-1 rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <Button
                size="sm"
                onClick={handleSetNextDate}
                disabled={!nextDate}
                isLoading={isUpdating}
              >
                Set Date
              </Button>
            </div>
            {hearing.next_hearing_date && (
              <p className="mt-2 text-sm text-muted">
                Current next date: {formatDate(hearing.next_hearing_date)}
              </p>
            )}
          </Card>
        )}
      </div>
    </div>
  );
}
