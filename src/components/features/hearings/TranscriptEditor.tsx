"use client";

import { useEffect, useRef, useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useHearingTranscript } from "@/hooks/useHearingTranscript";
import { formatDateTime } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  FileSignature,
  Lock,
  Mic,
  Save,
} from "lucide-react";

interface TranscriptEditorProps {
  hearingId: string;
  caseId: string;
  /** Can this user edit the transcript? (stenographer assigned to case, or court official) */
  canEdit: boolean;
  /** Can this user sign the transcript? (the stenographer who owns it) */
  canSign: boolean;
}

const AUTOSAVE_DELAY_MS = 2000;

export default function TranscriptEditor({
  hearingId,
  caseId,
  canEdit,
  canSign,
}: TranscriptEditorProps) {
  const { transcript, isLoading, saveTranscript, signTranscript } =
    useHearingTranscript(hearingId, caseId);
  const [text, setText] = useState("");
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [error, setError] = useState("");
  const [isSigning, setIsSigning] = useState(false);
  const [showSignConfirm, setShowSignConfirm] = useState(false);
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync local text when the transcript loads/changes
  useEffect(() => {
    setText(transcript?.transcript_text || "");
  }, [transcript?.id, transcript?.transcript_text]);

  const isSigned = transcript?.status === "signed";
  const isReadOnly = !canEdit || isSigned;

  // Debounced autosave
  useEffect(() => {
    if (isReadOnly) return;
    if (text === (transcript?.transcript_text || "")) return;

    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    autosaveTimer.current = setTimeout(async () => {
      setSaveState("saving");
      setError("");
      const result = await saveTranscript(text);
      if (result.error) {
        setError(result.error);
        setSaveState("error");
      } else {
        setSaveState("saved");
      }
    }, AUTOSAVE_DELAY_MS);

    return () => {
      if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    };
  }, [text, transcript?.transcript_text, isReadOnly, saveTranscript]);

  const handleManualSave = async () => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current);
    setSaveState("saving");
    setError("");
    const result = await saveTranscript(text);
    if (result.error) {
      setError(result.error);
      setSaveState("error");
    } else {
      setSaveState("saved");
    }
  };

  const handleSign = async () => {
    setIsSigning(true);
    setError("");
    // Flush any pending text first
    if (text !== (transcript?.transcript_text || "")) {
      const saveResult = await saveTranscript(text);
      if (saveResult.error) {
        setError(saveResult.error);
        setIsSigning(false);
        return;
      }
    }
    const result = await signTranscript();
    setIsSigning(false);
    if (result.error) {
      setError(result.error);
    } else {
      setShowSignConfirm(false);
    }
  };

  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;

  return (
    <Card>
      <div className="mb-3 flex items-start justify-between gap-3">
        <h4 className="text-base font-semibold text-primary">
          <Mic className="mr-2 inline h-4 w-4" />
          Verbatim Transcript
        </h4>
        {transcript && (
          <Badge variant={isSigned ? "success" : "warning"}>
            {isSigned ? (
              <>
                <Lock className="mr-1 inline h-3 w-3" />
                Signed
              </>
            ) : (
              "Draft"
            )}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Loading transcript…</p>
      ) : (
        <>
          {isSigned && transcript?.signed_at && (
            <div className="mb-3 rounded-lg border border-success/30 bg-success/10 p-2 text-xs text-success">
              <CheckCircle2 className="mr-1 inline h-3 w-3" />
              Signed by {transcript.stenographer?.full_name || "Stenographer"} on{" "}
              {formatDateTime(transcript.signed_at)} — this is the official record.
            </div>
          )}

          {isReadOnly ? (
            <div className="min-h-[12rem] whitespace-pre-wrap rounded-lg border border-border bg-cream/50 p-3 font-mono text-sm">
              {text || (
                <span className="text-muted italic">
                  No transcript recorded yet.
                </span>
              )}
            </div>
          ) : (
            <>
              <textarea
                value={text}
                onChange={(e) => {
                  setText(e.target.value);
                  setSaveState("idle");
                }}
                rows={14}
                placeholder="Record proceedings verbatim — judge's dictation, counsel's submissions, witness statements, court remarks…"
                className="w-full resize-y rounded-lg border border-border bg-cream-light px-3 py-2 font-mono text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />

              <div className="mt-2 flex items-center justify-between text-xs text-muted">
                <span>{wordCount.toLocaleString()} words</span>
                <span>
                  {saveState === "saving" && "Saving…"}
                  {saveState === "saved" && (
                    <span className="text-success">
                      <CheckCircle2 className="mr-1 inline h-3 w-3" />
                      Saved
                    </span>
                  )}
                  {saveState === "error" && (
                    <span className="text-danger">Failed to save</span>
                  )}
                </span>
              </div>
            </>
          )}

          {error && (
            <div className="mt-3 flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          {!isReadOnly && (
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={handleManualSave}
                isLoading={saveState === "saving"}
                disabled={text === (transcript?.transcript_text || "")}
              >
                <Save className="h-4 w-4" />
                Save
              </Button>
              {canSign && transcript && (
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => setShowSignConfirm(true)}
                  disabled={!text.trim()}
                >
                  <FileSignature className="h-4 w-4" />
                  Sign & Finalize
                </Button>
              )}
            </div>
          )}
        </>
      )}

      {showSignConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-xl">
            <h3 className="mb-3 text-lg font-semibold text-primary">
              Sign transcript?
            </h3>
            <p className="mb-4 text-sm text-muted">
              Once signed, this transcript becomes the official record of the
              hearing and can no longer be edited. Make sure the text is
              complete and accurate.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSignConfirm(false)}
                disabled={isSigning}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleSign}
                isLoading={isSigning}
              >
                <FileSignature className="h-4 w-4" />
                Confirm & Sign
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
