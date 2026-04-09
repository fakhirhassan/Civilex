"use client";

import Topbar from "@/components/layout/Topbar";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Skeleton, { SkeletonCard, SkeletonList } from "@/components/ui/Skeleton";
import LawyerCaseReview from "@/components/features/cases/LawyerCaseReview";
import { useAuth } from "@/hooks/useAuth";
import { useCases } from "@/hooks/useCases";
import { usePayments } from "@/hooks/usePayments";
import { useNotifications } from "@/hooks/useNotifications";
import { ROLE_LABELS, CASE_STATUS_LABELS } from "@/lib/constants";
import type { CaseStatus } from "@/lib/constants";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Briefcase,
  CreditCard,
  Calendar,
  Bell,
  LogOut,
  Clock,
  CheckCircle,
  AlertCircle,
  Scale,
  ClipboardCheck,
  Gavel,
  FileText,
  Users,
  Bot,
  Shield,
} from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const { cases, isLoading: casesLoading, fetchCases, acceptCase, declineCase } = useCases();
  const { payments, isLoading: paymentsLoading } = usePayments();
  const { notifications, unreadCount } = useNotifications();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
  };

  const isLoading = casesLoading || paymentsLoading;
  const role = user?.role;

  // Compute stats
  // For lawyers: "active" means they have an accepted assignment (excludes pending requests)
  // For others: exclude terminal/pre-filing statuses
  const activeCases =
    role === "lawyer"
      ? cases.filter((c) =>
          c.assignments?.some(
            (a) => a.lawyer_id === user?.id && a.status === "accepted"
          )
        ).length
      : cases.filter(
          (c) =>
            !["closed", "disposed", "draft", "pending_lawyer_acceptance"].includes(
              c.status
            )
        ).length;
  const pendingPayments = payments.filter((p) => p.status === "pending").length;
  const upcomingHearings = cases.filter((c) => c.next_hearing_date).length;
  const closedCases = cases.filter((c) =>
    ["closed", "disposed", "judgment_delivered"].includes(c.status)
  ).length;

  // Lawyer-specific: pending case requests
  const pendingRequests =
    role === "lawyer"
      ? cases.filter((c) =>
          c.assignments?.some(
            (a) => a.lawyer_id === user?.id && a.status === "pending"
          )
        )
      : [];

  // Client-specific: cases awaiting payment
  const awaitingPayment =
    role === "client"
      ? cases.filter((c) => c.status === "payment_pending")
      : [];

  // Admin/Magistrate: cases pending scrutiny
  const pendingScrutiny =
    role === "admin_court" || role === "magistrate"
      ? cases.filter((c) =>
          ["submitted_to_admin", "under_scrutiny"].includes(c.status)
        )
      : [];

  // Trial judge: active trial cases
  const trialCases =
    role === "trial_judge"
      ? cases.filter((c) =>
          [
            "transferred_to_trial",
            "evidence_stage",
            "arguments",
            "reserved_for_judgment",
          ].includes(c.status)
        )
      : [];

  // Role-specific stats
  const getStats = () => {
    const base = [
      {
        label: "Active Cases",
        value: activeCases.toString(),
        icon: Briefcase,
        color: "text-primary",
        bg: "bg-primary/10",
        href: "/cases",
      },
    ];

    if (role === "client" || role === "lawyer") {
      base.push({
        label: "Pending Payments",
        value: pendingPayments.toString(),
        icon: CreditCard,
        color: "text-amber-600",
        bg: "bg-amber-50",
        href: "/payments",
      });
    }

    base.push({
      label: "Upcoming Hearings",
      value: upcomingHearings.toString(),
      icon: Calendar,
      color: "text-info",
      bg: "bg-blue-50",
      href: "/cases",
    });

    if (role === "lawyer") {
      base.push({
        label: "Case Requests",
        value: pendingRequests.length.toString(),
        icon: AlertCircle,
        color: "text-danger",
        bg: "bg-red-50",
        href: "/cases",
      });
    } else if (role === "admin_court" || role === "magistrate") {
      base.push({
        label: "Pending Scrutiny",
        value: pendingScrutiny.length.toString(),
        icon: ClipboardCheck,
        color: "text-amber-600",
        bg: "bg-amber-50",
        href: "/cases/scrutiny",
      });
    } else if (role === "trial_judge") {
      base.push({
        label: "Trial Cases",
        value: trialCases.length.toString(),
        icon: Gavel,
        color: "text-primary",
        bg: "bg-primary/10",
        href: "/cases",
      });
    } else {
      base.push({
        label: "Notifications",
        value: unreadCount.toString(),
        icon: Bell,
        color: "text-danger",
        bg: "bg-red-50",
        href: "/notifications",
      });
    }

    return base;
  };

  const stats = getStats();

  // Role-specific greetings
  const getRoleGreeting = () => {
    switch (role) {
      case "client":
        return "Track your cases and manage legal proceedings.";
      case "lawyer":
        return "Review case requests and manage your active matters.";
      case "admin_court":
        return "Review submitted cases and manage court administration.";
      case "magistrate":
        return "Oversee criminal matters and scrutiny processes.";
      case "trial_judge":
        return "Manage trial proceedings, evidence, and judgments.";
      case "stenographer":
        return "Record proceedings and manage court documentation.";
      default:
        return "Here's an overview of your legal activities.";
    }
  };

  return (
    <div>
      <Topbar title="Dashboard" />

      <div className="p-6">
        {/* Welcome message */}
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-primary">
              Welcome back, {user?.full_name || "User"}!
            </h2>
            <p className="mt-1 text-sm text-muted">{getRoleGreeting()}</p>
            <Badge variant="primary" className="mt-2">
              {user?.role ? ROLE_LABELS[user.role] : "User"}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Stats grid with skeletons */}
        {isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Link key={stat.label} href={stat.href}>
                <Card padding="md" className="transition-shadow hover:shadow-md">
                  <div className="flex items-center gap-4">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-lg ${stat.bg}`}
                    >
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="text-2xl font-bold text-foreground">
                        {stat.value}
                      </p>
                      <p className="text-sm text-muted">{stat.label}</p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Role-specific sections */}
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main column (2/3) */}
          <div className="space-y-6 lg:col-span-2">
            {/* Lawyer: Pending Case Requests */}
            {role === "lawyer" && pendingRequests.length > 0 && (
              <LawyerCaseReview
                pendingCases={pendingRequests}
                lawyerId={user!.id}
                onActionComplete={fetchCases}
                acceptCase={acceptCase}
                declineCase={declineCase}
              />
            )}

            {/* Defendant: Summoned cases needing lawyer */}
            {role === "client" && cases.some((c) => c.defendant_id === user?.id && !c.assignments?.some((a) => a.side === "defendant" && a.status !== "declined")) && (
              <Card>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-primary">
                  <Scale className="h-5 w-5" />
                  Court Summon — Action Required
                </h3>
                <div className="space-y-3">
                  {cases
                    .filter((c) => c.defendant_id === user?.id && !c.assignments?.some((a) => a.side === "defendant" && a.status !== "declined"))
                    .map((c) => (
                      <div key={c.id} className="rounded-lg border border-warning bg-amber-50 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">{c.title}</p>
                          <p className="text-xs text-muted">{c.case_number} • You have been summoned as defendant</p>
                        </div>
                        <div className="flex gap-2 shrink-0">
                          <Link href={`/cases/${c.id}`}>
                            <Button size="sm" variant="outline">View Case</Button>
                          </Link>
                          <Link href="/lawyers">
                            <Button size="sm" variant="primary">
                              <Users className="h-4 w-4" />
                              Hire Lawyer
                            </Button>
                          </Link>
                        </div>
                      </div>
                    ))}
                </div>
              </Card>
            )}

            {/* Defendant: Pending lawyer fee payments */}
            {role === "client" && payments.some((p) => p.payer_id === user?.id && p.status === "pending") && (
              <Card>
                <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-primary">
                  <CreditCard className="h-5 w-5" />
                  Lawyer Fee Awaiting Payment
                </h3>
                <div className="space-y-3">
                  {payments
                    .filter((p) => p.payer_id === user?.id && p.status === "pending")
                    .map((p) => (
                      <div key={p.id} className="rounded-lg border border-border p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="font-medium">{p.case?.title || "—"}</p>
                          <p className="text-xs text-muted">{p.case?.case_number} • {(p.receiver as { full_name: string } | null)?.full_name || "Lawyer"}</p>
                          <p className="mt-1 text-sm font-medium text-primary">{formatCurrency(Number(p.amount))}</p>
                        </div>
                        <Link href="/payments">
                          <Button size="sm" variant="primary">
                            <CreditCard className="h-4 w-4" />
                            Pay Now
                          </Button>
                        </Link>
                      </div>
                    ))}
                </div>
              </Card>
            )}

            {/* Client: Awaiting Payment */}
            {role === "client" && awaitingPayment.length > 0 && (
              <Card>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-primary">
                  <Clock className="h-5 w-5" />
                  Cases Awaiting Payment
                </h3>
                <div className="space-y-3">
                  {awaitingPayment.map((c) => {
                    const assignment = c.assignments?.find(
                      (a) => a.status === "accepted"
                    );
                    return (
                      <div
                        key={c.id}
                        className="flex flex-col gap-2 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                      >
                        <div>
                          <p className="font-medium text-foreground">{c.title}</p>
                          <p className="text-xs text-muted">
                            {c.case_number} • Lawyer:{" "}
                            {assignment?.lawyer?.full_name || "—"}
                          </p>
                          {assignment?.fee_amount && (
                            <p className="mt-1 text-sm font-medium text-primary">
                              Fee: {formatCurrency(assignment.fee_amount)}
                              {assignment.allow_installments &&
                                assignment.installment_count > 1 && (
                                  <span className="ml-1 text-xs text-muted">
                                    ({assignment.installment_count} installments)
                                  </span>
                                )}
                            </p>
                          )}
                        </div>
                        <Link href="/payments">
                          <Button size="sm">
                            <CreditCard className="h-4 w-4" />
                            Pay Now
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}

            {/* Admin/Magistrate: Pending Scrutiny Queue */}
            {(role === "admin_court" || role === "magistrate") &&
              pendingScrutiny.length > 0 && (
                <Card>
                  <div className="mb-4 flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                      <ClipboardCheck className="h-5 w-5" />
                      Pending Scrutiny
                    </h3>
                    <Link href="/cases/scrutiny">
                      <Button variant="ghost" size="sm">
                        View All
                      </Button>
                    </Link>
                  </div>
                  <div className="space-y-3">
                    {pendingScrutiny.slice(0, 5).map((c) => (
                      <Link
                        key={c.id}
                        href={`/cases/${c.id}`}
                        className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-cream-dark/50"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-50">
                            <FileText className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">
                              {c.title}
                            </p>
                            <p className="text-xs text-muted">
                              {c.case_number} • {c.case_type}
                            </p>
                          </div>
                        </div>
                        <Badge variant="warning">
                          {CASE_STATUS_LABELS[c.status as CaseStatus] || c.status.replace(/_/g, " ")}
                        </Badge>
                      </Link>
                    ))}
                  </div>
                </Card>
              )}

            {/* Trial Judge: Active Trial Cases */}
            {role === "trial_judge" && trialCases.length > 0 && (
              <Card>
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-lg font-semibold text-primary">
                    <Scale className="h-5 w-5" />
                    Active Trial Cases
                  </h3>
                  <Link href="/cases">
                    <Button variant="ghost" size="sm">
                      View All
                    </Button>
                  </Link>
                </div>
                <div className="space-y-3">
                  {trialCases.slice(0, 5).map((c) => (
                    <Link
                      key={c.id}
                      href={`/cases/${c.id}`}
                      className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-cream-dark/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          <Gavel className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {c.title}
                          </p>
                          <p className="text-xs text-muted">
                            {c.case_number}
                            {c.next_hearing_date &&
                              ` • Next: ${formatDate(c.next_hearing_date)}`}
                          </p>
                        </div>
                      </div>
                      <Badge variant="primary">
                        {CASE_STATUS_LABELS[c.status as CaseStatus] || c.status.replace(/_/g, " ")}
                      </Badge>
                    </Link>
                  ))}
                </div>
              </Card>
            )}

            {/* Recent cases (all roles) */}
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-primary">
                  Recent Cases
                </h3>
                <Link href="/cases">
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
              {casesLoading ? (
                <SkeletonList rows={4} />
              ) : cases.length === 0 ? (
                <p className="text-sm text-muted">
                  {role === "client"
                    ? "No cases yet. Create your first case to get started."
                    : "Cases assigned to you will appear here."}
                </p>
              ) : (
                <div className="space-y-3">
                  {cases.slice(0, 5).map((c) => (
                    <Link
                      key={c.id}
                      href={`/cases/${c.id}`}
                      className="flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-cream-dark/50"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                          {c.status === "payment_confirmed" ||
                          c.status === "registered" ? (
                            <CheckCircle className="h-5 w-5 text-success" />
                          ) : c.status === "payment_pending" ? (
                            <Clock className="h-5 w-5 text-warning" />
                          ) : c.status === "judgment_delivered" ? (
                            <Gavel className="h-5 w-5 text-success" />
                          ) : (
                            <Briefcase className="h-5 w-5 text-primary" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">
                            {c.title}
                          </p>
                          <p className="text-xs text-muted">{c.case_number}</p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          c.status === "draft"
                            ? "default"
                            : c.status === "judgment_delivered"
                              ? "success"
                              : c.status.includes("pending")
                                ? "warning"
                                : "primary"
                        }
                      >
                        {CASE_STATUS_LABELS[c.status as CaseStatus] || c.status.replace(/_/g, " ")}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Side column (1/3) */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <h3 className="mb-4 text-base font-semibold text-primary">
                Quick Actions
              </h3>
              <div className="space-y-2">
                {role === "client" && (
                  <>
                    <Link href="/cases/new" className="block">
                      <Button variant="primary" className="w-full justify-start">
                        <Briefcase className="h-4 w-4" />
                        File New Case
                      </Button>
                    </Link>
                    <Link href="/lawyers" className="block">
                      <Button variant="outline" className="w-full justify-start">
                        <Users className="h-4 w-4" />
                        Find a Lawyer
                      </Button>
                    </Link>
                  </>
                )}
                {role === "lawyer" && (
                  <>
                    <Link href="/cases" className="block">
                      <Button variant="primary" className="w-full justify-start">
                        <Briefcase className="h-4 w-4" />
                        View My Cases
                      </Button>
                    </Link>
                    <Link href="/ai-assistant" className="block">
                      <Button variant="outline" className="w-full justify-start">
                        <Bot className="h-4 w-4" />
                        AI Assistant
                      </Button>
                    </Link>
                  </>
                )}
                {(role === "admin_court" || role === "magistrate") && (
                  <>
                    <Link href="/cases/scrutiny" className="block">
                      <Button variant="primary" className="w-full justify-start">
                        <ClipboardCheck className="h-4 w-4" />
                        Scrutiny Queue
                      </Button>
                    </Link>
                    <Link href="/cases" className="block">
                      <Button variant="outline" className="w-full justify-start">
                        <Briefcase className="h-4 w-4" />
                        All Cases
                      </Button>
                    </Link>
                  </>
                )}
                {role === "trial_judge" && (
                  <Link href="/cases" className="block">
                    <Button variant="primary" className="w-full justify-start">
                      <Gavel className="h-4 w-4" />
                      Trial Cases
                    </Button>
                  </Link>
                )}
                {role === "stenographer" && (
                  <Link href="/cases" className="block">
                    <Button variant="primary" className="w-full justify-start">
                      <FileText className="h-4 w-4" />
                      View Cases
                    </Button>
                  </Link>
                )}
                <Link href="/notifications" className="block">
                  <Button variant="ghost" className="w-full justify-start">
                    <Bell className="h-4 w-4" />
                    Notifications
                    {unreadCount > 0 && (
                      <Badge variant="danger" className="ml-auto">
                        {unreadCount}
                      </Badge>
                    )}
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Recent Notifications */}
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold text-primary">
                  Recent Notifications
                </h3>
                <Link href="/notifications">
                  <Button variant="ghost" size="sm">
                    View All
                  </Button>
                </Link>
              </div>
              {notifications.length === 0 ? (
                <p className="text-sm text-muted">No notifications yet.</p>
              ) : (
                <div className="space-y-3">
                  {notifications.slice(0, 4).map((n) => (
                    <div
                      key={n.id}
                      className={`rounded-lg border p-3 ${
                        n.is_read
                          ? "border-border"
                          : "border-primary/20 bg-primary/5"
                      }`}
                    >
                      <p className="text-sm font-medium text-foreground">
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted line-clamp-2">
                        {n.message}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            {/* Case Summary */}
            <Card>
              <h3 className="mb-4 text-base font-semibold text-primary">
                Case Summary
              </h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Total Cases</span>
                  <span className="text-sm font-semibold text-foreground">
                    {cases.length}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Active</span>
                  <span className="text-sm font-semibold text-success">
                    {activeCases}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Closed/Disposed</span>
                  <span className="text-sm font-semibold text-foreground">
                    {closedCases}
                  </span>
                </div>
                {pendingPayments > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted">Pending Payments</span>
                    <span className="text-sm font-semibold text-warning">
                      {pendingPayments}
                    </span>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
