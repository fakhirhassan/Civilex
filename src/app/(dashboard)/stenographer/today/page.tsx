"use client";

import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { useStenographerWorkload } from "@/hooks/useStenographerWorkload";
import { formatDate, formatDateTime } from "@/lib/utils";
import {
  HEARING_STATUS_LABELS,
  HEARING_TYPE_LABELS,
} from "@/types/hearing";
import { AlertCircle, Calendar, Clock, FileText, Lock, MapPin } from "lucide-react";

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export default function StenographerTodayPage() {
  const { rows, isLoading } = useStenographerWorkload();

  const today = new Date();
  const todayRows = rows
    .filter((r) => isSameDay(new Date(r.hearing.scheduled_date), today))
    .sort(
      (a, b) =>
        new Date(a.hearing.scheduled_date).getTime() -
        new Date(b.hearing.scheduled_date).getTime()
    );

  const upcomingRows = rows
    .filter((r) => new Date(r.hearing.scheduled_date) > today && !isSameDay(new Date(r.hearing.scheduled_date), today))
    .sort(
      (a, b) =>
        new Date(a.hearing.scheduled_date).getTime() -
        new Date(b.hearing.scheduled_date).getTime()
    )
    .slice(0, 10);

  return (
    <div>
      <Topbar title="Today's Hearings" />

      <div className="p-6 space-y-6">
        <Card>
          <h2 className="mb-2 flex items-center gap-2 text-lg font-semibold text-primary">
            <Calendar className="h-5 w-5" />
            Today — {formatDate(today.toISOString())}
          </h2>

          {todayRows.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-3 rounded-lg bg-cream-light/60 p-3 text-xs">
              <span>
                <strong>{todayRows.filter((r) => r.hearing.status === "scheduled").length}</strong> to call
              </span>
              <span>
                <strong>{todayRows.filter((r) => r.hearing.status === "in_progress").length}</strong> in progress
              </span>
              <span>
                <strong>{todayRows.filter((r) => r.hearing.status === "completed").length}</strong> completed
              </span>
              <span>
                <strong>
                  {todayRows.filter((r) => !r.transcript || r.transcript.status === "draft").length}
                </strong>{" "}
                transcripts pending
              </span>
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : todayRows.length === 0 ? (
            <EmptyState
              title="No hearings today"
              description="You don't have any hearings scheduled for today on your assigned cases."
              icon={<Calendar className="h-10 w-10" />}
            />
          ) : (
            <div className="space-y-3">
              {todayRows.map(({ hearing, transcript }) => (
                <Link
                  key={hearing.id}
                  href={`/cases/${hearing.case_id}/hearings/${hearing.id}`}
                  className="block rounded-lg border border-border p-4 transition-colors hover:bg-cream-dark/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {hearing.case?.title || "—"}{" "}
                        <span className="text-xs text-muted">
                          · {hearing.case?.case_number}
                        </span>
                      </p>
                      <p className="mt-1 text-xs text-muted">
                        {HEARING_TYPE_LABELS[hearing.hearing_type]} · Hearing #
                        {hearing.hearing_number}
                      </p>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDateTime(hearing.scheduled_date)}
                        </span>
                        {hearing.courtroom && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {hearing.courtroom}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge
                        variant={
                          hearing.status === "completed"
                            ? "success"
                            : hearing.status === "in_progress"
                              ? "warning"
                              : hearing.status === "cancelled"
                                ? "danger"
                                : "info"
                        }
                      >
                        {HEARING_STATUS_LABELS[hearing.status]}
                      </Badge>
                      {transcript ? (
                        <Badge
                          variant={transcript.status === "signed" ? "success" : "warning"}
                        >
                          {transcript.status === "signed" ? (
                            <>
                              <Lock className="mr-1 inline h-3 w-3" />
                              Signed
                            </>
                          ) : (
                            <>
                              <FileText className="mr-1 inline h-3 w-3" />
                              Transcript Draft
                            </>
                          )}
                        </Badge>
                      ) : (
                        <Badge variant="default">No transcript yet</Badge>
                      )}
                    </div>
                  </div>

                  {/* Completeness hints for the assigned steno/reader */}
                  {(() => {
                    const hints: string[] = [];
                    if (hearing.status === "completed" && !transcript) {
                      hints.push("Hearing completed — transcript not started.");
                    }
                    if (
                      (hearing.status === "completed" ||
                        hearing.status === "adjourned") &&
                      !hearing.next_hearing_date
                    ) {
                      hints.push("No next hearing date set.");
                    }
                    if (transcript?.status === "draft") {
                      hints.push("Transcript draft awaiting sign-off.");
                    }
                    if (hints.length === 0) return null;
                    return (
                      <div className="mt-3 flex items-start gap-2 rounded border border-warning/40 bg-warning-light/50 px-3 py-2 text-xs text-yellow-900">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                        <div className="space-y-0.5">
                          {hints.map((h) => (
                            <p key={h}>{h}</p>
                          ))}
                        </div>
                      </div>
                    );
                  })()}
                </Link>
              ))}
            </div>
          )}
        </Card>

        {upcomingRows.length > 0 && (
          <Card>
            <h3 className="mb-4 text-base font-semibold text-primary">
              Upcoming
            </h3>
            <div className="space-y-2">
              {upcomingRows.map(({ hearing }) => (
                <Link
                  key={hearing.id}
                  href={`/cases/${hearing.case_id}/hearings/${hearing.id}`}
                  className="flex items-center justify-between rounded-lg border border-border p-3 text-sm transition-colors hover:bg-cream-dark/40"
                >
                  <div>
                    <p className="font-medium text-foreground">
                      {hearing.case?.title}
                    </p>
                    <p className="text-xs text-muted">
                      {HEARING_TYPE_LABELS[hearing.hearing_type]} · Hearing #
                      {hearing.hearing_number}
                    </p>
                  </div>
                  <span className="text-xs text-muted">
                    {formatDate(hearing.scheduled_date)}
                  </span>
                </Link>
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
