"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { usePlaintDraft } from "@/hooks/usePlaintDraft";
import PlaintPreview from "./PlaintPreview";
import {
  DRAFT_SECTION_LABELS,
  REQUIRED_SECTIONS,
  type DraftSectionKey,
  type PlaintDraft,
} from "@/types/draft";
import {
  FileText,
  Sparkles,
  Save,
  Send,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  AlertTriangle,
} from "lucide-react";

interface Props {
  caseId: string;
  caseStatus: string;
  onSubmitted?: () => void;
}

type TextSectionKey = Exclude<DraftSectionKey, "facts">;

const TEXT_SECTIONS: TextSectionKey[] = [
  "cause_title",
  "parties_block",
  "suit_subject",
  "jurisdiction_clause",
  "cause_of_action",
  "limitation_clause",
  "court_fees_paid",
  "reliefs_sought",
  "verification_clause",
];

const SECTION_PLACEHOLDERS: Partial<Record<DraftSectionKey, string>> = {
  cause_title:
    "IN THE COURT OF LEARNED FAMILY JUDGE, HARIPUR",
  parties_block:
    "1- Mst. Rushna Gull W/O Waqar Ahmed\n2- Hadia Noor D/O Waqar Ahmed\n   Both R/O Mohalla Thaikadaran, Talokar, Tehsil & District Haripur\n                                                              ...Plaintiffs\n\n                              Versus\n\nWaqar Ahmed S/O Munshi Khan\nR/O Lane No. 03, Mohalla Gulistan Colony, Milad Chowk, Rawalpindi.\n                                                              ...Defendant",
  suit_subject:
    "SUIT FOR RECOVERY OF MAINTENANCE, DOWER AND DOWRY ARTICLES",
  jurisdiction_clause:
    "That the plaintiff is residing within the territorial limits of this Hon'ble Court, therefore this Hon'ble Court has jurisdiction to try and entertain this suit.",
  cause_of_action:
    "That the cause of action accrued against the defendant on [date] when [event], and is still continuing, hence this suit.",
  limitation_clause:
    "That the present suit has been filed within the limitation prescribed under the Limitation Act 1908.",
  court_fees_paid: "That the prescribed court fee has been affixed on the plaint.",
  reliefs_sought:
    "It is therefore respectfully prayed that the suit for [relief] may kindly be decreed in favour of the plaintiff against the defendant with cost.\n\nAny other relief which this Hon'ble Court deems fit and proper may also be granted to the plaintiff.",
  verification_clause:
    "Verified on oath at [place] on _____________ that the contents of the plaint are true and correct to the best of my knowledge and belief.",
};

