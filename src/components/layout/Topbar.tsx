"use client";

import { Bell, MessageSquare, User, Menu } from "lucide-react";
import Link from "next/link";

interface TopbarProps {
  title: string;
  onMenuToggle?: () => void;
}

export default function Topbar({ title, onMenuToggle }: TopbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-cream-light px-6">
      <div className="flex items-center gap-3">
        {onMenuToggle && (
          <button
            onClick={onMenuToggle}
            className="rounded-lg p-2 text-foreground hover:bg-cream-dark lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/settings"
          className="rounded-lg p-2 text-muted hover:bg-cream-dark hover:text-foreground transition-colors"
        >
          <User className="h-5 w-5" />
        </Link>
        <button className="rounded-lg p-2 text-muted hover:bg-cream-dark hover:text-foreground transition-colors">
          <MessageSquare className="h-5 w-5" />
        </button>
        <Link
          href="/notifications"
          className="relative rounded-lg p-2 text-muted hover:bg-cream-dark hover:text-foreground transition-colors"
        >
          <Bell className="h-5 w-5" />
          {/* Notification dot - will be dynamic later */}
        </Link>
      </div>
    </header>
  );
}
