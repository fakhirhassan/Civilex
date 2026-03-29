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
import { Plus, Search, Briefcase } from "lucide-react";
import { useCases } from "@/hooks/useCases";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";
import type { CaseWithRelations } from "@/types/case";
import type { CaseStatus } from "@/lib/constants";

export default function CasesPage() {
  const { user } = useAuth();
  const { cases, isLoading } = useCases();
  const [search, setSearch] = useState("");

  const filtered = cases.filter(
    (c) =>
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.case_number.toLowerCase().includes(search.toLowerCase())
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
      render: (item: CaseWithRelations) => (
        <Link href={`/cases/${item.id}`}>
          <Button size="sm" variant="outline">
            View
          </Button>
        </Link>
      ),
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
