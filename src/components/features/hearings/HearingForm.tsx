"use client";

import { useState } from "react";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { HEARING_TYPE_LABELS } from "@/types/hearing";
import type { HearingType } from "@/types/hearing";
import { Calendar, AlertCircle } from "lucide-react";

interface HearingFormProps {
  onSubmit: (data: {
    hearing_type: HearingType;
    scheduled_date: string;
    courtroom?: string;
  }) => Promise<{ error: string | null }>;
  onCancel?: () => void;
}

export default function HearingForm({ onSubmit, onCancel }: HearingFormProps) {
  const [hearingType, setHearingType] = useState<HearingType>("preliminary");
  const [scheduledDate, setScheduledDate] = useState("");
  const [courtroom, setCourtroom] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!scheduledDate) {
      setError("Please select a date and time for the hearing.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    const result = await onSubmit({
      hearing_type: hearingType,
      scheduled_date: new Date(scheduledDate).toISOString(),
      courtroom: courtroom.trim() || undefined,
    });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error);
    }
  };

  return (
    <Card>
      <h3 className="mb-4 text-lg font-semibold text-primary">
        <Calendar className="mr-2 inline h-5 w-5" />
        Schedule Hearing
      </h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Hearing Type
          </label>
          <select
            value={hearingType}
            onChange={(e) => setHearingType(e.target.value as HearingType)}
            className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {Object.entries(HEARING_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Scheduled Date & Time
          </label>
          <input
            type="datetime-local"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            min={new Date().toISOString().slice(0, 16)}
            className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            Courtroom (Optional)
          </label>
          <input
            type="text"
            value={courtroom}
            onChange={(e) => setCourtroom(e.target.value)}
            placeholder="e.g., Court Room 3, Block A"
            className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <Button type="submit" isLoading={isSubmitting}>
            Schedule Hearing
          </Button>
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </form>
    </Card>
  );
}
