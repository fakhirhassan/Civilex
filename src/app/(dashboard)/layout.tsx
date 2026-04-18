"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/layout/Sidebar";
import MobileNav from "@/components/layout/MobileNav";
import Spinner from "@/components/ui/Spinner";
import { useAuth } from "@/hooks/useAuth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading } = useAuth();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <Spinner size="lg" />
      </div>
    );
  }

  const role = user?.role ?? "client";
  const userName = user?.full_name ?? "User";
  const userEmail = user?.email ?? "";

  return (
    <div className="min-h-screen bg-cream">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block">
        <Sidebar role={role} userName={userName} userEmail={userEmail} />
      </div>

      {/* Mobile Nav */}
      <MobileNav
        isOpen={mobileNavOpen}
        onClose={() => setMobileNavOpen(false)}
        role={role}
        userName={userName}
        userEmail={userEmail}
      />

      {/* Main content */}
      <main className="lg:ml-[280px]">
        <div className="min-h-screen rounded-tl-2xl bg-cream-light shadow-sm lg:rounded-none">
          {children}
        </div>
      </main>
    </div>
  );
}
