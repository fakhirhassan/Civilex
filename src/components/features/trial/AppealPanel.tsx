"use client";

import { useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { useAppeals } from "@/hooks/useAppeals";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  APPEAL_FORUM_LABELS,
  APPEAL_SIDE_LABELS,
  APPEAL_STATUS_LABELS,
  APPEAL_FORUM_LIMITATION_DAYS,
  type AppealForum,
  type AppealSide,
  type AppealStatus,
  type AppealWithRelations,
} from "@/types/trial";
import {
  Scale,
  FileText,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Gavel,
} from "lucide-react";

interface Props {
  caseId: string;
  caseStatus: string;
  currentUserId: string | null;
  isCourtOfficial: boolean;
  judgmentDate: string | null;
  judgmentId: string | null;
  decreeId: string | null;
  parties: {
    plaintiff?: { id: string; full_name: string } | null;
    defendant?: { id: string; full_name: string } | null;
  };
}

const statusVariants: Record<
  AppealStatus,
  "default" | "success" | "danger" | "warning" | "info" | "primary"
> = {
  filed: "warning",
  admitted: "info",
  rejected: "danger",
  dismissed: "danger",
  allowed: "success",
  withdrawn: "default",
  time_barred: "danger",
};

const ELIGIBLE_STATUSES = ["judgment_delivered", "closed", "disposed"];

