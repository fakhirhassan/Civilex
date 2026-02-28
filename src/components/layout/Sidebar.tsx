"use client";

import { cn } from "@/lib/utils";
import { SIDEBAR_NAV, ROLE_LABELS, type Role } from "@/lib/constants";
import Logo from "./Logo";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  CreditCard,
  Settings,
  Bot,
  Bell,
  ClipboardCheck,
  Gavel,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Briefcase,
  Users,
  CreditCard,
  Settings,
  Bot,
  Bell,
  ClipboardCheck,
  Gavel,
};

interface SidebarProps {
  role: Role;
  userName: string;
  userEmail: string;
  className?: string;
}

export default function Sidebar({ role, userName, userEmail, className }: SidebarProps) {
  const pathname = usePathname();
  const navItems = SIDEBAR_NAV[role] || SIDEBAR_NAV.client;

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 flex h-screen w-[280px] flex-col border-r border-border bg-cream-light",
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center px-6 py-5">
        <Logo size="md" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navItems.map((item) => {
          const Icon = iconMap[item.icon] || LayoutDashboard;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary text-white"
                  : "text-foreground hover:bg-cream-dark"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* User info at bottom */}
      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-cream-dark text-sm font-medium text-primary">
            {userName
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="truncate text-sm font-medium text-foreground">
              {userName}
            </p>
            <p className="truncate text-xs text-muted">{userEmail}</p>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">
          {ROLE_LABELS[role]}
        </p>
      </div>
    </aside>
  );
}
