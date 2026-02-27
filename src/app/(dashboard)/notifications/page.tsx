import Topbar from "@/components/layout/Topbar";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import { Bell } from "lucide-react";

export default function NotificationsPage() {
  return (
    <div>
      <Topbar title="Notifications" />

      <div className="p-6">
        <Card>
          <EmptyState
            title="No Notifications"
            description="You're all caught up! Notifications about your cases, hearings, and payments will appear here."
            icon={<Bell className="h-12 w-12" />}
          />
        </Card>
      </div>
    </div>
  );
}
