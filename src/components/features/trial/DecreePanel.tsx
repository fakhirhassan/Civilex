"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { useDecree } from "@/hooks/useDecree";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  DECREE_TYPE_LABELS,
  DECREE_STATUS_LABELS,
  type DecreeType,
  type DecreeStatus,
} from "@/types/trial";
import {
  Gavel,
  ScrollText,
  CheckCircle2,
  AlertCircle,
  Edit3,
  Lock,
} from "lucide-react";

interface Props {
  caseId: string;
  caseStatus: string;
  canDraw: boolean;
  judgmentId?: string | null;
  parties: {
    plaintiff?: { id: string; full_name: string } | null;
    defendant?: { id: string; full_name: string } | null;
  };
}

const statusVariants: Record<
  DecreeStatus,
  "default" | "success" | "danger" | "warning" | "info" | "primary"
> = {
  drafted: "warning",
  signed: "info",
  pending_execution: "primary",
  executed: "success",
  satisfied: "success",
};

const ELIGIBLE_STATUSES = ["judgment_delivered", "closed", "disposed"];

export default function DecreePanel({
  caseId,
  caseStatus,
  canDraw,
  judgmentId,
  parties,
}: Props) {
  const { decree, isLoading, drawUpDecree, updateDecree, signDecree, updateStatus } =
    useDecree(caseId);

  const [editing, setEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [decreeType, setDecreeType] = useState<DecreeType>(
    decree?.decree_type ?? "money"
  );
  const [decreeNumber, setDecreeNumber] = useState(decree?.decree_number ?? "");
  const [operativeText, setOperativeText] = useState(decree?.operative_text ?? "");
  const [reliefGranted, setReliefGranted] = useState(decree?.relief_granted ?? "");
  const [amount, setAmount] = useState(
    decree?.amount_awarded != null ? String(decree.amount_awarded) : ""
  );
  const [costs, setCosts] = useState(
    decree?.costs_awarded != null ? String(decree.costs_awarded) : ""
  );
  const [interestTerms, setInterestTerms] = useState(decree?.interest_terms ?? "");
  const [complianceDays, setComplianceDays] = useState(
    decree?.compliance_period_days != null
      ? String(decree.compliance_period_days)
      : ""
  );
  const [holderId, setHolderId] = useState<string>(
    decree?.decree_holder_id ?? parties.plaintiff?.id ?? ""
  );
  const [debtorId, setDebtorId] = useState<string>(
    decree?.judgment_debtor_id ?? parties.defendant?.id ?? ""
  );

  const partyOptions = [
    ...(parties.plaintiff
      ? [
          {
            id: parties.plaintiff.id,
            label: `${parties.plaintiff.full_name} (plaintiff)`,
          },
        ]
      : []),
    ...(parties.defendant
      ? [
          {
            id: parties.defendant.id,
            label: `${parties.defendant.full_name} (defendant)`,
          },
        ]
      : []),
  ];

  const caseAllowsDrawing = ELIGIBLE_STATUSES.includes(caseStatus);
  const isSigned = decree?.status && decree.status !== "drafted";
  const canEdit = canDraw && !isSigned;

  const resetForm = () => {
    setError(null);
    setDecreeType("money");
    setDecreeNumber("");
    setOperativeText("");
    setReliefGranted("");
    setAmount("");
    setCosts("");
    setInterestTerms("");
    setComplianceDays("");
    setHolderId(parties.plaintiff?.id ?? "");
    setDebtorId(parties.defendant?.id ?? "");
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError(null);
    const payload = {
      decree_type: decreeType,
      decree_number: decreeNumber || null,
      operative_text: operativeText,
      relief_granted: reliefGranted || null,
      amount_awarded: amount ? parseFloat(amount) : null,
      costs_awarded: costs ? parseFloat(costs) : null,
      interest_terms: interestTerms || null,
      compliance_period_days: complianceDays ? parseInt(complianceDays) : null,
      decree_holder_id: holderId || null,
      judgment_debtor_id: debtorId || null,
      judgment_id: judgmentId ?? null,
    };
    const result = decree
      ? await updateDecree(decree.id, payload)
      : await drawUpDecree(payload);
    setSubmitting(false);
    if (result.error) setError(result.error);
    else setEditing(false);
  };

  const handleSign = async () => {
    if (!decree) return;
    setSubmitting(true);
    setError(null);
    const result = await signDecree(decree.id);
    setSubmitting(false);
    if (result.error) setError(result.error);
  };

  const handleStatusTransition = async (status: DecreeStatus) => {
    if (!decree) return;
    setSubmitting(true);
    setError(null);
    const result = await updateStatus(decree.id, status);
    setSubmitting(false);
    if (result.error) setError(result.error);
  };

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-base font-semibold text-primary">
          <ScrollText className="h-5 w-5" />
          Decree
          {decree && (
            <Badge variant={statusVariants[decree.status]}>
              {DECREE_STATUS_LABELS[decree.status]}
            </Badge>
          )}
        </h3>
        {canEdit && decree && !editing && (
          <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
            <Edit3 className="h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-3 flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : !decree && !editing ? (
        canDraw && caseAllowsDrawing ? (
          <div className="rounded-lg border border-dashed border-primary/40 bg-cream-light/40 p-6 text-center">
            <Gavel className="mx-auto h-8 w-8 text-primary" />
            <p className="mt-2 text-sm font-medium text-foreground">
              No decree drawn up yet.
            </p>
            <p className="mt-1 text-xs text-muted">
              Draw up the formal decree so the decree-holder may execute if the
              judgment-debtor does not comply.
            </p>
            <Button
              className="mt-3"
              size="sm"
              onClick={() => {
                resetForm();
                setEditing(true);
              }}
            >
              Draw Up Decree
            </Button>
          </div>
        ) : (
          <EmptyState
            title="Decree not available"
            description={
              canDraw
                ? "A decree can only be drawn up after the judgment is delivered."
                : "The decree will appear here once the judge draws it up."
            }
            icon={<ScrollText className="h-10 w-10" />}
          />
        )
      ) : editing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">
                Decree Type *
              </span>
              <select
                value={decreeType}
                onChange={(e) => setDecreeType(e.target.value as DecreeType)}
                className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {(Object.keys(DECREE_TYPE_LABELS) as DecreeType[]).map((k) => (
                  <option key={k} value={k}>
                    {DECREE_TYPE_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">
                Decree Number
              </span>
              <input
                type="text"
                value={decreeNumber}
                onChange={(e) => setDecreeNumber(e.target.value)}
                placeholder="e.g. D-2026/123"
                className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">
                Decree-Holder (wins)
              </span>
              <select
                value={holderId}
                onChange={(e) => setHolderId(e.target.value)}
                className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">—</option>
                {partyOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">
                Judgment-Debtor (loses)
              </span>
              <select
                value={debtorId}
                onChange={(e) => setDebtorId(e.target.value)}
                className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">—</option>
                {partyOptions.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">
              Operative Text *
            </span>
            <textarea
              rows={6}
              value={operativeText}
              onChange={(e) => setOperativeText(e.target.value)}
              placeholder="The operative portion of the decree — what the court orders, who must do what, by when…"
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">
              Relief Granted (narrative)
            </span>
            <textarea
              rows={2}
              value={reliefGranted}
              onChange={(e) => setReliefGranted(e.target.value)}
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">
                Amount Awarded (PKR)
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">
                Costs Awarded (PKR)
              </span>
              <input
                type="number"
                min="0"
                step="0.01"
                value={costs}
                onChange={(e) => setCosts(e.target.value)}
                className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">
                Compliance Period (days)
              </span>
              <input
                type="number"
                min="0"
                value={complianceDays}
                onChange={(e) => setComplianceDays(e.target.value)}
                placeholder="e.g. 30"
                className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-xs font-medium text-muted">
              Interest Terms
            </span>
            <input
              type="text"
              value={interestTerms}
              onChange={(e) => setInterestTerms(e.target.value)}
              placeholder="e.g. 8% p.a. from date of decree until realisation"
              className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSubmit} isLoading={submitting}>
              {decree ? "Save Changes" : "Draw Up Decree"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditing(false);
                setError(null);
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : decree ? (
        <DecreeView
          decree={decree}
          canEdit={canEdit}
          canSign={canDraw && decree.status === "drafted"}
          canTransition={canDraw && decree.status !== "drafted"}
          onSign={handleSign}
          onTransition={handleStatusTransition}
          submitting={submitting}
        />
      ) : null}
    </Card>
  );
}

function DecreeView({
  decree,
  canEdit,
  canSign,
  canTransition,
  onSign,
  onTransition,
  submitting,
}: {
  decree: ReturnType<typeof useDecree>["decree"] extends null
    ? never
    : NonNullable<ReturnType<typeof useDecree>["decree"]>;
  canEdit: boolean;
  canSign: boolean;
  canTransition: boolean;
  onSign: () => void;
  onTransition: (status: DecreeStatus) => void;
  submitting: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
        <KV label="Type" value={DECREE_TYPE_LABELS[decree.decree_type]} />
        <KV label="Decree No." value={decree.decree_number || "—"} />
        <KV
          label="Decree-Holder"
          value={decree.decree_holder?.full_name || "—"}
        />
        <KV
          label="Judgment-Debtor"
          value={decree.judgment_debtor?.full_name || "—"}
        />
        {decree.amount_awarded != null && (
          <KV label="Amount" value={formatCurrency(decree.amount_awarded)} />
        )}
        {decree.costs_awarded != null && (
          <KV label="Costs" value={formatCurrency(decree.costs_awarded)} />
        )}
        {decree.compliance_period_days != null && (
          <KV
            label="Compliance Period"
            value={`${decree.compliance_period_days} days`}
          />
        )}
        {decree.interest_terms && (
          <KV label="Interest" value={decree.interest_terms} />
        )}
      </div>

      <div>
        <p className="mb-1 text-xs font-medium text-muted">Operative Text</p>
        <div className="whitespace-pre-wrap rounded-lg border border-border bg-cream-light/50 p-3 text-sm">
          {decree.operative_text}
        </div>
      </div>

      {decree.relief_granted && (
        <div>
          <p className="mb-1 text-xs font-medium text-muted">Relief Granted</p>
          <div className="whitespace-pre-wrap rounded-lg border border-border bg-cream-light/50 p-3 text-sm">
            {decree.relief_granted}
          </div>
        </div>
      )}

      <div className="space-y-1 border-t border-border pt-3 text-xs text-muted">
        {decree.drawn_up_by_profile && (
          <p>
            Drawn up by {decree.drawn_up_by_profile.full_name}
            {decree.drawn_up_at ? ` · ${formatDateTime(decree.drawn_up_at)}` : ""}
          </p>
        )}
        {decree.signed_by_profile && decree.signed_at && (
          <p>
            <Lock className="mr-1 inline h-3 w-3" />
            Signed by {decree.signed_by_profile.full_name} ·{" "}
            {formatDateTime(decree.signed_at)}
          </p>
        )}
      </div>

      {(canSign || canTransition) && (
        <div className="flex flex-wrap gap-2 border-t border-border pt-3">
          {canSign && (
            <Button size="sm" onClick={onSign} isLoading={submitting}>
              <CheckCircle2 className="h-4 w-4" />
              Sign Decree
            </Button>
          )}
          {canTransition && decree.status === "signed" && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onTransition("pending_execution")}
              isLoading={submitting}
            >
              Mark Pending Execution
            </Button>
          )}
          {canTransition &&
            (decree.status === "signed" ||
              decree.status === "pending_execution") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onTransition("executed")}
                isLoading={submitting}
              >
                Mark Executed
              </Button>
            )}
          {canTransition && decree.status === "executed" && (
            <Button
              size="sm"
              variant="primary"
              onClick={() => onTransition("satisfied")}
              isLoading={submitting}
            >
              Mark Satisfied
            </Button>
          )}
        </div>
      )}

      {!canEdit && decree.status === "drafted" && (
        <p className="text-xs text-muted">
          Draft decree — not yet signed.
        </p>
      )}
    </div>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted">{label}</p>
      <p className="mt-0.5 text-foreground">{value}</p>
    </div>
  );
}
