"use client";

import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import { formatDate, formatDateTime } from "@/lib/utils";
import { HEARING_TYPE_LABELS, HEARING_STATUS_LABELS } from "@/types/hearing";
import type { HearingWithRelations } from "@/types/hearing";
import { Calendar, Clock, MapPin, User, FileText, ChevronRight } from "lucide-react";

const statusVariants: Record<string, "default" | "success" | "danger" | "warning" | "info" | "primary"> = {
  scheduled: "info",
  in_progress: "warning",
  completed: "success",
  adjourned: "default",
  cancelled: "danger",
};

interface HearingCardProps {
  hearing: HearingWithRelations;
  onClick?: () => void;
}

export default function HearingCard({ hearing, onClick }: HearingCardProps) {
  return (
    <Card
      padding="sm"
      className={onClick ? "cursor-pointer transition-all hover:border-primary hover:shadow-md" : ""}
      onClick={onClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
              {hearing.hearing_number}
            </span>
            <div>
              <h4 className="font-semibold text-foreground">
                {HEARING_TYPE_LABELS[hearing.hearing_type]}
              </h4>
              <Badge variant={statusVariants[hearing.status] || "default"}>
                {HEARING_STATUS_LABELS[hearing.status]}
              </Badge>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-sm text-muted">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {formatDate(hearing.scheduled_date)}
            </span>
            {hearing.actual_date && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Held: {formatDateTime(hearing.actual_date)}
              </span>
            )}
            {hearing.courtroom && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {hearing.courtroom}
              </span>
            )}
            {hearing.presiding_officer && (
              <span className="flex items-center gap-1">
                <User className="h-4 w-4" />
                {hearing.presiding_officer.full_name}
              </span>
            )}
          </div>

          {hearing.proceedings_summary && (
            <p className="mt-2 line-clamp-2 text-sm text-muted">
              <FileText className="mr-1 inline h-3.5 w-3.5" />
              {hearing.proceedings_summary}
            </p>
          )}

          {hearing.next_hearing_date && (
            <p className="mt-2 text-xs text-primary">
              Next hearing: {formatDate(hearing.next_hearing_date)}
            </p>
          )}

          {hearing.order_sheets && hearing.order_sheets.length > 0 && (
            <p className="mt-1 text-xs text-muted">
              {hearing.order_sheets.length} order{hearing.order_sheets.length > 1 ? "s" : ""} issued
            </p>
          )}
        </div>

        {onClick && <ChevronRight className="mt-2 h-5 w-5 shrink-0 text-muted" />}
      </div>
    </Card>
  );
}
