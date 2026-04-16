"use client";

import { useState } from "react";
import Topbar from "@/components/layout/Topbar";
import Table from "@/components/ui/Table";
import Badge from "@/components/ui/Badge";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Link from "next/link";
import { Plus, Search, Briefcase, Trash2 } from "lucide-react";
import { useCases } from "@/hooks/useCases";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";
import type { CaseWithRelations } from "@/types/case";
import type { CaseStatus } from "@/lib/constants";

export default function CasesPage() {
  const { user } = useAuth();
  const { cases, isLoading, withdrawCase } = useCases();
  const [search, setSearch] = useState("");
  const [withdrawConfirm, setWithdrawConfirm] = useState<{ id: string; title: string } | null>(null);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");

  const filtered = cases.filter(
    (c) =>
      c.status !== "disposed" &&
      (c.title.toLowerCase().includes(search.toLowerCase()) ||
        c.case_number.toLowerCase().includes(search.toLowerCase()))
  );

  const columns = [
    { key: "case_number", label: "Case ID" },
    { key: "title", label: "Title" },
    {
      key: "case_type",
      label: "Type",
      render: (item: CaseWithRelations) => (
        <Badge variant={item.case_type === "civil" ? "primary" : item.case_type === "family" ? "warning" : "danger"}>
          {item.case_type === "civil" ? "Civil" : item.case_type === "family" ? "Family" : "Criminal"}
        </Badge>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (item: CaseWithRelations) => (
        <StatusBadge status={item.status as CaseStatus} />
      ),
    },
    {
      key: "lawyer",
      label: "Lawyer",
      render: (item: CaseWithRelations) => {
        const accepted = item.assignments?.find((a) => a.status === "accepted");
        const pending = item.assignments?.find((a) => a.status === "pending");
        const assignment = accepted || pending;
        if (!assignment?.lawyer) return <span className="text-muted">—</span>;
        return (
          <span>
            {assignment.lawyer.full_name}
            {assignment.status === "pending" && (
              <Badge variant="warning" className="ml-1">
                Pending
              </Badge>
            )}
          </span>
        );
      },
    },
    {
      key: "next_hearing",
      label: "Next Hearing",
      render: (item: CaseWithRelations) =>
        item.next_hearing_date ? (
          formatDate(item.next_hearing_date)
        ) : (
          <span className="text-muted">—</span>
        ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (item: CaseWithRelations) => {
        const isClient = user?.role === "client";
        const allDeclined =
          item.assignments &&
          item.assignments.length > 0 &&
          item.assignments.every((a) => a.status === "declined");
        const canWithdraw =
          isClient &&
          (item.status === "draft" ||
            (item.status === "pending_lawyer_acceptance" && allDeclined));

        return (
          <div className="flex gap-2">
            <Link href={`/cases/${item.id}`}>
              <Button size="sm" variant="outline">
                View
              </Button>
            </Link>
            {canWithdraw && (
              <Button
                size="sm"
                variant="danger"
                onClick={(e) => {
                  e.preventDefault();
                  setWithdrawError("");
                  setWithdrawConfirm({ id: item.id, title: item.title });
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  const canCreateCase = user?.role === "client";

  return (
    <div>
      <Topbar title="Cases" />

      <div className="p-6">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <Input
              placeholder="Search cases..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          {canCreateCase && (
            <Link href="/cases/new">
              <Button>
                <Plus className="h-4 w-4" />
                Create Case
              </Button>
            </Link>
          )}
        </div>

        {/* Withdraw confirm dialog */}
        {withdrawConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="mx-4 w-full max-w-sm rounded-xl border border-border bg-white p-6 shadow-xl">
              <h3 className="mb-2 text-lg font-semibold text-foreground">Remove Case?</h3>
              <p className="text-sm text-muted">
                This will mark &ldquo;{withdrawConfirm.title}&rdquo; as disposed and remove it from
                your active cases. This cannot be undone.
              </p>
              {withdrawError && (
                <p className="mt-3 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                  {withdrawError}
                </p>
              )}
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setWithdrawConfirm(null)}>
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  isLoading={isWithdrawing}
                  onClick={async () => {
                    setIsWithdrawing(true);
                    setWithdrawError("");
                    const result = await withdrawCase(withdrawConfirm.id);
                    setIsWithdrawing(false);
                    if (result.error) {
                      setWithdrawError(result.error);
                    } else {
                      setWithdrawConfirm(null);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  Yes, Remove
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : filtered.length === 0 && !search ? (
          <EmptyState
            title="No cases yet"
            description={
              canCreateCase
                ? "Create your first case to get started."
                : "Cases assigned to you will appear here."
            }
            icon={<Briefcase className="h-12 w-12" />}
            action={
              canCreateCase ? (
                <Link href="/cases/new">
                  <Button>
                    <Plus className="h-4 w-4" />
                    Create Case
                  </Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <Table
            columns={columns}
            data={filtered}
            keyExtractor={(item) => item.id}
            emptyMessage="No cases match your search."
          />
        )}
      </div>
    </div>
  );
}