export default function PlaintDraftPanel({ caseId, caseStatus, onSubmitted }: Props) {
  const {
    draft,
    loading,
    saveDraft,
    submitDraft,
    addFact,
    updateFact,
    removeFact,
  } = usePlaintDraft(caseId);

  const [local, setLocal] = useState<Partial<Record<TextSectionKey, string>>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [aiOpenFor, setAiOpenFor] = useState<DraftSectionKey | null>(null);
  const [aiInstruction, setAiInstruction] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState("");

  // Hydrate local state from draft
  useEffect(() => {
    if (!draft) return;
    setLocal({
      cause_title: draft.cause_title,
      parties_block: draft.parties_block,
      suit_subject: draft.suit_subject,
      jurisdiction_clause: draft.jurisdiction_clause,
      cause_of_action: draft.cause_of_action,
      limitation_clause: draft.limitation_clause,
      court_fees_paid: draft.court_fees_paid,
      reliefs_sought: draft.reliefs_sought,
      verification_clause: draft.verification_clause,
    });
  }, [draft?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const isLocked = draft?.status === "submitted" || draft?.status === "approved";

  const handleSave = async () => {
    setSaving(true);
    setError("");
    const { error: err } = await saveDraft(local);
    setSaving(false);
    if (err) setError(err);
  };

  const validateBeforeSubmit = (current: PlaintDraft | null): string | null => {
    if (!current) return "Draft has not been created yet — save first.";
    for (const key of REQUIRED_SECTIONS) {
      if (key === "facts") {
        if (!current.facts.length || current.facts.every((f) => !f.text.trim())) {
          return "At least one fact paragraph is required.";
        }
      } else {
        const value = (local[key as TextSectionKey] ?? "").trim();
        if (!value) return `${DRAFT_SECTION_LABELS[key]} is required.`;
      }
    }
    return null;
  };

  const handleSubmit = async () => {
    setError("");
    // Save first to flush any unsaved changes
    setSaving(true);
    const saveResult = await saveDraft(local);
    setSaving(false);
    if (saveResult.error) {
      setError(saveResult.error);
      return;
    }

    const validation = validateBeforeSubmit(draft);
    if (validation) {
      setError(validation);
      return;
    }

    setSubmitting(true);
    const { error: submitErr } = await submitDraft();
    setSubmitting(false);
    if (submitErr) {
      setError(submitErr);
      return;
    }
    onSubmitted?.();
  };

  const requestAi = async (section: DraftSectionKey) => {
    setAiBusy(true);
    setAiError("");
    setAiSuggestion("");
    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caseId,
          section,
          instruction: aiInstruction.trim() || undefined,
          currentText:
            section === "facts"
              ? draft?.facts.map((f) => `${f.number}. ${f.text}`).join("\n\n")
              : local[section] || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAiError(data.error || "AI request failed");
      } else {
        setAiSuggestion(data.text);
      }
    } catch {
      setAiError("Network error");
    } finally {
      setAiBusy(false);
    }
  };

  const acceptAiSuggestion = async () => {
    if (!aiOpenFor || !aiSuggestion) return;
    if (aiOpenFor === "facts") {
      // Split by blank lines or numbered lines and replace facts
      const lines = aiSuggestion
        .split(/\n+/)
        .map((s) => s.replace(/^\s*\d+\.\s*/, "").trim())
        .filter(Boolean);
      const next = lines.map((text, i) => ({ number: i + 1, text }));
      await saveDraft({ facts: next });
    } else {
      const key = aiOpenFor as TextSectionKey;
      const updated = { ...local, [key]: aiSuggestion };
      setLocal(updated);
      await saveDraft({ [key]: aiSuggestion });
    }
    setAiOpenFor(null);
    setAiInstruction("");
    setAiSuggestion("");
  };

  if (loading) {
    return (
      <Card className="flex justify-center py-10">
        <Spinner />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-primary">Plaint Draft</h3>
              <p className="mt-1 text-xs text-muted">
                Compose the plaint section by section. Use the ✨ button on any
                section for an AI-assisted draft.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {draft?.status && (
              <Badge
                variant={
                  draft.status === "approved"
                    ? "success"
                    : draft.status === "submitted"
                    ? "info"
                    : draft.status === "returned"
                    ? "danger"
                    : "warning"
                }
              >
                {draft.status.replace("_", " ")}
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowPreview((v) => !v)}
            >
              {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showPreview ? "Edit" : "Preview"}
            </Button>
          </div>
        </div>

        {draft?.status === "returned" && draft.revision_notes && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-danger bg-danger-light p-3 text-sm text-danger">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Returned by Admin Court for revision</p>
              <p className="mt-1 whitespace-pre-wrap">{draft.revision_notes}</p>
            </div>
          </div>
        )}

        {isLocked && (
          <div className="mt-4 rounded-lg border border-warning bg-warning-light p-3 text-sm text-warning">
            This draft is locked while it is with the admin court. Wait for
            approval or return.
          </div>
        )}
      </Card>

      {showPreview && draft ? (
        <PlaintPreview
          draft={{
            ...draft,
            ...local,
            facts: draft.facts,
          } as PlaintDraft}
        />
      ) : (
        <>
          {/* Text sections */}
          {TEXT_SECTIONS.map((section) => (
            <Card key={section}>
              <div className="flex items-center justify-between gap-2">
                <label className="text-sm font-semibold text-primary">
                  {DRAFT_SECTION_LABELS[section]}
                  {REQUIRED_SECTIONS.includes(section) && (
                    <span className="ml-1 text-danger">*</span>
                  )}
                </label>
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isLocked}
                  onClick={() => {
                    setAiOpenFor(section);
                    setAiInstruction("");
                    setAiSuggestion("");
                    setAiError("");
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  AI Suggest
                </Button>
              </div>
              <textarea
                value={local[section] ?? ""}
                disabled={isLocked}
                onChange={(e) => setLocal({ ...local, [section]: e.target.value })}
                rows={
                  section === "parties_block" || section === "reliefs_sought" ? 8 :
                  section === "cause_title" || section === "suit_subject" ||
                  section === "limitation_clause" || section === "court_fees_paid"
                    ? 2
                    : 4
                }
                placeholder={SECTION_PLACEHOLDERS[section] ?? ""}
                className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 font-serif text-sm leading-relaxed disabled:opacity-60"
              />
            </Card>
          ))}

          {/* Facts list */}
          <Card>
            <div className="flex items-center justify-between gap-2">
              <label className="text-sm font-semibold text-primary">
                {DRAFT_SECTION_LABELS.facts}
                <span className="ml-1 text-danger">*</span>
              </label>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  disabled={isLocked}
                  onClick={() => {
                    setAiOpenFor("facts");
                    setAiInstruction("");
                    setAiSuggestion("");
                    setAiError("");
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                  AI Suggest All Facts
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={isLocked}
                  onClick={() => addFact()}
                >
                  <Plus className="h-4 w-4" />
                  Add Fact
                </Button>
              </div>
            </div>
            <div className="mt-3 space-y-3">
              {draft?.facts.length === 0 && (
                <p className="text-xs text-muted">
                  No facts yet. Add a numbered fact paragraph to begin.
                </p>
              )}
              {draft?.facts.map((fact, i) => (
                <div key={i} className="flex gap-3">
                  <span className="mt-2 shrink-0 text-sm font-semibold text-primary">
                    {fact.number}.
                  </span>
                  <textarea
                    value={fact.text}
                    disabled={isLocked}
                    onChange={(e) => {
                      // Local edit only — debounce-like: we save on blur
                      const updated = draft.facts.map((f, idx) =>
                        idx === i ? { ...f, text: e.target.value } : f
                      );
                      // Optimistic local update via saveDraft
                      saveDraft({ facts: updated });
                    }}
                    onBlur={(e) => updateFact(i, e.target.value)}
                    rows={3}
                    placeholder={`That ...`}
                    className="flex-1 rounded-lg border border-border bg-background px-3 py-2 font-serif text-sm leading-relaxed disabled:opacity-60"
                  />
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={isLocked}
                    onClick={() => removeFact(i)}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </div>
              ))}
            </div>
          </Card>
        </>
      )}

      {error && (
        <div className="rounded-lg border border-danger bg-danger-light p-3 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="sticky bottom-4 flex justify-end gap-2 rounded-lg border border-border bg-white/90 p-3 shadow-lg backdrop-blur">
        <Button variant="outline" onClick={handleSave} isLoading={saving} disabled={isLocked}>
          <Save className="h-4 w-4" />
          Save Draft
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isLoading={submitting}
          disabled={isLocked || !["drafting", "returned_for_revision"].includes(caseStatus)}
        >
          <Send className="h-4 w-4" />
          Submit to Admin Court
        </Button>
      </div>

      {/* AI Suggest Dialog */}
      {aiOpenFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-2xl rounded-xl border border-border bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                  <Sparkles className="h-5 w-5" />
                  AI Suggest — {DRAFT_SECTION_LABELS[aiOpenFor]}
                </h3>
                <p className="mt-1 text-xs text-muted">
                  AI uses the case info you already entered. It will mark missing
                  details as [MISSING: ...] for you to fill.
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setAiOpenFor(null)}
              >
                ✕
              </Button>
            </div>

            <label className="mt-4 block text-sm">
              <span className="mb-1 block text-muted">
                Optional specific instruction
              </span>
              <textarea
                value={aiInstruction}
                onChange={(e) => setAiInstruction(e.target.value)}
                rows={2}
                placeholder='e.g. "make it more concise" or "emphasise the cruelty allegations"'
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>

            {!aiSuggestion && !aiBusy && (
              <div className="mt-4 flex justify-end">
                <Button onClick={() => requestAi(aiOpenFor)}>
                  <Sparkles className="h-4 w-4" />
                  Generate
                </Button>
              </div>
            )}

            {aiBusy && (
              <div className="mt-6 flex justify-center">
                <Spinner />
              </div>
            )}

            {aiError && (
              <div className="mt-4 rounded-lg border border-danger bg-danger-light p-3 text-sm text-danger">
                {aiError}
              </div>
            )}

            {aiSuggestion && (
              <>
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                    Suggestion
                  </p>
                  <textarea
                    value={aiSuggestion}
                    onChange={(e) => setAiSuggestion(e.target.value)}
                    rows={10}
                    className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 font-serif text-sm leading-relaxed"
                  />
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => requestAi(aiOpenFor)}>
                    <Sparkles className="h-4 w-4" />
                    Regenerate
                  </Button>
                  <Button variant="ghost" onClick={() => setAiOpenFor(null)}>
                    Discard
                  </Button>
                  <Button variant="primary" onClick={acceptAiSuggestion}>
                    Use This
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
