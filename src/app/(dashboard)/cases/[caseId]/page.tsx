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
import UploadDocumentModal from "@/components/features/documents/UploadDocumentModal";
import JudgeDrafts from "@/components/features/cases/JudgeDrafts";
import { createClient } from "@/lib/supabase/client";
import { useCase, useCases } from "@/hooks/useCases";
import { useHearings } from "@/hooks/useHearings";
import { useAuth } from "@/hooks/useAuth";
import { useDocumentRequests } from "@/hooks/useDocumentRequests";
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
  Trash2,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type Tab = "overview" | "documents" | "parties" | "hearings" | "scrutiny" | "bail" | "investigation" | "evidence" | "witnesses" | "judgment" | "timeline" | "my_drafts";

export default function CaseDetailPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = use(params);
  const { user } = useAuth();
  const router = useRouter();
  const { caseData, documents, isLoading, refreshCase } = useCase(caseId);
  const { submitToAdmin, startDrafting, issueSummon, updateCaseStatus, submitChallan, uploadDocument, deleteDocument, getDocumentUrl, withdrawCase } = useCases();
  const { requests: docRequests, createRequest: createDocRequest, fulfillRequest: fulfillDocRequest } = useDocumentRequests(caseId);
  const { hearings, assignJudge } = useHearings(caseId);
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [showAssignJudgeDialog, setShowAssignJudgeDialog] = useState(false);
  const [judgeList, setJudgeList] = useState<{ id: string; full_name: string; email: string }[]>([]);
  const [selectedJudgeId, setSelectedJudgeId] = useState("");
  const [assignJudgeLoading, setAssignJudgeLoading] = useState(false);
  const [assignJudgeError, setAssignJudgeError] = useState("");
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const [showSummonDialog, setShowSummonDialog] = useState(false);
  const [showDocRequestDialog, setShowDocRequestDialog] = useState(false);
  const [docRequestForm, setDocRequestForm] = useState({ requested_from: "", document_type: "written_statement", title: "", description: "" });
  const [docRequestLoading, setDocRequestLoading] = useState(false);
  const [docRequestError, setDocRequestError] = useState("");
  const [summonResult, setSummonResult] = useState<{ defendant_name: string; defendant_email: string | null; email_sent: boolean; notification_sent: boolean; register_url: string } | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showWithdrawDialog, setShowWithdrawDialog] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState("");

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
    ...((isMagistrate || isTrialJudge) ? [{ id: "my_drafts" as Tab, label: "My Drafts" }] : []),
  ];

  const handleAction = async (action: () => Promise<{ error: string | null }>) => {
    setIsActionLoading(true);
    setActionError("");
    const result = await action();
    if (result.error) {
      setActionError(result.error);
    } else {
      await refreshCase();
    }
    setIsActionLoading(false);
  };

  const statusSteps = [
    "draft",
    "pending_lawyer_acceptance",
    "payment_pending",
    "payment_confirmed",
    "drafting",
    "submitted_to_admin",
    "under_scrutiny",
    "returned_for_revision",
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
    "disposed",
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

        {actionError && (
          <div className="mt-2 rounded-lg border border-danger bg-danger-light p-3 text-sm text-danger">
            {actionError}
          </div>
        )}

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
                      caseData.case_type === "civil" ? "primary" : caseData.case_type === "family" ? "warning" : "danger"
                    }
                  >
                    {caseData.case_type === "civil" ? "Civil" : caseData.case_type === "family" ? "Family" : "Criminal"}
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
                onClick={() => setShowSummonDialog(true)}
              >
                <Gavel className="h-4 w-4" />
                Issue Summon
              </Button>
            )}

            {/* Admin Court: Assign Judge */}
            {isCourtOfficial && ["registered", "summon_issued", "preliminary_hearing", "issues_framed"].includes(status) && (
              <Button
                size="sm"
                variant={caseData.trial_judge_id ? "outline" : "warning"}
                onClick={async () => {
                  setAssignJudgeError("");
                  setSelectedJudgeId(caseData.trial_judge_id ?? "");
                  const supabase = createClient();
                  const { data } = await supabase
                    .from("profiles")
                    .select("id, full_name, email")
                    .in("role", ["magistrate", "trial_judge"])
                    .order("full_name");
                  setJudgeList(data ?? []);
                  setShowAssignJudgeDialog(true);
                }}
              >
                <Users className="h-4 w-4" />
                {caseData.trial_judge_id ? "Change Judge" : "Assign Judge"}
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

            {/* Client: Remove / Withdraw case (draft or all-declined) */}
            {user?.role === "client" &&
              user.id === caseData.plaintiff_id &&
              (status === "draft" ||
                (status === "pending_lawyer_acceptance" &&
                  caseData.assignments?.length &&
                  caseData.assignments.every((a) => a.status === "declined"))) && (
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setShowWithdrawDialog(true)}
                >
                  <Trash2 className="h-4 w-4" />
                  Remove Case
                </Button>
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

                {caseData.trial_judge_id && (
                  <Card padding="sm">
                    <h4 className="mb-2 text-sm font-semibold text-primary">
                      <Gavel className="mr-1 inline h-4 w-4" />
                      Assigned Judge
                    </h4>
                    <p className="text-sm text-foreground">
                      {caseData.trial_judge?.full_name ?? "Assigned"}
                    </p>
                    {caseData.trial_judge?.email && (
                      <p className="text-xs text-muted">{caseData.trial_judge.email}</p>
                    )}
                    <Badge variant="success" className="mt-1">Active</Badge>
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
            <div className="space-y-4">
              {/* Pending document requests banner — shown to the client who must fulfil them */}
              {docRequests.filter((r) => r.requested_from === user?.id && r.status === "pending").length > 0 && (
                <div className="rounded-lg border border-warning bg-amber-50 p-4">
                  <h4 className="mb-3 font-medium text-amber-900">Documents Requested by Your Lawyer</h4>
                  <div className="space-y-2">
                    {docRequests
                      .filter((r) => r.requested_from === user?.id && r.status === "pending")
                      .map((req) => (
                        <div key={req.id} className="flex items-center justify-between rounded-lg border border-border bg-white p-3">
                          <div>
                            <p className="text-sm font-medium">{req.title}</p>
                            <p className="text-xs text-muted">
                              {req.document_type.replace(/_/g, " ")}
                              {req.description ? ` — ${req.description}` : ""}
                            </p>
                          </div>
                          <Button size="sm" variant="outline" onClick={() => fulfillDocRequest(req.id)}>
                            Mark Uploaded
                          </Button>
                        </div>
                      ))}
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Upload the file using the &quot;Upload File&quot; button above, then mark the request as fulfilled.
                  </p>
                </div>
              )}

              {/* Lawyer: Request document from client */}
              {isLawyer && (
                <div className="flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const myAssignment = caseData.assignments?.find(
                        (a) => a.lawyer?.id === user?.id && a.status === "accepted"
                      );
                      const clientId =
                        myAssignment?.side === "defendant"
                          ? caseData.defendant_id
                          : caseData.plaintiff_id;
                      setDocRequestForm((f) => ({ ...f, requested_from: clientId ?? "" }));
                      setDocRequestError("");
                      setShowDocRequestDialog(true);
                    }}
                  >
                    <FileText className="h-4 w-4" />
                    Request Document from Client
                  </Button>
                </div>
              )}

              {/* Main document list */}
              <DocumentList
                documents={documents}
                permissions={{
                  role: (user?.role ?? "client") as import("@/components/features/documents/DocumentList").DocumentRole,
                  currentUserId: user?.id ?? "",
                  isAssignedLawyer: isLawyer
                    ? !!(caseData.assignments?.find(
                        (a) => a.lawyer?.id === user?.id && a.status === "accepted"
                      ))
                    : undefined,
                }}
                onUploadClick={() => setShowUploadModal(true)}
                onDelete={deleteDocument}
                onGetUrl={getDocumentUrl}
                onRefresh={refreshCase}
              />

              {/* Document requests tracker — shown to the lawyer who made them */}
              {isLawyer && docRequests.length > 0 && (
                <div className="rounded-lg border border-border p-4">
                  <h4 className="mb-3 font-medium text-primary">Document Requests</h4>
                  <div className="space-y-2">
                    {docRequests.map((req) => (
                      <div
                        key={req.id}
                        className="flex items-center justify-between rounded-lg bg-cream-light p-2 text-sm"
                      >
                        <div>
                          <span className="font-medium">{req.title}</span>
                          <span className="ml-2 text-xs text-muted">
                            → {(req.recipient as { full_name: string } | null)?.full_name ?? "Client"}
                          </span>
                        </div>
                        <Badge
                          variant={
                            req.status === "fulfilled"
                              ? "success"
                              : req.status === "cancelled"
                              ? "danger"
                              : "warning"
                          }
                        >
                          {req.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
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
                          {a.status === "declined" && a.decline_reason && (
                            <p className="mt-1 text-xs text-muted">Reason: {a.decline_reason}</p>
                          )}
                          {a.fee_amount && a.status === "accepted" && (
                            <p className="mt-1 text-xs text-muted">
                              Fee: {formatCurrency(a.fee_amount)}
                              {a.allow_installments ? ` (${a.installment_count} installments)` : ""}
                            </p>
                          )}
                        </div>
                      ))}
                    {/* Defendant: link to hire a lawyer if no active assignment */}
                    {user?.id === caseData.defendant_id &&
                      !caseData.assignments?.some((a) => a.side === "defendant" && a.status !== "declined") && (
                        <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 text-center">
                          <p className="text-xs text-muted mb-2">You have no active lawyer representation.</p>
                          <Link href="/lawyers">
                            <Button size="sm" variant="primary">
                              <Users className="h-4 w-4" />
                              Browse & Hire a Lawyer
                            </Button>
                          </Link>
                        </div>
                      )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-muted">
                      {caseData.defendant_name
                        ? `Defendant: ${caseData.defendant_name} (not yet registered)`
                        : "Not assigned yet"}
                    </p>
                    {caseData.defendant_email && (
                      <p className="text-xs text-muted">Contact: {caseData.defendant_email}</p>
                    )}
                  </div>
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

          {activeTab === "my_drafts" && (isMagistrate || isTrialJudge) && (
            <JudgeDrafts caseId={caseData.id} />
          )}
        </div>
      </div>

      {/* Upload Document Modal */}
      <UploadDocumentModal
        isOpen={showUploadModal}
        onClose={() => setShowUploadModal(false)}
        onUpload={async (file, docType, title, description) => {
          const result = await uploadDocument(caseId, file, docType, title, description);
          if (!result.error) refreshCase();
          return { error: result.error };
        }}
      />

      {/* Document Request Dialog */}
      {showDocRequestDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-primary">Request Document from Client</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Document Type</label>
                <select
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  value={docRequestForm.document_type}
                  onChange={(e) => setDocRequestForm((f) => ({ ...f, document_type: e.target.value }))}
                >
                  <option value="written_statement">Written Statement</option>
                  <option value="affidavit">Affidavit</option>
                  <option value="evidence">Evidence</option>
                  <option value="power_of_attorney">Power of Attorney</option>
                  <option value="vakalatnama">Vakalatnama</option>
                  <option value="application">Application</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Document Title</label>
                <input
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  placeholder="e.g., Written Statement in response to Plaint"
                  value={docRequestForm.title}
                  onChange={(e) => setDocRequestForm((f) => ({ ...f, title: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium">Instructions (Optional)</label>
                <textarea
                  className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Any specific requirements or instructions..."
                  value={docRequestForm.description}
                  onChange={(e) => setDocRequestForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            {docRequestError && (
              <div className="mt-3 rounded-lg border border-danger bg-danger-light p-2 text-sm text-danger">
                {docRequestError}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowDocRequestDialog(false);
                  setDocRequestError("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                isLoading={docRequestLoading}
                disabled={!docRequestForm.title || !docRequestForm.requested_from}
                onClick={async () => {
                  setDocRequestLoading(true);
                  setDocRequestError("");
                  const result = await createDocRequest({
                    requested_from: docRequestForm.requested_from,
                    document_type: docRequestForm.document_type,
                    title: docRequestForm.title,
                    description: docRequestForm.description || undefined,
                  });
                  setDocRequestLoading(false);
                  if (result.error) {
                    setDocRequestError(result.error);
                  } else {
                    setShowDocRequestDialog(false);
                    setDocRequestForm({ requested_from: "", document_type: "written_statement", title: "", description: "" });
                  }
                }}
              >
                Send Request
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Withdraw / Remove Case Dialog */}
      {showWithdrawDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-sm rounded-xl border border-border bg-white p-6 shadow-xl">
            <h3 className="mb-2 text-lg font-semibold text-foreground">Remove Case?</h3>
            <p className="text-sm text-muted">
              This will permanently archive &ldquo;{caseData.title}&rdquo;. It will no longer appear
              in your active cases and cannot be reactivated.
            </p>
            {withdrawError && (
              <div className="mt-3 rounded-lg border border-danger bg-danger/10 px-3 py-2 text-sm text-danger">
                {withdrawError}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => { setShowWithdrawDialog(false); setWithdrawError(""); }}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                isLoading={isWithdrawing}
                onClick={async () => {
                  setIsWithdrawing(true);
                  setWithdrawError("");
                  const result = await withdrawCase(caseId);
                  setIsWithdrawing(false);
                  if (result.error) {
                    setWithdrawError(result.error);
                  } else {
                    router.push("/cases");
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

      {/* Assign Judge Dialog */}
      {showAssignJudgeDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-xl">
            <h3 className="mb-4 text-lg font-semibold text-primary">Assign Judge</h3>
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Select Judge</label>
                <select
                  className="w-full rounded-lg border border-border bg-cream-light px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  value={selectedJudgeId}
                  onChange={(e) => setSelectedJudgeId(e.target.value)}
                >
                  <option value="">— Select a judge —</option>
                  {judgeList.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.full_name} ({j.email})
                    </option>
                  ))}
                </select>
                {judgeList.length === 0 && (
                  <p className="mt-1 text-xs text-muted">No magistrates or trial judges found.</p>
                )}
              </div>
              {caseData.trial_judge_id && (
                <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  This case already has a judge assigned. Selecting a new judge will replace the current assignment.
                </p>
              )}
            </div>
            {assignJudgeError && (
              <div className="mt-3 rounded-lg border border-danger bg-danger-light p-2 text-sm text-danger">
                {assignJudgeError}
              </div>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setShowAssignJudgeDialog(false);
                  setAssignJudgeError("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                isLoading={assignJudgeLoading}
                disabled={!selectedJudgeId}
                onClick={async () => {
                  setAssignJudgeLoading(true);
                  setAssignJudgeError("");
                  const result = await assignJudge(selectedJudgeId);
                  setAssignJudgeLoading(false);
                  if (result.error) {
                    setAssignJudgeError(result.error);
                  } else {
                    setShowAssignJudgeDialog(false);
                    await refreshCase();
                  }
                }}
              >
                Assign Judge
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Summon Confirmation Dialog */}
      {showSummonDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-lg rounded-xl border border-border bg-white p-6 shadow-xl">
            {summonResult ? (
              <>
                <h3 className="mb-4 text-lg font-semibold text-primary">
                  Summon Issued Successfully
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="rounded-lg bg-green-50 border border-green-200 p-3">
                    <p className="font-medium text-green-800">
                      Summon sent to {summonResult.defendant_name}
                    </p>
                    <ul className="mt-2 space-y-1 text-green-700">
                      {summonResult.defendant_email && (
                        <li>Email: {summonResult.email_sent ? "Sent" : "Logged (demo mode)"} to {summonResult.defendant_email}</li>
                      )}
                      <li>In-app notification: {summonResult.notification_sent ? "Sent" : "Pending registration"}</li>
                      <li>Registration link: {summonResult.register_url}</li>
                    </ul>
                  </div>
                  {!summonResult.notification_sent && (
                    <p className="text-muted">
                      The defendant has not registered on the platform yet. They will receive the in-app notification once they create an account and are linked to this case.
                    </p>
                  )}
                </div>
                <div className="mt-6 flex justify-end">
                  <Button
                    variant="primary"
                    onClick={() => {
                      setShowSummonDialog(false);
                      setSummonResult(null);
                      refreshCase();
                    }}
                  >
                    Done
                  </Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="mb-4 text-lg font-semibold text-primary">
                  Issue Court Summon
                </h3>
                <div className="space-y-3 text-sm">
                  <p className="text-muted">
                    You are about to issue an official court summon for the following case:
                  </p>
                  <div className="rounded-lg border border-border bg-cream-light p-3 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted">Case:</span>
                      <span className="font-medium">{caseData.title}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Case Number:</span>
                      <span className="font-medium">{caseData.case_number}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted">Defendant:</span>
                      <span className="font-medium">{caseData.defendant_name || "Not specified"}</span>
                    </div>
                    {caseData.defendant_email && (
                      <div className="flex justify-between">
                        <span className="text-muted">Defendant Email:</span>
                        <span className="font-medium">{caseData.defendant_email}</span>
                      </div>
                    )}
                    {caseData.defendant_phone && (
                      <div className="flex justify-between">
                        <span className="text-muted">Defendant Phone:</span>
                        <span className="font-medium">{caseData.defendant_phone}</span>
                      </div>
                    )}
                  </div>
                  <p className="text-muted">
                    The defendant will be notified via {caseData.defendant_email ? "email and " : ""}in-app notification with instructions to register, hire a lawyer, and submit their response within 30 days.
                  </p>
                </div>
                {actionError && (
                  <div className="mt-3 rounded-lg border border-danger bg-danger-light p-2 text-sm text-danger">
                    {actionError}
                  </div>
                )}
                <div className="mt-6 flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setShowSummonDialog(false);
                      setActionError("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    isLoading={isActionLoading}
                    onClick={async () => {
                      setIsActionLoading(true);
                      setActionError("");
                      const result = await issueSummon(caseId);
                      setIsActionLoading(false);
                      if (result.error) {
                        setActionError(result.error);
                      } else {
                        setSummonResult(result.data?.summon || null);
                      }
                    }}
                  >
                    <Gavel className="h-4 w-4" />
                    Confirm &amp; Issue Summon
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
