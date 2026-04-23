"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { useAdjournments } from "@/hooks/useAdjournments";
import { formatDate, formatDateTime, formatCurrency } from "@/lib/utils";
import {
  ADJOURNMENT_REASON_LABELS,
  type AdjournmentReason,
} from "@/types/hearing";
import { PauseCircle, Plus, Clock } from "lucide-react";

interface Props {
  hearingId: string;
  caseId: string;
  canAdjourn: boolean;
}

export default function AdjournmentPanel({ hearingId, caseId, canAdjourn }: Props) {
  const { adjournments, isLoading, addAdjournment } = useAdjournments(
    hearingId,
    caseId
  );
  const [showForm, setShowForm] = useState(false);
  const [reason, setReason] = useState<AdjournmentReason>("party_absent");
  const [reasonText, setReasonText] = useState("");
  const [cost, setCost] = useState<string>("");
  const [nextDate, setNextDate] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    const res = await addAdjournment({
      reason,
      reason_text: reasonText,
      cost_imposed: cost ? parseFloat(cost) : 0,
      next_date: nextDate ? new Date(nextDate).toISOString() : null,
    });
    setSubmitting(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setShowForm(false);
    setReasonText("");
    setCost("");
    setNextDate("");
  };

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h4 className="flex items-center gap-2 text-base font-semibold text-primary">
          <PauseCircle className="h-5 w-5" />
          Adjournments
          {adjournments.length > 0 && (
            <Badge variant="default">{adjournments.length}</Badge>
          )}
        </h4>
        {canAdjourn && !showForm && (
          <Button size="sm" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            Record Adjournment
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-4 rounded-lg border border-primary/30 bg-cream-light p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Reason</span>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as AdjournmentReason)}
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {(Object.keys(ADJOURNMENT_REASON_LABELS) as AdjournmentReason[]).map((k) => (
                  <option key={k} value={k}>
                    {ADJOURNMENT_REASON_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-muted">Cost Imposed (PKR)</span>
              <input
                type="number"
                min="0"
                step="100"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0"
                className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </label>
          </div>

          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-medium text-muted">Next Hearing Date</span>
            <input
              type="datetime-local"
              value={nextDate}
              min={new Date().toISOString().slice(0, 16)}
              onChange={(e) => setNextDate(e.target.value)}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-medium text-muted">Notes (optional)</span>
            <textarea
              rows={2}
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              placeholder="Additional context for the adjournment..."
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </label>

          <div className="mt-3 flex gap-2">
            <Button size="sm" onClick={submit} isLoading={submitting}>
              Record Adjournment
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Cancel
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted">
            Recording an adjournment will mark the hearing as adjourned
            {nextDate ? " and set the next hearing date on the case." : "."}
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : adjournments.length === 0 ? (
        <EmptyState
          title="No adjournments recorded"
          description="If this hearing is adjourned, record the reason here for the audit trail."
          icon={<PauseCircle className="h-8 w-8" />}
        />
      ) : (
        <ul className="space-y-3">
          {adjournments.map((a) => (
            <li
              key={a.id}
              className="rounded-lg border border-border bg-cream-light/50 p-3"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="warning">
                  {ADJOURNMENT_REASON_LABELS[a.reason]}
                </Badge>
                {a.cost_imposed > 0 && (
                  <Badge variant="danger">
                    Cost: {formatCurrency(a.cost_imposed)}
                  </Badge>
                )}
                {a.next_date && (
                  <span className="inline-flex items-center gap-1 text-xs text-muted">
                    <Clock className="h-3 w-3" />
                    Next: {formatDate(a.next_date)}
                  </span>
                )}
              </div>
              {a.reason_text && (
                <p className="mt-2 text-sm whitespace-pre-wrap">{a.reason_text}</p>
              )}
              <p className="mt-2 text-xs text-muted">
                {a.adjourner?.full_name ? `${a.adjourner.full_name} · ` : ""}
                {formatDateTime(a.created_at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
