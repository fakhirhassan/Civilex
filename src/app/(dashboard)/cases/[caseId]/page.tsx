"use client";

import { use, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import CaseTimeline from "@/components/features/cases/CaseTimeline";
import ScrutinyChecklistComponent from "@/components/features/scrutiny/ScrutinyChecklist";
import BailApplicationForm from "@/components/features/criminal/BailApplicationForm";
import InvestigationPanel from "@/components/features/criminal/InvestigationPanel";
import EvidencePanel from "@/components/features/trial/EvidencePanel";
import WitnessPanel from "@/components/features/trial/WitnessPanel";
import JudgmentPanel from "@/components/features/trial/JudgmentPanel";
import DocumentList from "@/components/features/documents/DocumentList";
import { useCase, useCases } from "@/hooks/useCases";
import { useHearings } from "@/hooks/useHearings";
import { useAuth } from "@/hooks/useAuth";
import type { CriminalCaseDetailsExtended } from "@/types/criminal";
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
  Send,
  Gavel,
  ClipboardCheck,
  ArrowRightCircle,
  Scale,
  Search,
  FileCheck2,
  FileBox,
  Users2,
  MessageSquareText,
} from "lucide-react";
import Link from "next/link";

type Tab = "overview" | "documents" | "parties" | "hearings" | "scrutiny" | "bail" | "investigation" | "evidence" | "witnesses" | "judgment" | "timeline";

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = use(params);
  const { user } = useAuth();
  const { caseData, documents, isLoading, refreshCase } = useCase(caseId);
  const { submitToAdmin, startDrafting, issueSummon, updateCaseStatus, submitChallan } = useCases();
  const { hearings } = useHearings(caseId);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [isActionLoading, setIsActionLoading] = useState(false);

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

  const isLawyer = user?.role === "lawyer";
  const isCourtOfficial = user && ["admin_court", "magistrate", "trial_judge"].includes(user.role);
  const status = caseData.status;

  // Show scrutiny tab for admin court or when case is in scrutiny-related statuses
  const showScrutinyTab = isCourtOfficial || [
    "submitted_to_admin", "under_scrutiny", "returned_for_revision", "registered",
    "summon_issued", "preliminary_hearing", "issues_framed", "transferred_to_trial",
  ].includes(status);

  // Show hearings tab when case is past registration
  const showHearingsTab = [
    "registered", "summon_issued", "preliminary_hearing", "issues_framed",
    "transferred_to_trial", "evidence_stage", "arguments",
    "reserved_for_judgment", "judgment_delivered", "closed",
  ].includes(status);

  // Show bail and investigation tabs for criminal cases
  const isCriminalCase = caseData.case_type === "criminal";
  const isMagistrate = user?.role === "magistrate";
  const isTrialJudge = user?.role === "trial_judge";
  const isStenographer = user?.role === "stenographer";
  const criminalDetails = caseData.criminal_details as CriminalCaseDetailsExtended | null;

  // Show trial court tabs (evidence, witnesses, judgment) when case is in trial phase
  const showTrialTabs = [
    "transferred_to_trial", "evidence_stage", "arguments",
    "reserved_for_judgment", "judgment_delivered", "closed",
  ].includes(status);

  const tabs: { id: Tab; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "documents", label: `Documents (${documents.length})` },
    { id: "parties", label: "Parties" },
    ...(isCriminalCase ? [{ id: "bail" as Tab, label: "Bail" }] : []),
    ...(isCriminalCase ? [{ id: "investigation" as Tab, label: "Investigation" }] : []),
    ...(showHearingsTab ? [{ id: "hearings" as Tab, label: `Hearings (${hearings.length})` }] : []),
    ...(showScrutinyTab ? [{ id: "scrutiny" as Tab, label: "Scrutiny" }] : []),
    ...(showTrialTabs ? [{ id: "evidence" as Tab, label: "Evidence" }] : []),
    ...(showTrialTabs ? [{ id: "witnesses" as Tab, label: "Witnesses" }] : []),
    ...(showTrialTabs ? [{ id: "judgment" as Tab, label: "Judgment" }] : []),
    { id: "timeline", label: "Timeline" },
  ];

  const handleAction = async (action: () => Promise<{ error: string | null }>) => {
    setIsActionLoading(true);
    const result = await action();
    if (!result.error) await refreshCase();
    setIsActionLoading(false);
  };

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

          {/* Phase 5 Action Buttons */}
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
            {/* Lawyer: Start Drafting */}
            {isLawyer && status === "payment_confirmed" && (
              <Button
                size="sm"
                variant="primary"
                isLoading={isActionLoading}
                onClick={() => handleAction(() => startDrafting(caseId))}
              >
                <FileText className="h-4 w-4" />
                Start Drafting
              </Button>
            )}

            {/* Lawyer: Submit to Admin Court */}
            {isLawyer && ["drafting", "returned_for_revision"].includes(status) && (
              <Button
                size="sm"
                variant="primary"
                isLoading={isActionLoading}
                onClick={() => handleAction(() => submitToAdmin(caseId))}
              >
                <Send className="h-4 w-4" />
                Submit to Admin Court
              </Button>
            )}

            {/* Admin Court: Begin Scrutiny */}
            {isCourtOfficial && status === "submitted_to_admin" && (
              <Button
                size="sm"
                variant="primary"
                onClick={() => setActiveTab("scrutiny")}
              >
                <ClipboardCheck className="h-4 w-4" />
                Begin Scrutiny
              </Button>
            )}

            {/* Admin Court: Issue Summon */}
            {isCourtOfficial && status === "registered" && (
              <Button
                size="sm"
                variant="primary"
                isLoading={isActionLoading}
                onClick={() =>
                  handleAction(() =>
                    issueSummon(caseId, caseData.defendant?.full_name || "Defendant")
                  )
                }
              >
                <Gavel className="h-4 w-4" />
                Issue Summon
              </Button>
            )}

            {/* Admin Court: Advance through statuses */}
            {isCourtOfficial && status === "summon_issued" && (
              <Button
                size="sm"
                variant="primary"
                isLoading={isActionLoading}
                onClick={() =>
                  handleAction(() => updateCaseStatus(caseId, "preliminary_hearing", status))
                }
              >
                <ArrowRightCircle className="h-4 w-4" />
                Start Preliminary Hearing
              </Button>
            )}

            {isCourtOfficial && status === "preliminary_hearing" && (
              <Button
                size="sm"
                variant="primary"
                isLoading={isActionLoading}
                onClick={() =>
                  handleAction(() => updateCaseStatus(caseId, "issues_framed", status))
                }
              >
                <ArrowRightCircle className="h-4 w-4" />
                Frame Issues
              </Button>
            )}

            {isCourtOfficial && status === "issues_framed" && (
              <Button
                size="sm"
                variant="primary"
                isLoading={isActionLoading}
                onClick={() =>
                  handleAction(() => updateCaseStatus(caseId, "transferred_to_trial", status))
                }
              >
                <ArrowRightCircle className="h-4 w-4" />
                Transfer to Trial Court
              </Button>
            )}

            {/* Criminal: Submit Challan */}
            {isCriminalCase && isCourtOfficial && criminalDetails && !criminalDetails.challan_submitted && (
              <Button
                size="sm"
                variant="warning"
                isLoading={isActionLoading}
                onClick={() => handleAction(() => submitChallan(caseId))}
              >
                <FileCheck2 className="h-4 w-4" />
                Submit Challan
              </Button>
            )}

            {/* Criminal: View Bail Applications */}
            {isCriminalCase && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab("bail")}
              >
                <Scale className="h-4 w-4" />
                Bail
              </Button>
            )}

            {/* Criminal: View Investigation */}
            {isCriminalCase && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setActiveTab("investigation")}
              >
                <Search className="h-4 w-4" />
                Investigation
              </Button>
            )}

            {/* Trial Court: Start Evidence Stage */}
            {isCourtOfficial && status === "transferred_to_trial" && (
              <Button
                size="sm"
                variant="primary"
                isLoading={isActionLoading}
                onClick={() =>
                  handleAction(() => updateCaseStatus(caseId, "evidence_stage", status))
                }
              >
                <FileBox className="h-4 w-4" />
                Start Evidence Stage
              </Button>
            )}

            {/* Trial Court: Move to Arguments */}
            {isCourtOfficial && status === "evidence_stage" && (
              <Button
                size="sm"
                variant="primary"
                isLoading={isActionLoading}
                onClick={() =>
                  handleAction(() => updateCaseStatus(caseId, "arguments", status))
                }
              >
                <MessageSquareText className="h-4 w-4" />
                Move to Arguments
              </Button>
            )}

            {/* Trial Court: Reserve for Judgment */}
            {isCourtOfficial && status === "arguments" && (
              <Button
                size="sm"
                variant="primary"
                isLoading={isActionLoading}
                onClick={() =>
                  handleAction(() => updateCaseStatus(caseId, "reserved_for_judgment", status))
                }
              >
                <Gavel className="h-4 w-4" />
                Reserve for Judgment
              </Button>
            )}

            {/* Trial Court: Close Case */}
            {isCourtOfficial && status === "judgment_delivered" && (
              <Button
                size="sm"
                variant="outline"
                isLoading={isActionLoading}
                onClick={() =>
                  handleAction(() => updateCaseStatus(caseId, "closed", status))
                }
              >
                Close Case
              </Button>
            )}

            {/* Trial Tabs shortcuts */}
            {showTrialTabs && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab("evidence")}
                >
                  <FileBox className="h-4 w-4" />
                  Evidence
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setActiveTab("witnesses")}
                >
                  <Users2 className="h-4 w-4" />
                  Witnesses
                </Button>
              </>
            )}

            {/* View Hearings link */}
            {showHearingsTab && (
              <Link href={`/cases/${caseId}/hearings`}>
                <Button size="sm" variant="outline">
                  <Gavel className="h-4 w-4" />
                  View Hearings
                </Button>
              </Link>
            )}
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
              {isCriminalCase && criminalDetails && (
                  <Card className="lg:col-span-3">
                    <h3 className="mb-3 text-lg font-semibold text-primary">
                      <AlertTriangle className="mr-2 inline h-5 w-5" />
                      Criminal Case Details
                    </h3>
                    <dl className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 md:grid-cols-3">
                      {criminalDetails.fir_number && (
                        <div>
                          <dt className="text-muted">FIR Number</dt>
                          <dd className="font-medium">
                            {criminalDetails.fir_number}
                          </dd>
                        </div>
                      )}
                      {criminalDetails.police_station && (
                        <div>
                          <dt className="text-muted">Police Station</dt>
                          <dd className="font-medium">
                            {criminalDetails.police_station}
                          </dd>
                        </div>
                      )}
                      {criminalDetails.offense_section && (
                        <div>
                          <dt className="text-muted">Section</dt>
                          <dd className="font-medium">
                            {criminalDetails.offense_section}
                          </dd>
                        </div>
                      )}
                      {criminalDetails.bail_status && (
                        <div>
                          <dt className="text-muted">Bail Status</dt>
                          <dd>
                            <Badge
                              variant={
                                criminalDetails.bail_status === "granted"
                                  ? "success"
                                  : criminalDetails.bail_status === "denied"
                                    ? "danger"
                                    : criminalDetails.bail_status === "applied"
                                      ? "warning"
                                      : "default"
                              }
                            >
                              {criminalDetails.bail_status.replace(/_/g, " ")}
                            </Badge>
                          </dd>
                        </div>
                      )}
                      {criminalDetails.investigation_status && (
                        <div>
                          <dt className="text-muted">Investigation Status</dt>
                          <dd>
                            <Badge
                              variant={
                                criminalDetails.investigation_status === "completed"
                                  ? "success"
                                  : criminalDetails.investigation_status === "in_progress"
                                    ? "warning"
                                    : "info"
                              }
                            >
                              {criminalDetails.investigation_status.replace(/_/g, " ")}
                            </Badge>
                          </dd>
                        </div>
                      )}
                      {criminalDetails.challan_submitted && (
                        <div>
                          <dt className="text-muted">Challan</dt>
                          <dd>
                            <Badge variant="success">Submitted</Badge>
                            {criminalDetails.challan_date && (
                              <span className="ml-2 text-xs text-muted">
                                {formatDate(criminalDetails.challan_date)}
                              </span>
                            )}
                          </dd>
                        </div>
                      )}
                      {criminalDetails.io_name && (
                        <div>
                          <dt className="text-muted">
                            Investigation Officer
                          </dt>
                          <dd className="font-medium">
                            {criminalDetails.io_name}
                            {criminalDetails.io_contact && (
                              <span className="ml-1 text-xs text-muted">
                                ({criminalDetails.io_contact})
                              </span>
                            )}
                          </dd>
                        </div>
                      )}
                      {criminalDetails.offense_description && (
                        <div className="sm:col-span-2 md:col-span-3">
                          <dt className="text-muted">Offense Description</dt>
                          <dd>
                            {criminalDetails.offense_description}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </Card>
                )}
            </div>
          )}

          {activeTab === "documents" && (
            <DocumentList
              documents={documents}
              canSign={isLawyer || !!isCourtOfficial}
              canUpload={user?.role === "client" || user?.role === "lawyer"}
              onRefresh={refreshCase}
            />
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

          {activeTab === "hearings" && (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary">
                  Hearings ({hearings.length})
                </h3>
                <Link href={`/cases/${caseId}/hearings`}>
                  <Button size="sm" variant="outline">
                    <Gavel className="h-4 w-4" />
                    Manage Hearings
                  </Button>
                </Link>
              </div>
              {hearings.length === 0 ? (
                <EmptyState
                  title="No hearings scheduled"
                  description="Hearings will appear here once scheduled."
                  icon={<Calendar className="h-12 w-12" />}
                />
              ) : (
                <div className="space-y-3">
                  {hearings.map((h) => (
                    <Card key={h.id} padding="sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            Hearing #{h.hearing_number} — {h.hearing_type.replace(/_/g, " ")}
                          </p>
                          <p className="text-sm text-muted">
                            {formatDate(h.scheduled_date)} • {h.status}
                          </p>
                        </div>
                        <Link href={`/cases/${caseId}/hearings/${h.id}`}>
                          <Button size="sm" variant="ghost">View</Button>
                        </Link>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === "bail" && isCriminalCase && (
            <BailApplicationForm
              caseId={caseData.id}
              isCourtOfficial={!!isCourtOfficial}
              canApply={isLawyer || user?.role === "client"}
            />
          )}

          {activeTab === "investigation" && isCriminalCase && (
            <InvestigationPanel
              caseId={caseData.id}
              investigationStatus={criminalDetails?.investigation_status || "pending"}
              ioName={criminalDetails?.io_name}
              isCourtOfficial={!!isCourtOfficial}
              canSubmitReport={!!isCourtOfficial || isLawyer}
            />
          )}

          {activeTab === "evidence" && showTrialTabs && (
            <EvidencePanel
              caseId={caseData.id}
              isJudge={isTrialJudge || user?.role === "admin_court"}
              isLawyer={isLawyer}
            />
          )}

          {activeTab === "witnesses" && showTrialTabs && (
            <WitnessPanel
              caseId={caseData.id}
              isJudge={isTrialJudge || user?.role === "admin_court"}
              isLawyer={isLawyer}
              isStenographer={isStenographer}
            />
          )}

          {activeTab === "judgment" && showTrialTabs && (
            <JudgmentPanel
              caseId={caseData.id}
              isJudge={isTrialJudge || user?.role === "admin_court"}
              caseStatus={status}
              onRefresh={refreshCase}
            />
          )}

          {activeTab === "scrutiny" && (
            <ScrutinyChecklistComponent
              caseId={caseData.id}
              caseTitle={caseData.title}
              isReadOnly={!isCourtOfficial || !["submitted_to_admin", "under_scrutiny"].includes(status)}
              onComplete={refreshCase}
            />
          )}

          {activeTab === "timeline" && (
            <CaseTimeline
              caseId={caseData.id}
              currentStatus={caseData.status}
            />
          )}
        </div>
      </div>
    </div>
  );
}
