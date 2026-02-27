"use client";

import { use, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { useCase } from "@/hooks/useCases";
import { useAuth } from "@/hooks/useAuth";
import { formatDate, formatCurrency } from "@/lib/utils";
import { CASE_STATUS_LABELS } from "@/lib/constants";
import type { CaseStatus } from "@/lib/constants";
import {
  ArrowLeft,
  FileText,
  Calendar,
  Users,
  Clock,
  Shield,
  AlertTriangle,
  Briefcase,
} from "lucide-react";
import Link from "next/link";

type Tab = "overview" | "documents" | "parties" | "timeline";

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = use(params);
  const { user } = useAuth();
  const { caseData, documents, isLoading } = useCase(caseId);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  if (isLoading) {
    return (
      <div>
        <Topbar title="Case Details" />
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div>
        <Topbar title="Case Details" />
        <div className="p-6">
          <EmptyState
            title="Case not found"
            description="This case may have been removed or you don't have access."
            icon={<Briefcase className="h-12 w-12" />}
            action={
              <Link href="/cases">
                <Button variant="outline">
                  <ArrowLeft className="h-4 w-4" />
                  Back to Cases
                </Button>
              </Link>
            }
          />
        </div>
      </div>
    );
  }

  const tabs = [
    { id: "overview" as Tab, label: "Overview" },
    { id: "documents" as Tab, label: `Documents (${documents.length})` },
    { id: "parties" as Tab, label: "Parties" },
    { id: "timeline" as Tab, label: "Timeline" },
  ];

  const statusSteps = [
    "draft",
    "pending_lawyer_acceptance",
    "lawyer_accepted",
    "payment_pending",
    "payment_confirmed",
    "drafting",
    "submitted_to_admin",
    "under_scrutiny",
    "registered",
    "summon_issued",
    "preliminary_hearing",
    "issues_framed",
    "transferred_to_trial",
    "evidence_stage",
    "arguments",
    "reserved_for_judgment",
    "judgment_delivered",
    "closed",
  ];

  const currentStepIndex = statusSteps.indexOf(caseData.status);

  return (
    <div>
      <Topbar title={caseData.case_number} />

      <div className="p-6">
        {/* Back link */}
        <Link
          href="/cases"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cases
        </Link>

        {/* Case header */}
        <Card className="mt-2">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-primary">
                  {caseData.title}
                </h2>
                <StatusBadge status={caseData.status as CaseStatus} />
              </div>
              <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted">
                <span className="flex items-center gap-1">
                  <FileText className="h-4 w-4" />
                  {caseData.case_number}
                </span>
                <span>
                  <Badge
                    variant={
                      caseData.case_type === "civil" ? "primary" : "danger"
                    }
                  >
                    {caseData.case_type === "civil" ? "Civil" : "Criminal"}
                  </Badge>
                </span>
                {caseData.filing_date && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Filed: {formatDate(caseData.filing_date)}
                  </span>
                )}
                {caseData.sensitivity !== "normal" && (
                  <span className="flex items-center gap-1">
                    <Shield className="h-4 w-4 text-warning" />
                    {caseData.sensitivity.replace(/_/g, " ")}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Status progress bar */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs text-muted">
              <span>Filed</span>
              <span>Registered</span>
              <span>Trial</span>
              <span>Judgment</span>
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-cream-dark">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{
                  width: `${Math.max(
                    5,
                    ((currentStepIndex + 1) / statusSteps.length) * 100
                  )}%`,
                }}
              />
            </div>
            <p className="mt-1 text-xs text-muted">
              Current:{" "}
              {CASE_STATUS_LABELS[caseData.status as CaseStatus] ||
                caseData.status}
            </p>
          </div>
        </Card>

        {/* Tabs */}
        <div className="mt-6 flex gap-1 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "border-b-2 border-primary text-primary"
                  : "text-muted hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="mt-6">
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Description */}
              <Card className="lg:col-span-2">
                <h3 className="mb-3 text-lg font-semibold text-primary">
                  Case Description
                </h3>
                <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
                  {caseData.description || "No description provided."}
                </p>
              </Card>

              {/* Quick info */}
              <div className="space-y-4">
                <Card padding="sm">
                  <h4 className="mb-2 text-sm font-semibold text-primary">
                    Plaintiff
                  </h4>
                  <p className="text-sm">
                    {caseData.plaintiff?.full_name || "Not assigned"}
                  </p>
                  {caseData.plaintiff?.email && (
                    <p className="text-xs text-muted">
                      {caseData.plaintiff.email}
                    </p>
                  )}
                </Card>

                <Card padding="sm">
                  <h4 className="mb-2 text-sm font-semibold text-primary">
                    Defendant
                  </h4>
                  <p className="text-sm">
                    {caseData.defendant?.full_name || "Not assigned yet"}
                  </p>
                </Card>

                <Card padding="sm">
                  <h4 className="mb-2 text-sm font-semibold text-primary">
                    Assigned Lawyer
                  </h4>
                  {caseData.assignments && caseData.assignments.length > 0 ? (
                    caseData.assignments.map((a) => (
                      <div key={a.id} className="mb-2 text-sm last:mb-0">
                        <p className="font-medium">
                          {a.lawyer?.full_name || "Unknown"}
                        </p>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={
                              a.status === "accepted"
                                ? "success"
                                : a.status === "declined"
                                  ? "danger"
                                  : "warning"
                            }
                          >
                            {a.status}
                          </Badge>
                          <span className="capitalize text-xs text-muted">
                            ({a.side})
                          </span>
                        </div>
                        {a.fee_amount && (
                          <p className="mt-1 text-xs text-muted">
                            Fee: {formatCurrency(a.fee_amount)}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted">No lawyer assigned</p>
                  )}
                </Card>

                {caseData.next_hearing_date && (
                  <Card padding="sm">
                    <h4 className="mb-2 text-sm font-semibold text-primary">
                      Next Hearing
                    </h4>
                    <p className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-primary" />
                      {formatDate(caseData.next_hearing_date)}
                    </p>
                  </Card>
                )}
              </div>

              {/* Criminal details */}
              {caseData.case_type === "criminal" &&
                caseData.criminal_details && (
                  <Card className="lg:col-span-3">
                    <h3 className="mb-3 text-lg font-semibold text-primary">
                      <AlertTriangle className="mr-2 inline h-5 w-5" />
                      Criminal Case Details
                    </h3>
                    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 md:grid-cols-3">
                      {caseData.criminal_details.fir_number && (
                        <div>
                          <dt className="text-muted">FIR Number</dt>
                          <dd className="font-medium">
                            {caseData.criminal_details.fir_number}
                          </dd>
                        </div>
                      )}
                      {caseData.criminal_details.police_station && (
                        <div>
                          <dt className="text-muted">Police Station</dt>
                          <dd className="font-medium">
                            {caseData.criminal_details.police_station}
                          </dd>
                        </div>
                      )}
                      {caseData.criminal_details.offense_section && (
                        <div>
                          <dt className="text-muted">Section</dt>
                          <dd className="font-medium">
                            {caseData.criminal_details.offense_section}
                          </dd>
                        </div>
                      )}
                      {caseData.criminal_details.bail_status && (
                        <div>
                          <dt className="text-muted">Bail Status</dt>
                          <dd>
                            <Badge
                              variant={
                                caseData.criminal_details.bail_status ===
                                "granted"
                                  ? "success"
                                  : caseData.criminal_details.bail_status ===
                                      "denied"
                                    ? "danger"
                                    : "default"
                              }
                            >
                              {caseData.criminal_details.bail_status.replace(
                                /_/g,
                                " "
                              )}
                            </Badge>
                          </dd>
                        </div>
                      )}
                      {caseData.criminal_details.io_name && (
                        <div>
                          <dt className="text-muted">
                            Investigation Officer
                          </dt>
                          <dd className="font-medium">
                            {caseData.criminal_details.io_name}
                          </dd>
                        </div>
                      )}
                      {caseData.criminal_details.offense_description && (
                        <div className="sm:col-span-2 md:col-span-3">
                          <dt className="text-muted">Offense Description</dt>
                          <dd>
                            {caseData.criminal_details.offense_description}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </Card>
                )}
            </div>
          )}

          {activeTab === "documents" && (
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary">
                  Documents
                </h3>
                {(user?.role === "client" || user?.role === "lawyer") && (
                  <Button variant="outline" size="sm">
                    <FileText className="h-4 w-4" />
                    Upload Document
                  </Button>
                )}
              </div>

              {documents.length === 0 ? (
                <EmptyState
                  title="No documents"
                  description="Documents uploaded for this case will appear here."
                  icon={<FileText className="h-12 w-12" />}
                />
              ) : (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm font-medium">{doc.title}</p>
                          <p className="text-xs text-muted">
                            {doc.document_type.replace(/_/g, " ")} •{" "}
                            {doc.file_size
                              ? `${(doc.file_size / 1024 / 1024).toFixed(1)} MB`
                              : ""}{" "}
                            • {formatDate(doc.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {doc.is_signed && (
                          <Badge variant="success">Signed</Badge>
                        )}
                        <Button variant="ghost" size="sm">
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          )}

          {activeTab === "parties" && (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <Card>
                <h3 className="mb-4 text-lg font-semibold text-primary">
                  <Users className="mr-2 inline h-5 w-5" />
                  Plaintiff Side
                </h3>
                {caseData.plaintiff ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium">
                        {caseData.plaintiff.full_name}
                      </p>
                      <p className="text-xs text-muted">
                        {caseData.plaintiff.email}
                      </p>
                      <Badge variant="info" className="mt-1">
                        Plaintiff
                      </Badge>
                    </div>
                    {caseData.assignments
                      ?.filter((a) => a.side === "plaintiff")
                      .map((a) => (
                        <div
                          key={a.id}
                          className="rounded-lg border border-border p-3"
                        >
                          <p className="text-sm font-medium">
                            {a.lawyer?.full_name || "Unknown Lawyer"}
                          </p>
                          <Badge
                            variant={
                              a.status === "accepted"
                                ? "success"
                                : a.status === "declined"
                                  ? "danger"
                                  : "warning"
                            }
                            className="mt-1"
                          >
                            Lawyer - {a.status}
                          </Badge>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">Not assigned</p>
                )}
              </Card>

              <Card>
                <h3 className="mb-4 text-lg font-semibold text-primary">
                  <Users className="mr-2 inline h-5 w-5" />
                  Defendant Side
                </h3>
                {caseData.defendant ? (
                  <div className="space-y-3">
                    <div className="rounded-lg border border-border p-3">
                      <p className="text-sm font-medium">
                        {caseData.defendant.full_name}
                      </p>
                      <p className="text-xs text-muted">
                        {caseData.defendant.email}
                      </p>
                      <Badge variant="warning" className="mt-1">
                        Defendant
                      </Badge>
                    </div>
                    {caseData.assignments
                      ?.filter((a) => a.side === "defendant")
                      .map((a) => (
                        <div
                          key={a.id}
                          className="rounded-lg border border-border p-3"
                        >
                          <p className="text-sm font-medium">
                            {a.lawyer?.full_name || "Unknown Lawyer"}
                          </p>
                          <Badge
                            variant={
                              a.status === "accepted"
                                ? "success"
                                : a.status === "declined"
                                  ? "danger"
                                  : "warning"
                            }
                            className="mt-1"
                          >
                            Lawyer - {a.status}
                          </Badge>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted">Not assigned yet</p>
                )}
              </Card>
            </div>
          )}

          {activeTab === "timeline" && (
            <Card>
              <h3 className="mb-4 text-lg font-semibold text-primary">
                Case Timeline
              </h3>
              <div className="space-y-4">
                {/* Status stepper */}
                {statusSteps
                  .slice(0, Math.min(currentStepIndex + 3, statusSteps.length))
                  .map((s, i) => (
                    <div key={s} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-medium ${
                            i <= currentStepIndex
                              ? "bg-primary text-white"
                              : "bg-cream-dark text-muted"
                          }`}
                        >
                          {i + 1}
                        </div>
                        {i <
                          Math.min(
                            currentStepIndex + 2,
                            statusSteps.length - 1
                          ) && (
                          <div
                            className={`h-8 w-0.5 ${
                              i < currentStepIndex
                                ? "bg-primary"
                                : "bg-cream-dark"
                            }`}
                          />
                        )}
                      </div>
                      <div className="pb-4">
                        <p
                          className={`text-sm font-medium ${
                            i <= currentStepIndex
                              ? "text-primary"
                              : "text-muted"
                          }`}
                        >
                          {CASE_STATUS_LABELS[s as CaseStatus] || s}
                        </p>
                        {i === currentStepIndex && (
                          <Badge variant="primary" className="mt-1">
                            Current
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