export default function AppealPanel({
  caseId,
  caseStatus,
  currentUserId,
  isCourtOfficial,
  judgmentDate,
  judgmentId,
  decreeId,
  parties,
}: Props) {
  const { appeals, isLoading, fileAppeal, admitAppeal, disposeAppeal } =
    useAppeals(caseId);

  const caseAllowsFiling = ELIGIBLE_STATUSES.includes(caseStatus);

  const canFileAsParty =
    !!currentUserId &&
    (currentUserId === parties.plaintiff?.id ||
      currentUserId === parties.defendant?.id);

  const canFile = caseAllowsFiling && (canFileAsParty || isCourtOfficial);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const defaultSide: AppealSide =
    currentUserId === parties.defendant?.id ? "defendant" : "plaintiff";

  const [forum, setForum] = useState<AppealForum>("district_court");
  const [side, setSide] = useState<AppealSide>(defaultSide);
  const [appealNumber, setAppealNumber] = useState("");
  const [judgmentDateInput, setJudgmentDateInput] = useState(
    judgmentDate ? judgmentDate.slice(0, 10) : ""
  );
  const [limitationDays, setLimitationDays] = useState<number>(
    APPEAL_FORUM_LIMITATION_DAYS.district_court
  );
  const [filedOn, setFiledOn] = useState(new Date().toISOString().slice(0, 10));
  const [grounds, setGrounds] = useState("");
  const [relief, setRelief] = useState("");
  const [condonationRequested, setCondonationRequested] = useState(false);
  const [condonationReason, setCondonationReason] = useState("");

  const onForumChange = (value: AppealForum) => {
    setForum(value);
    setLimitationDays(APPEAL_FORUM_LIMITATION_DAYS[value]);
  };

  const computedTimeBarred = useMemo(() => {
    if (!judgmentDateInput || !filedOn) return false;
    const j = new Date(judgmentDateInput);
    const f = new Date(filedOn);
    const diffDays = Math.floor(
      (f.getTime() - j.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays > limitationDays;
  }, [judgmentDateInput, filedOn, limitationDays]);

  const resetForm = () => {
    setShowForm(false);
    setError(null);
    setForum("district_court");
    setSide(defaultSide);
    setAppealNumber("");
    setJudgmentDateInput(judgmentDate ? judgmentDate.slice(0, 10) : "");
    setLimitationDays(APPEAL_FORUM_LIMITATION_DAYS.district_court);
    setFiledOn(new Date().toISOString().slice(0, 10));
    setGrounds("");
    setRelief("");
    setCondonationRequested(false);
    setCondonationReason("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;

    const appellantId =
      side === "plaintiff"
        ? parties.plaintiff?.id
        : parties.defendant?.id;
    const respondentId =
      side === "plaintiff"
        ? parties.defendant?.id
        : parties.plaintiff?.id;

    if (!appellantId) {
      setError("Case party record missing — cannot determine appellant.");
      return;
    }
    if (!judgmentDateInput) {
      setError("Judgment date is required.");
      return;
    }
    if (!grounds.trim() || !relief.trim()) {
      setError("Grounds of appeal and relief sought are required.");
      return;
    }
    if (computedTimeBarred && !condonationRequested) {
      setError(
        "Appeal is beyond limitation. Tick condonation of delay and explain the reason."
      );
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: err } = await fileAppeal({
      appellate_forum: forum,
      appellant_side: side,
      appellant_id: appellantId,
      respondent_id: respondentId ?? null,
      judgment_date: judgmentDateInput,
      limitation_days: limitationDays,
      filed_on: filedOn,
      condonation_requested: condonationRequested,
      condonation_reason: condonationReason,
      grounds_of_appeal: grounds,
      relief_sought: relief,
      appeal_number: appealNumber,
      decree_id: decreeId,
      judgment_id: judgmentId,
    });

    setSubmitting(false);

    if (err) {
      setError(err);
      return;
    }
    resetForm();
  };

  if (isLoading) {
    return (
      <Card className="p-12 flex items-center justify-center">
        <Spinner />
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <Scale className="w-5 h-5" />
            Appeals
          </h2>
          <p className="text-sm text-gray-600">
            Memorandum of appeal under CPC Section 96 / Order XLI
          </p>
        </div>
        {canFile && !showForm && (
          <Button onClick={() => setShowForm(true)}>File Appeal</Button>
        )}
      </div>

      {!caseAllowsFiling && appeals.length === 0 && (
        <Card className="p-4">
          <p className="text-sm text-gray-600">
            Appeals can only be filed after the judgment has been delivered.
          </p>
        </Card>
      )}

      {showForm && (
        <Card className="p-5 space-y-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Appellate Forum
                </label>
                <select
                  value={forum}
                  onChange={(e) => onForumChange(e.target.value as AppealForum)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  required
                >
                  {(Object.keys(APPEAL_FORUM_LABELS) as AppealForum[]).map(
                    (f) => (
                      <option key={f} value={f}>
                        {APPEAL_FORUM_LABELS[f]}
                      </option>
                    )
                  )}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Appellant (aggrieved party)
                </label>
                <select
                  value={side}
                  onChange={(e) => setSide(e.target.value as AppealSide)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  required
                >
                  <option value="plaintiff">
                    Plaintiff
                    {parties.plaintiff?.full_name
                      ? ` — ${parties.plaintiff.full_name}`
                      : ""}
                  </option>
                  <option value="defendant">
                    Defendant
                    {parties.defendant?.full_name
                      ? ` — ${parties.defendant.full_name}`
                      : ""}
                  </option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Judgment Date
                </label>
                <input
                  type="date"
                  value={judgmentDateInput}
                  onChange={(e) => setJudgmentDateInput(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Limitation (days)
                </label>
                <input
                  type="number"
                  min={1}
                  value={limitationDays}
                  onChange={(e) => setLimitationDays(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Filed On
                </label>
                <input
                  type="date"
                  value={filedOn}
                  onChange={(e) => setFiledOn(e.target.value)}
                  className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  required
                />
              </div>
            </div>

            {computedTimeBarred && (
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
                <div className="text-sm text-amber-900">
                  This appeal is being filed beyond the limitation period of{" "}
                  {limitationDays} days. The appellate court may reject it
                  unless delay is condoned under Section 5 of the Limitation
                  Act.
                </div>
              </div>
            )}

            <div>
              <label className="inline-flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={condonationRequested}
                  onChange={(e) => setCondonationRequested(e.target.checked)}
                />
                Request condonation of delay
              </label>
              {condonationRequested && (
                <textarea
                  value={condonationReason}
                  onChange={(e) => setCondonationReason(e.target.value)}
                  rows={2}
                  placeholder="Sufficient cause for the delay (e.g., appellant's illness, counsel's mistake, delay in obtaining certified copy)"
                  className="mt-2 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                />
              )}
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Appeal Number (if assigned)
              </label>
              <input
                type="text"
                value={appealNumber}
                onChange={(e) => setAppealNumber(e.target.value)}
                placeholder="e.g., R.F.A. 143/2026"
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Grounds of Appeal *
              </label>
              <textarea
                value={grounds}
                onChange={(e) => setGrounds(e.target.value)}
                rows={6}
                placeholder="1. That the learned trial court erred in law by...&#10;2. That the impugned judgment is against the weight of evidence...&#10;3. That..."
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">
                Relief Sought *
              </label>
              <textarea
                value={relief}
                onChange={(e) => setRelief(e.target.value)}
                rows={3}
                placeholder="Set aside the impugned judgment and decree dated ... and decree the suit as prayed for, with costs throughout."
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                required
              />
            </div>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
                <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                <div className="text-sm text-red-900">{error}</div>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Filing..." : "File Appeal"}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
                disabled={submitting}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      {appeals.length === 0 && !showForm && (
        <EmptyState
          icon={<Scale className="w-10 h-10" />}
          title="No appeals filed"
          description={
            canFile
              ? "If a party is aggrieved by the judgment, they may file a memorandum of appeal."
              : "Appeals will appear here once filed by an aggrieved party."
          }
        />
      )}

      <div className="space-y-4">
        {appeals.map((appeal) => (
          <AppealCard
            key={appeal.id}
            appeal={appeal}
            isCourtOfficial={isCourtOfficial}
            onAdmit={admitAppeal}
            onDispose={disposeAppeal}
          />
        ))}
      </div>
    </div>
  );
}

function AppealCard({
  appeal,
  isCourtOfficial,
  onAdmit,
  onDispose,
}: {
  appeal: AppealWithRelations;
  isCourtOfficial: boolean;
  onAdmit: (id: string) => Promise<{ error: string | null }>;
  onDispose: (
    id: string,
    input: {
      status: "allowed" | "dismissed" | "withdrawn" | "rejected" | "time_barred";
      disposal_reason?: string | null;
    }
  ) => Promise<{ error: string | null }>;
}) {
  const [actioning, setActioning] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [showDisposal, setShowDisposal] = useState(false);
  const [disposalStatus, setDisposalStatus] = useState<
    "allowed" | "dismissed" | "withdrawn" | "rejected"
  >("dismissed");
  const [disposalReason, setDisposalReason] = useState("");

  const isOpen = appeal.status === "filed" || appeal.status === "admitted";

  const handleAdmit = async () => {
    setActioning(true);
    setActionError(null);
    const { error } = await onAdmit(appeal.id);
    setActioning(false);
    if (error) setActionError(error);
  };

  const handleDispose = async () => {
    setActioning(true);
    setActionError(null);
    const { error } = await onDispose(appeal.id, {
      status: disposalStatus,
      disposal_reason: disposalReason,
    });
    setActioning(false);
    if (error) {
      setActionError(error);
      return;
    }
    setShowDisposal(false);
    setDisposalReason("");
  };

  return (
    <Card className="p-5 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Gavel className="w-4 h-4 text-gray-500" />
            <span className="font-semibold text-gray-900">
              {appeal.appeal_number || "Appeal (number pending)"}
            </span>
            <Badge variant={statusVariants[appeal.status]}>
              {APPEAL_STATUS_LABELS[appeal.status]}
            </Badge>
            {appeal.is_time_barred && (
              <Badge variant="danger">Filed beyond limitation</Badge>
            )}
          </div>
          <div className="text-sm text-gray-600">
            {APPEAL_FORUM_LABELS[appeal.appellate_forum]} ·{" "}
            {APPEAL_SIDE_LABELS[appeal.appellant_side]} as appellant
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div>
          <div className="text-xs uppercase text-gray-500 tracking-wide">
            Appellant
          </div>
          <div className="text-gray-900">
            {appeal.appellant?.full_name ?? "—"}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500 tracking-wide">
            Respondent
          </div>
          <div className="text-gray-900">
            {appeal.respondent?.full_name ?? "—"}
          </div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500 tracking-wide">
            Judgment Date
          </div>
          <div className="text-gray-900">{formatDate(appeal.judgment_date)}</div>
        </div>
        <div>
          <div className="text-xs uppercase text-gray-500 tracking-wide">
            Filed On
          </div>
          <div className="text-gray-900 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-gray-500" />
            {formatDate(appeal.filed_on)} · limitation {appeal.limitation_days}d
          </div>
        </div>
      </div>

      {appeal.condonation_requested && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
          <div className="text-xs uppercase text-amber-800 tracking-wide flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            Condonation of delay requested
          </div>
          {appeal.condonation_reason && (
            <div className="mt-1 text-sm text-amber-900 whitespace-pre-wrap">
              {appeal.condonation_reason}
            </div>
          )}
        </div>
      )}

      <div>
        <div className="text-xs uppercase text-gray-500 tracking-wide flex items-center gap-1 mb-1">
          <FileText className="w-3.5 h-3.5" />
          Grounds of Appeal
        </div>
        <div className="text-sm text-gray-800 whitespace-pre-wrap p-3 bg-gray-50 rounded-md">
          {appeal.grounds_of_appeal}
        </div>
      </div>

      <div>
        <div className="text-xs uppercase text-gray-500 tracking-wide mb-1">
          Relief Sought
        </div>
        <div className="text-sm text-gray-800 whitespace-pre-wrap p-3 bg-gray-50 rounded-md">
          {appeal.relief_sought}
        </div>
      </div>

      {appeal.admitted_at && (
        <div className="text-xs text-gray-500 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-blue-500" />
          Admitted on {formatDateTime(appeal.admitted_at)}
          {appeal.admitted_by_profile?.full_name &&
            ` by ${appeal.admitted_by_profile.full_name}`}
        </div>
      )}

      {appeal.disposal_date && (
        <div className="text-xs text-gray-500">
          Disposed on {formatDateTime(appeal.disposal_date)}
          {appeal.disposal_reason && ` — ${appeal.disposal_reason}`}
        </div>
      )}

      {appeal.filed_by_profile?.full_name && (
        <div className="text-xs text-gray-500">
          Filed by {appeal.filed_by_profile.full_name} on{" "}
          {formatDateTime(appeal.created_at)}
        </div>
      )}

      {actionError && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
          <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
          <div className="text-sm text-red-900">{actionError}</div>
        </div>
      )}

      {isCourtOfficial && isOpen && (
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
          {appeal.status === "filed" && (
            <Button
              size="sm"
              onClick={handleAdmit}
              disabled={actioning}
            >
              Admit Appeal
            </Button>
          )}
          {!showDisposal ? (
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setShowDisposal(true)}
              disabled={actioning}
            >
              Dispose Appeal
            </Button>
          ) : (
            <div className="w-full space-y-2 mt-2">
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={disposalStatus}
                  onChange={(e) =>
                    setDisposalStatus(
                      e.target.value as
                        | "allowed"
                        | "dismissed"
                        | "withdrawn"
                        | "rejected"
                    )
                  }
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="allowed">Allow (appeal succeeds)</option>
                  <option value="dismissed">Dismiss on merits</option>
                  <option value="rejected">
                    Reject under Order XLI Rule 11
                  </option>
                  <option value="withdrawn">Withdrawn by appellant</option>
                </select>
                <Button
                  size="sm"
                  onClick={handleDispose}
                  disabled={actioning}
                >
                  Confirm Disposal
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    setShowDisposal(false);
                    setDisposalReason("");
                  }}
                  disabled={actioning}
                >
                  Cancel
                </Button>
              </div>
              <textarea
                value={disposalReason}
                onChange={(e) => setDisposalReason(e.target.value)}
                rows={2}
                placeholder="Brief reason / operative order (optional)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              />
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
