"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { AlertCircle, PenLine } from "lucide-react";

interface ProceedingsEditorProps {
  hearingId: string;
  existingText?: string | null;
  isReadOnly?: boolean;
  onSave: (hearingId: string, summary: string) => Promise<{ error: string | null }>;
}

export default function ProceedingsEditor({
  hearingId,
  existingText,
  isReadOnly = false,
  onSave,
}: ProceedingsEditorProps) {
  const [text, setText] = useState(existingText || "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!text.trim()) {
      setError("Proceedings summary cannot be empty.");
      return;
    }

    setIsSaving(true);
    setError("");

    const result = await onSave(hearingId, text.trim());
    setIsSaving(false);

    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <Card>
      <h4 className="mb-3 text-base font-semibold text-primary">
        <PenLine className="mr-2 inline h-4 w-4" />
        Proceedings Summary
      </h4>

      {isReadOnly ? (
        <div className="whitespace-pre-wrap rounded-lg border border-border bg-cream/50 p-3 text-sm">
          {existingText || "No proceedings recorded yet."}
        </div>
      ) : (
        <>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={8}
            placeholder="Record the proceedings of this hearing..."
            className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />

          {error && (
            <div className="mt-2 flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="mt-3">
            <Button size="sm" onClick={handleSave} isLoading={isSaving}>
              Save Proceedings
            </Button>
          </div>
        </>
      )}
    </Card>
  );
}
