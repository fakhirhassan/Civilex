"use client";

import { useMemo, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { useExecution } from "@/hooks/useExecution";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  EXECUTION_MODE_LABELS,
  EXECUTION_STATUS_LABELS,
  WARRANT_TYPE_LABELS,
  WARRANT_STATUS_LABELS,
  type ExecutionMode,
  type ExecutionStatus,
  type WarrantType,
  type WarrantStatus,
  type ExecutionApplicationWithRelations,
} from "@/types/trial";
import {
  Hammer,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Scale,
  ScrollText,
} from "lucide-react";

interface Props {
  caseId: string;
  currentUserId: string | null;
  isCourtOfficial: boolean;
  decree: {
    id: string;
    status: string;
    decree_holder_id: string | null;
    judgment_debtor_id: string | null;
    amount_awarded: number | null;
  } | null;
  parties: {
    plaintiff?: { id: string; full_name: string } | null;
    defendant?: { id: string; full_name: string } | null;
  };
}

const statusVariants: Record<
  ExecutionStatus,
  "default" | "success" | "danger" | "warning" | "info" | "primary"
> = {
  filed: "warning",
  notice_issued: "info",
  attachment_ordered: "info",
  property_attached: "primary",
  sale_ordered: "primary",
  warrant_issued: "primary",
  satisfied: "success",
  partially_satisfied: "warning",
  struck_off: "default",
  dismissed: "danger",
};

const warrantStatusVariants: Record<
  WarrantStatus,
  "default" | "success" | "danger" | "warning" | "info" | "primary"
> = {
  issued: "warning",
  served: "info",
  returned_executed: "success",
  returned_unexecuted: "danger",
  recalled: "default",
};

const DECREE_ELIGIBLE_STATUSES = ["signed", "executed", "pending_execution"];

