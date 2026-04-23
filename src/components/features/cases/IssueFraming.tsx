"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { useCaseIssues } from "@/hooks/useCaseIssues";
import { formatDate } from "@/lib/utils";
import {
  ISSUE_TYPE_LABELS,
  ISSUE_FINDING_LABELS,
  type CaseIssue,
  type IssueType,
  type IssueFinding,
} from "@/types/hearing";
import { Gavel, Plus, Pencil, Trash2, Scale, CheckCircle2 } from "lucide-react";

interface Props {
  caseId: string;
  caseStatus: string;
  /** Can the current user add/edit/delete issues? (court officials while framing) */
  canFrame: boolean;
  /** Can the current user record findings? (judge at judgment time) */
  canDecide: boolean;
}

/**
 * Once the case has moved past issues_framed, issue text is effectively locked
 * (RLS allows updates through the lifecycle but the UI only exposes the
 * finding form in those later stages to match real court practice).
 */
const FRAMING_STATUSES = ["preliminary_hearing", "issues_framed"];

export default function IssueFraming({
  caseId,
  caseStatus,
  canFrame,
  canDecide,
}: Props) {
  const { issues, isLoading, addIssue, updateIssue, deleteIssue, recordFinding } =
    useCaseIssues(caseId);

  const inFramingPhase = FRAMING_STATUSES.includes(caseStatus);
  const canEditText = canFrame && inFramingPhase;

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
          <Scale className="h-5 w-5" />
          Issues Framed
          {issues.length > 0 && (
            <Badge variant="info">{issues.length}</Badge>
          )}
        </h3>
        {canEditText && !showAddForm && (
          <Button size="sm" onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4" />
            Add Issue
          </Button>
        )}
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      {showAddForm && (
        <IssueForm
          onCancel={() => setShowAddForm(false)}
          onSubmit={async (data) => {
            setError(null);
            const res = await addIssue(data);
            if (res.error) {
              setError(res.error);
              return;
            }
            setShowAddForm(false);
          }}
        />
      )}

      {isLoading ? (
        <div className="flex justify-center py-8">
          <Spinner />
        </div>
      ) : issues.length === 0 && !showAddForm ? (
        <EmptyState
          title="No issues framed yet"
          description={
            canEditText
              ? "Record the disputed questions of fact or law that the trial will resolve. Per CPC Order XIV, issues must be framed before the case can proceed to trial."
              : "The trial judge will record the disputed questions before the case moves to trial."
          }
          icon={<Gavel className="h-10 w-10" />}
        />
      ) : (
        <ol className="space-y-3">
          {issues.map((issue) =>
            editingId === issue.id ? (
              <li key={issue.id}>
                <IssueForm
                  initial={issue}
                  onCancel={() => setEditingId(null)}
                  onSubmit={async (data) => {
                    setError(null);
                    const res = await updateIssue(issue.id, data);
                    if (res.error) {
                      setError(res.error);
                      return;
                    }
                    setEditingId(null);
                  }}
                />
              </li>
            ) : (
              <li
                key={issue.id}
                className="rounded-lg border border-border bg-cream-light/50 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                        {issue.issue_number}
                      </span>
                      <Badge variant="default">
                        {ISSUE_TYPE_LABELS[issue.issue_type]}
                      </Badge>
                      {issue.finding && (
                        <Badge
                          variant={
                            issue.finding === "affirmative"
                              ? "success"
                              : issue.finding === "negative"
                                ? "danger"
                                : "warning"
                          }
                        >
                          <CheckCircle2 className="mr-1 inline h-3 w-3" />
                          {ISSUE_FINDING_LABELS[issue.finding]}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-foreground">
                      {issue.issue_text}
                    </p>
                    {issue.burden_of_proof && (
                      <p className="mt-1 text-xs text-muted">
                        <strong>Burden:</strong> {issue.burden_of_proof}
                      </p>
                    )}
                    {issue.framer && issue.framed_at && (
                      <p className="mt-2 text-xs text-muted">
                        Framed by {issue.framer.full_name} ·{" "}
                        {formatDate(issue.framed_at)}
                      </p>
                    )}
                    {issue.finding_text && (
                      <div className="mt-3 rounded border-l-2 border-primary/40 bg-cream px-3 py-2">
                        <p className="text-xs font-semibold text-primary">
                          Finding
                        </p>
                        <p className="mt-1 whitespace-pre-wrap text-sm">
                          {issue.finding_text}
                        </p>
                        {issue.decider && issue.decided_at && (
                          <p className="mt-1 text-xs text-muted">
                            Decided by {issue.decider.full_name} ·{" "}
                            {formatDate(issue.decided_at)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
                    {canEditText && (
                      <>
                        <button
                          onClick={() => setEditingId(issue.id)}
                          className="rounded p-1.5 text-muted hover:bg-primary/10 hover:text-primary"
                          title="Edit"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={async () => {
                            if (!confirm(`Delete Issue #${issue.issue_number}?`))
                              return;
                            setError(null);
                            const res = await deleteIssue(issue.id);
                            if (res.error) setError(res.error);
                          }}
                          className="rounded p-1.5 text-muted hover:bg-danger/10 hover:text-danger"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {canDecide && !issue.finding && !inFramingPhase && (
                  <div className="mt-3 border-t border-border pt-3">
                    {decidingId === issue.id ? (
                      <FindingForm
                        onCancel={() => setDecidingId(null)}
                        onSubmit={async (finding, text) => {
                          setError(null);
                          const res = await recordFinding(issue.id, finding, text);
                          if (res.error) {
                            setError(res.error);
                            return;
                          }
                          setDecidingId(null);
                        }}
                      />
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setDecidingId(issue.id)}
                      >
                        <Gavel className="h-4 w-4" />
                        Record Finding
                      </Button>
                    )}
                  </div>
                )}
              </li>
            )
          )}
        </ol>
      )}
    </Card>
  );
}

interface IssueFormProps {
  initial?: CaseIssue;
  onSubmit: (data: {
    issue_text: string;
    issue_type: IssueType;
    burden_of_proof: string | null;
  }) => Promise<void>;
  onCancel: () => void;
}

function IssueForm({ initial, onSubmit, onCancel }: IssueFormProps) {
  const [text, setText] = useState(initial?.issue_text ?? "");
  const [type, setType] = useState<IssueType>(initial?.issue_type ?? "fact");
  const [burden, setBurden] = useState(initial?.burden_of_proof ?? "");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="mb-4 rounded-lg border border-primary/30 bg-cream-light p-4">
      <p className="mb-3 text-sm font-semibold text-primary">
        {initial ? `Edit Issue #${initial.issue_number}` : "Frame New Issue"}
      </p>

      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">
          Issue Statement
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="e.g. Whether the plaintiff was in lawful possession of the suit property on 01-01-2024?"
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </label>

      <div className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">
            Issue Type
          </span>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as IssueType)}
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {(Object.keys(ISSUE_TYPE_LABELS) as IssueType[]).map((k) => (
              <option key={k} value={k}>
                {ISSUE_TYPE_LABELS[k]}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-muted">
            Burden of Proof (optional)
          </span>
          <input
            value={burden}
            onChange={(e) => setBurden(e.target.value)}
            placeholder="e.g. Plaintiff"
            className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          disabled={!text.trim() || submitting}
          isLoading={submitting}
          onClick={async () => {
            setSubmitting(true);
            await onSubmit({
              issue_text: text,
              issue_type: type,
              burden_of_proof: burden || null,
            });
            setSubmitting(false);
          }}
        >
          {initial ? "Save Changes" : "Add Issue"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}

interface FindingFormProps {
  onSubmit: (finding: IssueFinding, text: string) => Promise<void>;
  onCancel: () => void;
}

function FindingForm({ onSubmit, onCancel }: FindingFormProps) {
  const [finding, setFinding] = useState<IssueFinding>("affirmative");
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <div className="rounded-lg border border-primary/30 bg-cream-light p-3">
      <label className="mb-2 block">
        <span className="mb-1 block text-xs font-medium text-muted">
          Finding
        </span>
        <select
          value={finding}
          onChange={(e) => setFinding(e.target.value as IssueFinding)}
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {(Object.keys(ISSUE_FINDING_LABELS) as IssueFinding[]).map((k) => (
            <option key={k} value={k}>
              {ISSUE_FINDING_LABELS[k]}
            </option>
          ))}
        </select>
      </label>
      <label className="mb-3 block">
        <span className="mb-1 block text-xs font-medium text-muted">
          Reasoning (optional)
        </span>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          placeholder="Brief reasoning for this finding..."
          className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
      </label>
      <div className="flex gap-2">
        <Button
          size="sm"
          isLoading={submitting}
          onClick={async () => {
            setSubmitting(true);
            await onSubmit(finding, text);
            setSubmitting(false);
          }}
        >
          Save Finding
        </Button>
        <Button size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
