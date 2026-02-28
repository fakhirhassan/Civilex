"use client";

import { useState } from "react";
import Topbar from "@/components/layout/Topbar";
import Card from "@/components/ui/Card";
import Badge from "@/components/ui/Badge";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import ScrutinyChecklistComponent from "@/components/features/scrutiny/ScrutinyChecklist";
import { useScrutinyQueue } from "@/hooks/useScrutiny";
import { useAuth } from "@/hooks/useAuth";
import { formatDate } from "@/lib/utils";
import type { CaseStatus } from "@/lib/constants";
import {
  ClipboardCheck,
  ChevronRight,
  ArrowLeft,
  FileText,
  User,
} from "lucide-react";

export default function ScrutinyQueuePage() {
  const { user } = useAuth();
  const { queue, isLoading, refreshQueue } = useScrutinyQueue();
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);
  const [selectedCaseTitle, setSelectedCaseTitle] = useState("");

  // Only admin_court and magistrate should see this
  if (user && !["admin_court", "magistrate"].includes(user.role)) {
    return (
      <div>
        <Topbar title="Scrutiny Queue" />
        <div className="p-6">
          <EmptyState
            title="Access Denied"
            description="Only Admin Court officials can access the scrutiny queue."
            icon={<ClipboardCheck className="h-12 w-12" />}
          />
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <Topbar title="Scrutiny Queue" />
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  // Detail view - scrutiny form for selected case
  if (selectedCaseId) {
    return (
      <div>
        <Topbar title="Case Scrutiny" />
        <div className="p-6">
          <button
            onClick={() => setSelectedCaseId(null)}
            className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Queue
          </button>

          <ScrutinyChecklistComponent
            caseId={selectedCaseId}
            caseTitle={selectedCaseTitle}
            onComplete={() => {
              setSelectedCaseId(null);
              refreshQueue();
            }}
          />
        </div>
      </div>
    );
  }

  // Queue list view
  return (
    <div>
      <Topbar title="Scrutiny Queue" />

      <div className="p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-primary">Scrutiny Queue</h2>
            <p className="text-sm text-muted">
              Cases submitted for admin court review ({queue.length} pending)
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={refreshQueue}>
            Refresh
          </Button>
        </div>

        {queue.length === 0 ? (
          <EmptyState
            title="No cases in queue"
            description="There are no cases awaiting scrutiny at this time."
            icon={<ClipboardCheck className="h-12 w-12" />}
          />
        ) : (
          <div className="space-y-3">
            {queue.map((item) => (
              <Card
                key={item.id}
                padding="sm"
                className="cursor-pointer transition-all hover:border-primary hover:shadow-md"
                onClick={() => {
                  setSelectedCaseId(item.id);
                  setSelectedCaseTitle(item.title);
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold text-foreground">
                        {item.title}
                      </h3>
                      <StatusBadge status={item.status as CaseStatus} />
                      <Badge
                        variant={item.case_type === "civil" ? "primary" : "danger"}
                      >
                        {item.case_type === "civil" ? "Civil" : "Criminal"}
                      </Badge>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted">
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        {item.case_number}
                      </span>
                      {item.plaintiff && (
                        <span className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          {item.plaintiff.full_name}
                        </span>
                      )}
                      {item.filing_date && (
                        <span>Filed: {formatDate(item.filing_date)}</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
