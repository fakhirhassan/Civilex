"use client";

import { useState, useRef, useEffect } from "react";
import { Bell, Check, CheckCheck, Trash2, X } from "lucide-react";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "@/lib/utils";
import Link from "next/link";

const typeIcons: Record<string, string> = {
  case_filed: "📋",
  case_assigned: "👤",
  case_accepted: "✅",
  case_declined: "❌",
  case_status_changed: "🔄",
  payment_pending: "💰",
  payment_completed: "💳",
  hearing_scheduled: "📅",
  hearing_reminder: "⏰",
  document_uploaded: "📄",
  scrutiny_approved: "✔️",
  scrutiny_returned: "↩️",
  judgment_delivered: "⚖️",
  general: "🔔",
};

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const recentNotifications = notifications.slice(0, 8);

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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative rounded-lg p-2 text-muted hover:bg-cream-dark hover:text-foreground transition-colors"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-xl border border-border bg-cream-light shadow-lg sm:w-96">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-primary">
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="rounded-full bg-danger/10 px-2 py-0.5 text-xs font-medium text-danger">
                  {unreadCount} new
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllAsRead()}
                  className="rounded p-1 text-muted hover:bg-cream-dark hover:text-primary"
                  title="Mark all as read"
                >
                  <CheckCheck className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => setIsOpen(false)}
                className="rounded p-1 text-muted hover:bg-cream-dark hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-96 overflow-y-auto">
            {recentNotifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <Bell className="mx-auto h-8 w-8 text-muted/50" />
                <p className="mt-2 text-sm text-muted">No notifications yet</p>
              </div>
            ) : (
              recentNotifications.map((n) => {
                const link = getLink(n);
                const content = (
                  <div
                    className={`flex gap-3 px-4 py-3 transition-colors hover:bg-cream-dark/50 ${
                      !n.is_read ? "bg-primary/5" : ""
                    }`}
                  >
                    <span className="mt-0.5 text-lg leading-none">
                      {typeIcons[n.type] || "🔔"}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm ${
                          !n.is_read
                            ? "font-semibold text-foreground"
                            : "text-foreground/80"
                        }`}
                      >
                        {n.title}
                      </p>
                      <p className="mt-0.5 text-xs text-muted line-clamp-2">
                        {n.message}
                      </p>
                      <p className="mt-1 text-[11px] text-muted/70">
                        {formatDistanceToNow(n.created_at)}
                      </p>
                    </div>
                    {!n.is_read && (
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          markAsRead(n.id);
                        }}
                        className="mt-0.5 shrink-0 rounded p-1 text-muted hover:bg-cream-dark hover:text-primary"
                        title="Mark as read"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                );

                return link ? (
                  <Link
                    key={n.id}
                    href={link}
                    onClick={() => {
                      if (!n.is_read) markAsRead(n.id);
                      setIsOpen(false);
                    }}
                  >
                    {content}
                  </Link>
                ) : (
                  <div key={n.id}>{content}</div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="border-t border-border px-4 py-2">
              <Link
                href="/notifications"
                onClick={() => setIsOpen(false)}
                className="block text-center text-xs font-medium text-primary hover:underline"
              >
                View All Notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
