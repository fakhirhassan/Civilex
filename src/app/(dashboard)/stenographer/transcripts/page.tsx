"use client";

import { useState } from "react";
import Link from "next/link";
import Topbar from "@/components/layout/Topbar";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { useStenographerWorkload } from "@/hooks/useStenographerWorkload";
import { formatDate } from "@/lib/utils";
import {
  HEARING_STATUS_LABELS,
  HEARING_TYPE_LABELS,
} from "@/types/hearing";
import { FileText, Lock, PenLine, Search } from "lucide-react";

type Filter = "all" | "pending" | "draft" | "signed";

export default function StenographerTranscriptsPage() {
  const { rows, isLoading } = useStenographerWorkload();
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");

  const filtered = rows.filter((r) => {
    if (filter === "pending" && r.transcript) return false;
    if (filter === "draft" && r.transcript?.status !== "draft") return false;
    if (filter === "signed" && r.transcript?.status !== "signed") return false;

    if (search.trim()) {
      const q = search.toLowerCase();
      const hay = `${r.hearing.case?.title ?? ""} ${r.hearing.case?.case_number ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  const counts = {
    all: rows.length,
    pending: rows.filter((r) => !r.transcript).length,
    draft: rows.filter((r) => r.transcript?.status === "draft").length,
    signed: rows.filter((r) => r.transcript?.status === "signed").length,
  };

  return (
    <div>
      <Topbar title="Transcripts" />

      <div className="p-6 space-y-6">
        <Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {(["all", "pending", "draft", "signed"] as Filter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === f
                      ? "bg-primary text-white"
                      : "bg-cream-light text-foreground hover:bg-primary/10"
                  }`}
                >
                  {f === "all"
                    ? "All"
                    : f === "pending"
                      ? "Pending"
                      : f === "draft"
                        ? "Draft"
                        : "Signed"}
                  <span className="ml-1 opacity-70">({counts[f]})</span>
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search cases…"
                className="w-full rounded-lg border border-border bg-cream-light py-2 pl-9 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary sm:w-64"
              />
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-primary">
            <FileText className="h-5 w-5" />
            Hearing Transcripts
          </h2>

          {isLoading ? (
            <div className="flex justify-center py-10">
              <Spinner />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              title="No transcripts match"
              description="Try a different filter or search term."
              icon={<FileText className="h-10 w-10" />}
            />
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(({ hearing, transcript }) => (
                <Link
                  key={hearing.id}
                  href={`/cases/${hearing.case_id}/hearings/${hearing.id}`}
                  className="flex flex-col gap-2 py-3 transition-colors hover:bg-cream-dark/40 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">
                      {hearing.case?.title}
                      <span className="ml-2 text-xs text-muted">
                        {hearing.case?.case_number}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      {HEARING_TYPE_LABELS[hearing.hearing_type]} · Hearing #
                      {hearing.hearing_number} ·{" "}
                      {formatDate(hearing.scheduled_date)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        hearing.status === "completed"
                          ? "success"
                          : hearing.status === "in_progress"
                            ? "warning"
                            : "info"
                      }
                    >
                      {HEARING_STATUS_LABELS[hearing.status]}
                    </Badge>
                    {!transcript && <Badge variant="default">No transcript</Badge>}
                    {transcript?.status === "draft" && (
                      <Badge variant="warning">
                        <PenLine className="mr-1 inline h-3 w-3" />
                        Draft · {transcript.word_count} words
                      </Badge>
                    )}
                    {transcript?.status === "signed" && (
                      <Badge variant="success">
                        <Lock className="mr-1 inline h-3 w-3" />
                        Signed · {transcript.word_count} words
                      </Badge>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
