"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import Spinner from "@/components/ui/Spinner";
import { formatDateTime } from "@/lib/utils";
import { Mail, Gavel, AlertTriangle } from "lucide-react";

const MAX_SUMMONS = 3;

type SummonStatus = "active" | "responded" | "expired" | "superseded";

interface SummonRow {
  id: string;
  summon_number: number;
  code: string;
  status: SummonStatus;
  sent_to_email: string | null;
  email_delivered: boolean;
  email_provider: string | null;
  email_error: string | null;
  sent_at: string;
  responded_at: string | null;
  superseded_at: string | null;
  expires_at: string;
  sent_by_profile?: { full_name: string } | null;
}

interface Props {
  caseId: string;
  caseStatus: string;
  isCourtOfficial: boolean;
  defendantClaimed: boolean;
  onReissue: () => void;       // opens the existing Issue Summon dialog
  onChanged: () => void;       // refresh case after ex-parte
}

const statusVariants: Record<
  SummonStatus,
  "default" | "success" | "danger" | "warning" | "info"
> = {
  active: "warning",
  responded: "success",
  superseded: "default",
  expired: "danger",
};

const statusLabels: Record<SummonStatus, string> = {
  active: "Active",
  responded: "Responded",
  superseded: "Superseded",
  expired: "Expired",
};

export default function SummonsPanel({
  caseId,
  caseStatus,
  isCourtOfficial,
  defendantClaimed,
  onReissue,
  onChanged,
}: Props) {
  const [summons, setSummons] = useState<SummonRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exPartePending, setExPartePending] = useState(false);
  const [exParteError, setExParteError] = useState("");
  const [showExParteDialog, setShowExParteDialog] = useState(false);
  const [reason, setReason] = useState("");

  const fetchSummons = useCallback(async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("summons")
        .select(`
          id, summon_number, code, status, sent_to_email,
          email_delivered, email_provider, email_error,
          sent_at, responded_at, superseded_at, expires_at,
          sent_by_profile:profiles!sent_by(full_name)
        `)
        .eq("case_id", caseId)
        .order("summon_number", { ascending: true });
      if (error) {
        console.error("Error fetching summons:", error);
        setSummons([]);
      } else {
        setSummons((data as unknown as SummonRow[]) ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchSummons();
  }, [fetchSummons]);

  const totalIssued = summons.length;
  const responded = summons.some((s) => s.status === "responded");
  const canReissue =
    isCourtOfficial &&
    !defendantClaimed &&
    caseStatus === "summon_issued" &&
    totalIssued < MAX_SUMMONS;
  const canDeclareExParte =
    isCourtOfficial &&
    !defendantClaimed &&
    !responded &&
    caseStatus === "summon_issued" &&
    totalIssued >= MAX_SUMMONS;

  const handleDeclareExParte = async () => {
    setExPartePending(true);
    setExParteError("");
    try {
      const res = await fetch("/api/summon/declare-ex-parte", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId, reason: reason.trim() || undefined }),
      });
      const data = await res.json();
      if (!res.ok) {
        setExParteError(data.error || "Could not declare ex-parte");
      } else {
        setShowExParteDialog(false);
        setReason("");
        await fetchSummons();
        onChanged();
      }
    } catch {
      setExParteError("Network error");
    } finally {
      setExPartePending(false);
    }
  };

  if (loading) {
    return (
      <Card className="flex justify-center py-6">
        <Spinner />
      </Card>
    );
  }

  if (totalIssued === 0) return null;

  return (
    <>
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-primary/10 p-2 text-primary">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-primary">
                Summons History
              </h3>
              <p className="mt-1 text-xs text-muted">
                {totalIssued} of {MAX_SUMMONS} issued
                {responded && " — defendant has responded"}
              </p>
            </div>
          </div>
          {canReissue && (
            <Button size="sm" variant="outline" onClick={onReissue}>
              <Mail className="h-4 w-4" />
              Re-issue Summon
            </Button>
          )}
          {canDeclareExParte && (
            <Button
              size="sm"
              variant="danger"
              onClick={() => setShowExParteDialog(true)}
            >
              <Gavel className="h-4 w-4" />
              Declare Ex-Parte
            </Button>
          )}
        </div>

        <div className="mt-4 space-y-2">
          {summons.map((s) => (
            <div
              key={s.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border p-3 text-sm"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-primary">
                    Summon #{s.summon_number}
                  </span>
                  <Badge variant={statusVariants[s.status]}>
                    {statusLabels[s.status]}
                  </Badge>
                  <span className="font-mono text-xs text-muted">
                    Code: {s.code}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  Sent {formatDateTime(s.sent_at)}
                  {s.sent_by_profile?.full_name &&
                    ` by ${s.sent_by_profile.full_name}`}
                  {s.sent_to_email && ` · ${s.sent_to_email}`}
                </p>
                {s.responded_at && (
                  <p className="mt-0.5 text-xs text-success">
                    Responded {formatDateTime(s.responded_at)}
                  </p>
                )}
                {s.email_error && (
                  <p className="mt-0.5 text-xs text-danger">
                    Email error: {s.email_error}
                  </p>
                )}
                {!s.email_delivered && !s.email_error && (
                  <p className="mt-0.5 text-xs text-warning">
                    Email logged in {s.email_provider ?? "console"} mode (no provider configured)
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {totalIssued >= MAX_SUMMONS && !responded && !defendantClaimed && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-warning bg-warning-light p-3 text-sm text-warning">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              The defendant has not responded after {MAX_SUMMONS} summons.
              The court may now declare the case ex-parte and proceed in their
              absence.
            </span>
          </div>
        )}
      </Card>

      {showExParteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl border border-border bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-primary">
              Declare Case Ex-Parte
            </h3>
            <p className="mt-2 text-sm text-muted">
              The defendant has failed to respond after {totalIssued} summons.
              Declaring the case ex-parte will dispose of the case in the
              defendant&apos;s absence and the matter will proceed on the
              plaintiff&apos;s claim alone. This action cannot be undone from
              this screen.
            </p>
            <label className="mt-4 block text-sm">
              <span className="mb-1 block text-muted">Reason (optional)</span>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                placeholder="e.g. Defendant served at registered address but failed to appear despite three summons."
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
              />
            </label>
            {exParteError && (
              <div className="mt-3 rounded-lg border border-danger bg-danger-light p-2 text-sm text-danger">
                {exParteError}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowExParteDialog(false);
                  setExParteError("");
                }}
                disabled={exPartePending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                isLoading={exPartePending}
                onClick={handleDeclareExParte}
              >
                <Gavel className="h-4 w-4" />
                Confirm Ex-Parte
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
