"use client";

import Topbar from "@/components/layout/Topbar";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABELS } from "@/lib/constants";
import { Briefcase, CreditCard, Calendar, Bell, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

const stats = [
  {
    label: "Active Cases",
    value: "0",
    icon: Briefcase,
    color: "text-primary",
    bg: "bg-primary/10",
  },
  {
    label: "Pending Payments",
    value: "0",
    icon: CreditCard,
    color: "text-accent",
    bg: "bg-accent/10",
  },
  {
    label: "Upcoming Hearings",
    value: "0",
    icon: Calendar,
    color: "text-info",
    bg: "bg-info/10",
  },
  {
    label: "Notifications",
    value: "0",
    icon: Bell,
    color: "text-danger",
    bg: "bg-danger/10",
  },
];

export default function DashboardPage() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push("/login");
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
            <p className="mt-1 text-sm text-muted">
              Here&apos;s an overview of your legal activities.
            </p>
            <Badge variant="primary" className="mt-2">
              {user?.role ? ROLE_LABELS[user.role] : "User"}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={handleSignOut}>
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} padding="md">
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
          ))}
        </div>

        {/* Recent activity placeholder */}
        <Card className="mt-6">
          <h3 className="mb-4 text-lg font-semibold text-primary">
            Recent Activity
          </h3>
          <p className="text-sm text-muted">
            Your recent case activities will appear here.
          </p>
        </Card>
      </div>
    </div>
  );
}
