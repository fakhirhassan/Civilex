"use client";

import { useState } from "react";
import Topbar from "@/components/layout/Topbar";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { useCases } from "@/hooks/useCases";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";
import { CASE_STATUS_LABELS } from "@/lib/constants";
import type { CaseStatus } from "@/lib/constants";
import type { CriminalCaseDetailsExtended } from "@/types/criminal";
import {
  AlertTriangle,
  Briefcase,
  Shield,
  Scale,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";

type FilterTab = "all" | "bail_pending" | "investigation" | "preliminary";

export default function CriminalCasesPage() {
  const { user } = useAuth();
  const { cases, isLoading } = useCases();
  const [filter, setFilter] = useState<FilterTab>("all");

  const isMagistrate = user?.role === "magistrate";
  const isCourtOfficial =
    user && ["admin_court", "magistrate", "trial_judge"].includes(user.role);

  if (!isCourtOfficial) {
    return (
      <div>
        <Topbar title="Criminal Cases" />
        <div className="p-6">
          <EmptyState
            title="Access Restricted"
            description="Only court officials can access the criminal cases dashboard."
            icon={<Shield className="h-12 w-12" />}
          />
        </div>
      </div>
    );
  }

  const criminalCases = cases.filter((c) => c.case_type === "criminal");

  const filteredCases = criminalCases.filter((c) => {
    if (filter === "all") return true;
    if (filter === "bail_pending") {
      return c.criminal_details?.bail_status === "applied";
    }
    if (filter === "investigation") {
      return (
        c.criminal_details &&
        ["pending", "in_progress", "report_submitted"].includes(
          (c.criminal_details as unknown as CriminalCaseDetailsExtended).investigation_status || "pending"
        )
      );
    }
    if (filter === "preliminary") {
      return ["registered", "summon_issued", "preliminary_hearing"].includes(
        c.status
      );
    }
    return true;
  });

  const filters: { id: FilterTab; label: string; count: number }[] = [
    { id: "all", label: "All Criminal", count: criminalCases.length },
    {
      id: "bail_pending",
      label: "Bail Pending",
      count: criminalCases.filter(
        (c) => c.criminal_details?.bail_status === "applied"
      ).length,
    },
    {
      id: "investigation",
      label: "Investigation",
      count: criminalCases.filter(
        (c) =>
          c.criminal_details &&
          ["pending", "in_progress", "report_submitted"].includes(
            (c.criminal_details as unknown as CriminalCaseDetailsExtended).investigation_status || "pending"
          )
      ).length,
    },
    {
      id: "preliminary",
      label: "Preliminary",
      count: criminalCases.filter((c) =>
        ["registered", "summon_issued", "preliminary_hearing"].includes(
          c.status
        )
      ).length,
    },
  ];

  if (isLoading) {
    return (
      <div>
        <Topbar title="Criminal Cases" />
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title="Criminal Cases" />

      <div className="p-6">
        <div className="mb-6">
          <h2 className="text-xl font-bold text-primary">
            <AlertTriangle className="mr-2 inline h-5 w-5" />
            Criminal Cases Dashboard
          </h2>
          <p className="mt-1 text-sm text-muted">
            {isMagistrate
              ? "Manage criminal cases, bail applications, and investigations"
              : "View criminal cases and their proceedings"}
          </p>
        </div>

        {/* Filter tabs */}
        <div className="mb-6 flex gap-1 border-b border-border">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                filter === f.id
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {f.label}{" "}
              <span className="ml-1 rounded-full bg-cream-dark px-2 py-0.5 text-xs">
                {f.count}
              </span>
            </button>
          ))}
        </div>

        {/* Cases list */}
        {filteredCases.length === 0 ? (
          <EmptyState
            title="No criminal cases"
            description={
              filter === "all"
                ? "No criminal cases are currently in the system."
                : `No criminal cases match the "${filters.find((f) => f.id === filter)?.label}" filter.`
            }
            icon={<Scale className="h-12 w-12" />}
          />
        ) : (
          <div className="space-y-3">
            {filteredCases.map((c) => (
              <Link key={c.id} href={`/cases/${c.id}`}>
                <Card
                  padding="md"
                  className="transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-50">
                        <AlertTriangle className="h-5 w-5 text-danger" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-foreground">
                          {c.title}
                        </h3>
                        <p className="text-sm text-muted">
                          {c.case_number}
                          {c.criminal_details?.fir_number &&
                            ` • FIR: ${c.criminal_details.fir_number}`}
                        </p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <Badge
                            variant={
                              c.status === "registered"
                                ? "success"
                                : c.status.includes("pending")
                                  ? "warning"
                                  : "info"
                            }
                          >
                            {CASE_STATUS_LABELS[c.status as CaseStatus] ||
                              c.status.replace(/_/g, " ")}
                          </Badge>
                          {c.criminal_details?.bail_status &&
                            c.criminal_details.bail_status !==
                              "not_applicable" && (
                              <Badge
                                variant={
                                  c.criminal_details.bail_status === "granted"
                                    ? "success"
                                    : c.criminal_details.bail_status ===
                                        "denied"
                                      ? "danger"
                                      : c.criminal_details.bail_status ===
                                          "applied"
                                        ? "warning"
                                        : "default"
                                }
                              >
                                Bail:{" "}
                                {c.criminal_details.bail_status.replace(
                                  /_/g,
                                  " "
                                )}
                              </Badge>
                            )}
                          {c.criminal_details?.offense_section && (
                            <Badge variant="default">
                              {c.criminal_details.offense_section}
                            </Badge>
                          )}
                        </div>
                        <div className="mt-2 flex gap-4 text-xs text-muted">
                          {c.plaintiff?.full_name && (
                            <span>
                              Complainant: {c.plaintiff.full_name}
                            </span>
                          )}
                          {c.defendant?.full_name && (
                            <span>Accused: {c.defendant.full_name}</span>
                          )}
                          {c.filing_date && (
                            <span>Filed: {formatDate(c.filing_date)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="h-5 w-5 text-muted" />
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
