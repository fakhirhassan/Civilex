"use client";

import { useState } from "react";
import Topbar from "@/components/layout/Topbar";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import LawyerCard from "@/components/features/lawyers/LawyerCard";
import LawyerFilters from "@/components/features/lawyers/LawyerFilters";
import { useLawyers } from "@/hooks/useLawyers";
import { useCases } from "@/hooks/useCases";
import { useAuth } from "@/hooks/useAuth";
import { Users, Scale } from "lucide-react";
import type { LawyerWithProfile } from "@/types/case";

export default function LawyersPage() {
  const { lawyers, isLoading, filters, updateFilters, resetFilters } = useLawyers();
  const { cases, requestDefendantLawyer } = useCases();
  const { user } = useAuth();

  // Dialog state for defendant lawyer request
  const [selectedLawyer, setSelectedLawyer] = useState<LawyerWithProfile | null>(null);
  const [selectedCaseId, setSelectedCaseId] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Cases where this user is the defendant and summon has been issued
  const defendantCases = cases.filter(
    (c) => c.defendant_id === user?.id
  );

  const isDefendantUser = defendantCases.length > 0;

  const handleRequestLawyer = async () => {
    if (!selectedCaseId || !selectedLawyer) return;
    setRequesting(true);
    setRequestError("");

    const result = await requestDefendantLawyer(selectedCaseId, selectedLawyer.id);
    setRequesting(false);

    if (result.error) {
      setRequestError(result.error);
    } else {
      setRequestSuccess(true);
    }
  };

  return (
    <div>
      <Topbar title="Lawyer Directory" />

      <div className="p-6">
        {/* Defendant notice banner */}
        {isDefendantUser && (
          <div className="mb-6 rounded-lg border border-primary/30 bg-primary/5 p-4">
            <div className="flex items-start gap-3">
              <Scale className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="font-medium text-primary">You have been summoned</p>
                <p className="mt-1 text-sm text-muted">
                  You are the defendant in {defendantCases.length} case(s). Browse the directory below and click{" "}
                  <strong>Hire as My Lawyer</strong> on any available lawyer to request representation.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Filters */}
        <LawyerFilters
          filters={filters}
          onFilterChange={updateFilters}
          onReset={resetFilters}
        />

        {/* Results count */}
        <p className="mt-4 text-sm text-muted">
          {isLoading ? "Searching..." : `${lawyers.length} lawyer(s) found`}
        </p>

        {/* Lawyers list */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : lawyers.length === 0 ? (
          <EmptyState
            title="No lawyers found"
            description="Try adjusting your filters to find more lawyers."
            icon={<Users className="h-12 w-12" />}
          />
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
            {lawyers.map((lawyer) => (
              <div key={lawyer.id} className="relative">
                <LawyerCard lawyer={lawyer} />
                {isDefendantUser && lawyer.lawyer_profiles.is_available && (
                  <div className="mt-2 px-1">
                    <Button
                      size="sm"
                      variant="primary"
                      className="w-full"
                      onClick={() => {
                        setSelectedLawyer(lawyer);
                        setSelectedCaseId(defendantCases.length === 1 ? defendantCases[0].id : "");
                        setRequestError("");
                        setRequestSuccess(false);
                      }}
                    >
                      <Scale className="h-4 w-4" />
                      Hire as My Lawyer (Defendant)
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Request Lawyer Dialog */}
      {selectedLawyer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-xl">
            {requestSuccess ? (
              <>
                <h3 className="mb-3 text-lg font-semibold text-primary">Request Sent</h3>
                <div className="rounded-lg bg-green-50 border border-green-200 p-3 text-sm text-green-800">
                  Your request has been sent to <strong>{selectedLawyer.full_name}</strong>.
                  You will be notified once they accept or decline.
                </div>
                <div className="mt-6 flex justify-end">
                  <Button variant="primary" onClick={() => setSelectedLawyer(null)}>Done</Button>
                </div>
              </>
            ) : (
              <>
                <h3 className="mb-4 text-lg font-semibold text-primary">
                  Request Lawyer Representation
                </h3>

                <div className="mb-4 rounded-lg border border-border p-3">
                  <p className="font-medium text-sm">{selectedLawyer.full_name}</p>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {selectedLawyer.lawyer_profiles.specialization.map((s) => (
                      <Badge key={s} variant="primary">{s}</Badge>
                    ))}
                  </div>
                  {selectedLawyer.lawyer_profiles.hourly_rate && (
                    <p className="mt-1 text-xs text-muted">
                      Rate: PKR {selectedLawyer.lawyer_profiles.hourly_rate.toLocaleString()}/hr
                    </p>
                  )}
                </div>

                {defendantCases.length > 1 && (
                  <div className="mb-4">
                    <label className="mb-1 block text-sm font-medium">Select Case</label>
                    <select
                      className="w-full rounded-lg border border-border px-3 py-2 text-sm"
                      value={selectedCaseId}
                      onChange={(e) => setSelectedCaseId(e.target.value)}
                    >
                      <option value="">— Choose a case —</option>
                      {defendantCases.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.case_number} — {c.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {defendantCases.length === 1 && (
                  <div className="mb-4 rounded-lg bg-cream-light border border-border p-3 text-sm">
                    <span className="text-muted">Case: </span>
                    <span className="font-medium">{defendantCases[0].case_number} — {defendantCases[0].title}</span>
                  </div>
                )}

                <p className="mb-4 text-sm text-muted">
                  The lawyer will review your request and may accept or decline. If they accept,
                  they will set their fee for you to confirm before the engagement begins.
                </p>

                {requestError && (
                  <div className="mb-4 rounded-lg border border-danger bg-danger-light p-2 text-sm text-danger">
                    {requestError}
                  </div>
                )}

                <div className="flex justify-end gap-3">
                  <Button variant="outline" onClick={() => setSelectedLawyer(null)}>
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    isLoading={requesting}
                    disabled={!selectedCaseId}
                    onClick={handleRequestLawyer}
                  >
                    Send Request
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
