"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import Sidebar from "./Sidebar";
import type { Role } from "@/lib/constants";

interface MobileNavProps {
  isOpen: boolean;
  onClose: () => void;
  role: Role;
  userName: string;
  userEmail: string;
}

export default function MobileNav({
  isOpen,
  onClose,
  role,
  userName,
  userEmail,
}: MobileNavProps) {
  return (
    <>
      {/* Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar drawer */}
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 lg:hidden",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <button
          onClick={onClose}
          className="absolute right-2 top-4 z-50 rounded-lg p-2 text-foreground hover:bg-cream-dark"
        >
          <X className="h-5 w-5" />
        </button>
        <Sidebar
          role={role}
          userName={userName}
          userEmail={userEmail}
          className="relative"
        />
      </div>
    </>
  );
}
