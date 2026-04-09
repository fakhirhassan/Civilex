"use client";

import { useState } from "react";
import Topbar from "@/components/layout/Topbar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow, formatDateTime } from "@/lib/utils";
import {
  Bell,
  CheckCheck,
  Trash2,
  Briefcase,
  CreditCard,
  Calendar,
  FileText,
  Shield,
  Scale,
  Info,
} from "lucide-react";
import Link from "next/link";
import type { NotificationType } from "@/types/notification";

const typeConfig: Record<
  NotificationType,
  { icon: typeof Bell; color: string; bg: string }
> = {
  case_filed: { icon: Briefcase, color: "text-primary", bg: "bg-primary/10" },
  case_assigned: { icon: Briefcase, color: "text-info", bg: "bg-blue-50" },
  case_accepted: { icon: Briefcase, color: "text-success", bg: "bg-green-50" },
  case_declined: { icon: Briefcase, color: "text-danger", bg: "bg-red-50" },
  case_status_changed: { icon: Briefcase, color: "text-primary", bg: "bg-primary/10" },
  payment_pending: { icon: CreditCard, color: "text-warning", bg: "bg-amber-50" },
  payment_completed: { icon: CreditCard, color: "text-success", bg: "bg-green-50" },
  hearing_scheduled: { icon: Calendar, color: "text-info", bg: "bg-blue-50" },
  hearing_reminder: { icon: Calendar, color: "text-warning", bg: "bg-amber-50" },
  document_uploaded: { icon: FileText, color: "text-primary", bg: "bg-primary/10" },
  scrutiny_approved: { icon: Shield, color: "text-success", bg: "bg-green-50" },
  scrutiny_returned: { icon: Shield, color: "text-warning", bg: "bg-amber-50" },
  judgment_delivered: { icon: Scale, color: "text-primary", bg: "bg-primary/10" },
  summon_issued: { icon: Scale, color: "text-danger", bg: "bg-red-50" },
  document_requested: { icon: FileText, color: "text-warning", bg: "bg-amber-50" },
  general: { icon: Info, color: "text-muted", bg: "bg-cream-dark" },
};

type Filter = "all" | "unread" | "read";

export default function NotificationsPage() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAll,
  } = useNotifications();
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.is_read;
    if (filter === "read") return n.is_read;
    return true;
  });

  const getLink = (n: { reference_type: string | null; reference_id: string | null }) => {
    if (!n.reference_type || !n.reference_id) return null;
    switch (n.reference_type) {
      case "case":
        return `/cases/${n.reference_id}`;
      case "payment":
        return `/payments`;
      default:
        return null;
    }
  };

  const filters: { id: Filter; label: string; count?: number }[] = [
    { id: "all", label: "All", count: notifications.length },
    { id: "unread", label: "Unread", count: unreadCount },
    { id: "read", label: "Read", count: notifications.length - unreadCount },
  ];

  return (
    <div>
      <Topbar title="Notifications" />

      <div className="p-6">
        {/* Header actions */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Filter tabs */}
          <div className="flex gap-1 rounded-lg border border-border bg-cream p-1">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  filter === f.id
                    ? "bg-primary text-white"
                    : "text-muted hover:text-foreground"
                }`}
              >
                {f.label}
                {f.count !== undefined && f.count > 0 && (
                  <span
                    className={`ml-1.5 text-xs ${
                      filter === f.id ? "text-white/80" : "text-muted"
                    }`}
                  >
                    ({f.count})
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Bulk actions */}
          <div className="flex gap-2">
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={() => markAllAsRead()}>
                <CheckCheck className="h-4 w-4" />
                Mark All Read
              </Button>
            )}
            {notifications.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => clearAll()}>
                <Trash2 className="h-4 w-4" />
                Clear All
              </Button>
            )}
          </div>
        </div>

        {/* Notifications list */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            title={
              filter === "unread"
                ? "No unread notifications"
                : "No notifications"
            }
            description={
              filter === "unread"
                ? "You're all caught up!"
                : "Notifications about your cases, payments, and hearings will appear here."
            }
            icon={<Bell className="h-12 w-12" />}
          />
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => {
              const config = typeConfig[n.type] || typeConfig.general;
              const Icon = config.icon;
              const link = getLink(n);

              const content = (
                <Card
                  padding="md"
                  className={`transition-colors hover:shadow-sm ${
                    !n.is_read ? "border-l-4 border-l-primary bg-primary/[0.02]" : ""
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${config.bg}`}
                    >
                      <Icon className={`h-5 w-5 ${config.color}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p
                            className={`text-sm ${
                              !n.is_read
                                ? "font-semibold text-foreground"
                                : "font-medium text-foreground/80"
                            }`}
                          >
                            {n.title}
                          </p>
                          <p className="mt-0.5 text-sm text-muted">
                            {n.message}
                          </p>
                        </div>
                        <span className="shrink-0 text-xs text-muted/70">
                          {formatDistanceToNow(n.created_at)}
                        </span>
                      </div>

                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[11px] text-muted/60">
                          {formatDateTime(n.created_at)}
                        </span>
                        {!n.is_read && (
                          <button
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              markAsRead(n.id);
                            }}
                            className="text-xs text-primary hover:underline"
                          >
                            Mark as read
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            deleteNotification(n.id);
                          }}
                          className="text-xs text-muted hover:text-danger"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              );

              return link ? (
                <Link key={n.id} href={link} onClick={() => !n.is_read && markAsRead(n.id)}>
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
