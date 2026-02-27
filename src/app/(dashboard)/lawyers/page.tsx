"use client";

import Topbar from "@/components/layout/Topbar";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import LawyerCard from "@/components/features/lawyers/LawyerCard";
import LawyerFilters from "@/components/features/lawyers/LawyerFilters";
import { useLawyers } from "@/hooks/useLawyers";
import { Users } from "lucide-react";

export default function LawyersPage() {
  const { lawyers, isLoading, filters, updateFilters, resetFilters } =
    useLawyers();

  return (
    <div>
      <Topbar title="Lawyer Directory" />

      <div className="p-6">
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
              <LawyerCard key={lawyer.id} lawyer={lawyer} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
