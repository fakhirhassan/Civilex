"use client";

import { use, useState } from "react";
import Topbar from "@/components/layout/Topbar";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import HearingCard from "@/components/features/hearings/HearingCard";
import HearingForm from "@/components/features/hearings/HearingForm";
import { useHearings } from "@/hooks/useHearings";
import { useCase } from "@/hooks/useCases";
import { useAuth } from "@/hooks/useAuth";
import { ArrowLeft, Calendar, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function HearingsListPage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { caseData } = useCase(caseId);
  const { hearings, isLoading, createHearing } = useHearings(caseId);
  const [showForm, setShowForm] = useState(false);

  const isCourtOfficial = user && ["admin_court", "magistrate", "trial_judge"].includes(user.role);

  if (isLoading) {
    return (
      <div>
        <Topbar title="Hearings" />
        <div className="flex justify-center py-16">
          <Spinner size="lg" />
        </div>
      </div>
    );
  }

  return (
    <div>
      <Topbar title={caseData ? `Hearings - ${caseData.case_number}` : "Hearings"} />

      <div className="p-6">
        <Link
          href={`/cases/${caseId}`}
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-primary"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Case
        </Link>

        <div className="mt-2 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-primary">
              Hearings ({hearings.length})
            </h2>
            {caseData && (
              <p className="text-sm text-muted">{caseData.title}</p>
            )}
          </div>
          {isCourtOfficial && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setShowForm(!showForm)}
            >
              <Plus className="h-4 w-4" />
              Schedule Hearing
            </Button>
          )}
        </div>

        {/* Schedule new hearing form */}
        {showForm && (
          <div className="mt-4">
            <HearingForm
              onSubmit={async (data) => {
                const result = await createHearing(data);
                if (!result.error) setShowForm(false);
                return { error: result.error };
              }}
              onCancel={() => setShowForm(false)}
            />
          </div>
        )}

        {/* Hearings list */}
        <div className="mt-6 space-y-3">
          {hearings.length === 0 ? (
            <EmptyState
              title="No hearings scheduled"
              description="There are no hearings for this case yet."
              icon={<Calendar className="h-12 w-12" />}
            />
          ) : (
            hearings.map((hearing) => (
              <HearingCard
                key={hearing.id}
                hearing={hearing}
                onClick={() =>
                  router.push(`/cases/${caseId}/hearings/${hearing.id}`)
                }
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