export default function ExecutionPanel({
  caseId,
  currentUserId,
  isCourtOfficial,
  decree,
  parties,
}: Props) {
  const {
    applications,
    isLoading,
    fileExecution,
    issueNotice,
    orderAttachment,
    updateStatus,
    recordSatisfaction,
    issueWarrant,
    updateWarrantStatus,
  } = useExecution(caseId);

  const decreeReady = !!decree && DECREE_ELIGIBLE_STATUSES.includes(decree.status);
  const isDecreeHolder =
    !!currentUserId && !!decree?.decree_holder_id && currentUserId === decree.decree_holder_id;
  const canFile = decreeReady && (isDecreeHolder || isCourtOfficial);

  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [executionMode, setExecutionMode] = useState<ExecutionMode>("attachment_movable");
  const [executionNumber, setExecutionNumber] = useState("");
  const [decretalAmount, setDecretalAmount] = useState(
    decree?.amount_awarded?.toString() ?? ""
  );
  const [propertyDescription, setPropertyDescription] = useState("");
  const [propertyLocation, setPropertyLocation] = useState("");
  const [grounds, setGrounds] = useState("");
  const [reliefSought, setReliefSought] = useState("");

  const defaultHolder = useMemo(() => {
    if (!decree?.decree_holder_id) return null;
    if (parties.plaintiff?.id === decree.decree_holder_id) return parties.plaintiff;
    if (parties.defendant?.id === decree.decree_holder_id) return parties.defendant;
    return null;
  }, [decree, parties]);

  const defaultDebtor = useMemo(() => {
    if (!decree?.judgment_debtor_id) return null;
    if (parties.plaintiff?.id === decree.judgment_debtor_id) return parties.plaintiff;
    if (parties.defendant?.id === decree.judgment_debtor_id) return parties.defendant;
    return null;
  }, [decree, parties]);

  const resetForm = () => {
    setExecutionMode("attachment_movable");
    setExecutionNumber("");
    setDecretalAmount(decree?.amount_awarded?.toString() ?? "");
    setPropertyDescription("");
    setPropertyLocation("");
    setGrounds("");
    setReliefSought("");
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!decree || !decree.decree_holder_id || !decree.judgment_debtor_id) {
      setError("Decree parties not set — cannot file execution.");
      return;
    }
    setSubmitting(true);
    setError(null);

    const parsedAmount = decretalAmount ? Number(decretalAmount) : null;
    if (decretalAmount && Number.isNaN(parsedAmount)) {
      setError("Decretal amount must be a number");
      setSubmitting(false);
      return;
    }

    const { error: err } = await fileExecution({
      decree_id: decree.id,
      execution_mode: executionMode,
      decree_holder_id: decree.decree_holder_id,
      judgment_debtor_id: decree.judgment_debtor_id,
      decretal_amount: parsedAmount,
      property_description: propertyDescription,
      property_location: propertyLocation,
      grounds,
      relief_sought: reliefSought,
      execution_number: executionNumber,
    });

    setSubmitting(false);
    if (err) {
      setError(err);
      return;
    }
    resetForm();
    setShowForm(false);
  };

  if (isLoading) {
    return (
      <Card className="flex justify-center py-10">
        <Spinner />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Hammer className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary">
                Execution of Decree
              </h3>
              <p className="mt-1 text-sm text-muted">
                CPC Order XXI — attachment, sale, delivery, arrest, and
                satisfaction of the decree.
              </p>
            </div>
          </div>
          {canFile && !showForm && (
            <Button onClick={() => setShowForm(true)}>File Execution</Button>
          )}
        </div>

        {!decreeReady && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning bg-warning-light p-3 text-sm text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              Execution can only be filed once the decree has been signed.
            </span>
          </div>
        )}
      </Card>

      {showForm && canFile && decree && (
        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h4 className="text-base font-semibold text-primary">
                File Execution Application
              </h4>
              <p className="mt-1 text-xs text-muted">
                Decree-holder: {defaultHolder?.full_name ?? "—"} · Judgment-debtor:{" "}
                {defaultDebtor?.full_name ?? "—"}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block text-muted">Mode of Execution</span>
                <select
                  value={executionMode}
                  onChange={(e) =>
                    setExecutionMode(e.target.value as ExecutionMode)
                  }
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                >
                  {(Object.keys(EXECUTION_MODE_LABELS) as ExecutionMode[]).map(
                    (m) => (
                      <option key={m} value={m}>
                        {EXECUTION_MODE_LABELS[m]}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-muted">Execution Number</span>
                <input
                  type="text"
                  value={executionNumber}
                  onChange={(e) => setExecutionNumber(e.target.value)}
                  placeholder="Optional"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-muted">Decretal Amount (PKR)</span>
                <input
                  type="number"
                  step="0.01"
                  value={decretalAmount}
                  onChange={(e) => setDecretalAmount(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>

              <label className="text-sm">
                <span className="mb-1 block text-muted">
                  Property Location (if applicable)
                </span>
                <input
                  type="text"
                  value={propertyLocation}
                  onChange={(e) => setPropertyLocation(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                />
              </label>
            </div>

            <label className="block text-sm">
              <span className="mb-1 block text-muted">
                Property Description (for attachment / delivery modes)
              </span>
              <textarea
                value={propertyDescription}
                onChange={(e) => setPropertyDescription(e.target.value)}
                rows={2}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-muted">Grounds for Execution</span>
              <textarea
                value={grounds}
                onChange={(e) => setGrounds(e.target.value)}
                rows={4}
                required
                placeholder="State why execution is sought (non-compliance with decree, specific default, etc.)"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>

            <label className="block text-sm">
              <span className="mb-1 block text-muted">Relief Sought</span>
              <textarea
                value={reliefSought}
                onChange={(e) => setReliefSought(e.target.value)}
                rows={3}
                required
                placeholder="Specific prayer: attachment of X property, arrest of judgment-debtor, etc."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>

            {error && (
              <div className="rounded-lg border border-danger bg-danger-light p-2 text-sm text-danger">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit" isLoading={submitting}>
                File Application
              </Button>
            </div>
          </form>
        </Card>
      )}

      {applications.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Scale className="h-12 w-12" />}
            title="No execution applications"
            description={
              canFile
                ? "File an execution application once the judgment-debtor defaults on the decree."
                : "Execution applications will appear here when the decree-holder files one."
            }
          />
        </Card>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <ExecutionCard
              key={app.id}
              app={app}
              currentUserId={currentUserId}
              isCourtOfficial={isCourtOfficial}
              onIssueNotice={() => issueNotice(app.id)}
              onOrderAttachment={() => orderAttachment(app.id)}
              onUpdateStatus={(s) => updateStatus(app.id, s)}
              onRecordSatisfaction={(input) => recordSatisfaction(app.id, input)}
              onIssueWarrant={(input) =>
                issueWarrant({ ...input, execution_id: app.id })
              }
              onUpdateWarrant={updateWarrantStatus}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface CardProps {
  app: ExecutionApplicationWithRelations;
  currentUserId: string | null;
  isCourtOfficial: boolean;
  onIssueNotice: () => Promise<{ error: string | null }>;
  onOrderAttachment: () => Promise<{ error: string | null }>;
  onUpdateStatus: (s: ExecutionStatus) => Promise<{ error: string | null }>;
  onRecordSatisfaction: (input: {
    status: "satisfied" | "partially_satisfied";
    amount_recovered?: number | null;
    satisfaction_note?: string | null;
  }) => Promise<{ error: string | null }>;
  onIssueWarrant: (input: {
    warrant_type: WarrantType;
    directions: string;
    returnable_by?: string | null;
    bailiff_name?: string | null;
    warrant_number?: string | null;
  }) => Promise<{ error: string | null }>;
  onUpdateWarrant: (
    warrantId: string,
    status: WarrantStatus,
    note?: string
  ) => Promise<{ error: string | null }>;
}

function ExecutionCard({
  app,
  currentUserId,
  isCourtOfficial,
  onIssueNotice,
  onOrderAttachment,
  onUpdateStatus,
  onRecordSatisfaction,
  onIssueWarrant,
  onUpdateWarrant,
}: CardProps) {
  const [showWarrantForm, setShowWarrantForm] = useState(false);
  const [showSatisfactionForm, setShowSatisfactionForm] = useState(false);
  const [acting, setActing] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const [warrantType, setWarrantType] = useState<WarrantType>("attachment");
  const [warrantDirections, setWarrantDirections] = useState("");
  const [warrantReturnable, setWarrantReturnable] = useState("");
  const [warrantBailiff, setWarrantBailiff] = useState("");

  const [satisfactionStatus, setSatisfactionStatus] = useState<
    "satisfied" | "partially_satisfied"
  >("satisfied");
  const [amountRecovered, setAmountRecovered] = useState("");
  const [satisfactionNote, setSatisfactionNote] = useState("");

  const handleSimple = async (
    fn: () => Promise<{ error: string | null }>
  ) => {
    setActing(true);
    setActionError(null);
    const { error } = await fn();
    setActing(false);
    if (error) setActionError(error);
  };

  const handleSubmitWarrant = async (e: React.FormEvent) => {
    e.preventDefault();
    setActing(true);
    setActionError(null);
    const { error } = await onIssueWarrant({
      warrant_type: warrantType,
      directions: warrantDirections,
      returnable_by: warrantReturnable || null,
      bailiff_name: warrantBailiff,
    });
    setActing(false);
    if (error) {
      setActionError(error);
      return;
    }
    setWarrantType("attachment");
    setWarrantDirections("");
    setWarrantReturnable("");
    setWarrantBailiff("");
    setShowWarrantForm(false);
  };

  const handleSubmitSatisfaction = async (e: React.FormEvent) => {
    e.preventDefault();
    setActing(true);
    setActionError(null);
    const amount = amountRecovered ? Number(amountRecovered) : null;
    if (amountRecovered && Number.isNaN(amount)) {
      setActing(false);
      setActionError("Amount must be a number");
      return;
    }
    const { error } = await onRecordSatisfaction({
      status: satisfactionStatus,
      amount_recovered: amount,
      satisfaction_note: satisfactionNote,
    });
    setActing(false);
    if (error) {
      setActionError(error);
      return;
    }
    setAmountRecovered("");
    setSatisfactionNote("");
    setShowSatisfactionForm(false);
  };

  const terminal = ["satisfied", "struck_off", "dismissed"].includes(app.status);
  const canActAsCourt = isCourtOfficial && !terminal;
  const isOwnApp = currentUserId === app.decree_holder_id;

  return (
    <Card className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="truncate text-base font-semibold text-primary">
              {app.execution_number
                ? `Execution #${app.execution_number}`
                : EXECUTION_MODE_LABELS[app.execution_mode]}
            </h4>
            <Badge variant={statusVariants[app.status]}>
              {EXECUTION_STATUS_LABELS[app.status]}
            </Badge>
            <Badge variant="default">
              {EXECUTION_MODE_LABELS[app.execution_mode]}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted">
            Filed {formatDate(app.filed_on)}
            {app.filed_by_profile?.full_name &&
              ` by ${app.filed_by_profile.full_name}`}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 text-sm md:grid-cols-2">
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs uppercase tracking-wide text-muted">
            Decree-Holder
          </p>
          <p className="mt-1 font-medium text-primary">
            {app.decree_holder?.full_name ?? "—"}
          </p>
        </div>
        <div className="rounded-lg border border-border p-3">
          <p className="text-xs uppercase tracking-wide text-muted">
            Judgment-Debtor
          </p>
          <p className="mt-1 font-medium text-primary">
            {app.judgment_debtor?.full_name ?? "—"}
          </p>
        </div>
        {app.decretal_amount !== null && (
          <div className="rounded-lg border border-border p-3">
            <p className="text-xs uppercase tracking-wide text-muted">
              Decretal Amount
            </p>
            <p className="mt-1 font-medium text-primary">
              PKR {Number(app.decretal_amount).toLocaleString()}
            </p>
          </div>
        )}
        {app.amount_recovered !== null &&
          Number(app.amount_recovered) > 0 && (
            <div className="rounded-lg border border-success bg-success-light p-3">
              <p className="text-xs uppercase tracking-wide text-success">
                Amount Recovered
              </p>
              <p className="mt-1 font-medium text-success">
                PKR {Number(app.amount_recovered).toLocaleString()}
              </p>
            </div>
          )}
      </div>

      {(app.property_description || app.property_location) && (
        <div className="rounded-lg border border-border p-3 text-sm">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted">
            <ScrollText className="h-3.5 w-3.5" /> Property
          </p>
          {app.property_description && (
            <p className="mt-1 whitespace-pre-wrap text-primary">
              {app.property_description}
            </p>
          )}
          {app.property_location && (
            <p className="mt-1 text-xs text-muted">
              Location: {app.property_location}
            </p>
          )}
        </div>
      )}

      <div className="rounded-lg border border-border p-3 text-sm">
        <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted">
          <FileText className="h-3.5 w-3.5" /> Grounds
        </p>
        <p className="mt-1 whitespace-pre-wrap text-primary">{app.grounds}</p>
      </div>

      <div className="rounded-lg border border-border p-3 text-sm">
        <p className="text-xs uppercase tracking-wide text-muted">
          Relief Sought
        </p>
        <p className="mt-1 whitespace-pre-wrap text-primary">
          {app.relief_sought}
        </p>
      </div>

      {app.satisfaction_note && (
        <div className="rounded-lg border border-success bg-success-light p-3 text-sm">
          <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-success">
            <CheckCircle2 className="h-3.5 w-3.5" /> Satisfaction Note
          </p>
          <p className="mt-1 whitespace-pre-wrap text-success">
            {app.satisfaction_note}
          </p>
          {app.satisfied_at && (
            <p className="mt-1 text-xs text-success">
              Recorded {formatDateTime(app.satisfied_at)}
            </p>
          )}
        </div>
      )}

      {app.warrants && app.warrants.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Warrants Issued
          </p>
          {app.warrants.map((w) => (
            <div
              key={w.id}
              className="rounded-lg border border-border p-3 text-sm"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium text-primary">
                  {WARRANT_TYPE_LABELS[w.warrant_type]}
                </span>
                <Badge variant={warrantStatusVariants[w.status]}>
                  {WARRANT_STATUS_LABELS[w.status]}
                </Badge>
                {w.warrant_number && (
                  <span className="text-xs text-muted">#{w.warrant_number}</span>
                )}
              </div>
              <p className="mt-1 text-xs text-muted">
                Issued {formatDate(w.issued_on)}
                {w.bailiff_name && ` · Bailiff: ${w.bailiff_name}`}
                {w.returnable_by && ` · Returnable by ${formatDate(w.returnable_by)}`}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-primary">
                {w.directions}
              </p>
              {w.return_note && (
                <p className="mt-2 rounded border border-border bg-background p-2 text-xs text-primary">
                  Return: {w.return_note}
                </p>
              )}
              {isCourtOfficial && w.status === "issued" && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onUpdateWarrant(w.id, "returned_executed")
                    }
                  >
                    Mark Executed
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      onUpdateWarrant(w.id, "returned_unexecuted")
                    }
                  >
                    Mark Unexecuted
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onUpdateWarrant(w.id, "recalled")}
                  >
                    Recall
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {actionError && (
        <div className="rounded-lg border border-danger bg-danger-light p-2 text-sm text-danger">
          {actionError}
        </div>
      )}

      {canActAsCourt && !showWarrantForm && !showSatisfactionForm && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {app.status === "filed" && (
            <Button
              size="sm"
              onClick={() => handleSimple(onIssueNotice)}
              disabled={acting}
            >
              Issue Notice (Rule 22)
            </Button>
          )}
          {(app.status === "filed" || app.status === "notice_issued") && (
            <Button
              size="sm"
              onClick={() => handleSimple(onOrderAttachment)}
              disabled={acting}
            >
              Order Attachment
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowWarrantForm(true)}
          >
            Issue Warrant
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowSatisfactionForm(true)}
          >
            Record Satisfaction
          </Button>
          {app.status !== "struck_off" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSimple(() => onUpdateStatus("struck_off"))}
              disabled={acting}
            >
              Strike Off
            </Button>
          )}
          {app.status !== "dismissed" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handleSimple(() => onUpdateStatus("dismissed"))}
              disabled={acting}
            >
              Dismiss
            </Button>
          )}
        </div>
      )}

      {showWarrantForm && (
        <form
          onSubmit={handleSubmitWarrant}
          className="space-y-3 border-t border-border pt-3"
        >
          <p className="text-sm font-semibold text-primary">Issue Warrant</p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-muted">Warrant Type</span>
              <select
                value={warrantType}
                onChange={(e) => setWarrantType(e.target.value as WarrantType)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                {(Object.keys(WARRANT_TYPE_LABELS) as WarrantType[]).map((t) => (
                  <option key={t} value={t}>
                    {WARRANT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted">Returnable By</span>
              <input
                type="date"
                value={warrantReturnable}
                onChange={(e) => setWarrantReturnable(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Bailiff Name</span>
            <input
              type="text"
              value={warrantBailiff}
              onChange={(e) => setWarrantBailiff(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Directions</span>
            <textarea
              value={warrantDirections}
              onChange={(e) => setWarrantDirections(e.target.value)}
              rows={3}
              required
              placeholder="What the warrant authorises the bailiff to do"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowWarrantForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={acting}>
              Issue Warrant
            </Button>
          </div>
        </form>
      )}

      {showSatisfactionForm && (
        <form
          onSubmit={handleSubmitSatisfaction}
          className="space-y-3 border-t border-border pt-3"
        >
          <p className="text-sm font-semibold text-primary">
            Record Satisfaction (Order XXI Rule 2)
          </p>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <label className="text-sm">
              <span className="mb-1 block text-muted">Status</span>
              <select
                value={satisfactionStatus}
                onChange={(e) =>
                  setSatisfactionStatus(
                    e.target.value as "satisfied" | "partially_satisfied"
                  )
                }
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              >
                <option value="satisfied">Fully Satisfied</option>
                <option value="partially_satisfied">Partially Satisfied</option>
              </select>
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-muted">Amount Recovered (PKR)</span>
              <input
                type="number"
                step="0.01"
                value={amountRecovered}
                onChange={(e) => setAmountRecovered(e.target.value)}
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block text-muted">Note</span>
            <textarea
              value={satisfactionNote}
              onChange={(e) => setSatisfactionNote(e.target.value)}
              rows={3}
              placeholder="Details of satisfaction (payment received, property delivered, etc.)"
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
          </label>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowSatisfactionForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={acting}>
              Record
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
