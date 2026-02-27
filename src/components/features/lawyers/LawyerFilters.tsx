"use client";

import Input from "@/components/ui/Input";
import Select from "@/components/ui/Select";
import Button from "@/components/ui/Button";
import { Search, RotateCcw } from "lucide-react";

interface LawyerFiltersProps {
  filters: {
    search: string;
    specialization: string;
    city: string;
    minRating: number;
    sortBy: string;
  };
  onFilterChange: (filters: Record<string, string | number>) => void;
  onReset: () => void;
}

const specializations = [
  { value: "", label: "All Specializations" },
  { value: "Civil", label: "Civil Law" },
  { value: "Criminal", label: "Criminal Law" },
  { value: "Family", label: "Family Law" },
  { value: "Property", label: "Property Law" },
  { value: "Corporate", label: "Corporate Law" },
  { value: "Tax", label: "Tax Law" },
  { value: "Constitutional", label: "Constitutional Law" },
  { value: "Labour", label: "Labour Law" },
  { value: "Banking", label: "Banking Law" },
  { value: "Cyber", label: "Cyber Law" },
];

const sortOptions = [
  { value: "rating", label: "Highest Rated" },
  { value: "experience", label: "Most Experienced" },
  { value: "rate", label: "Lowest Rate" },
];

const ratingOptions = [
  { value: "0", label: "Any Rating" },
  { value: "3", label: "3+ Stars" },
  { value: "4", label: "4+ Stars" },
  { value: "4.5", label: "4.5+ Stars" },
];

export default function LawyerFilters({
  filters,
  onFilterChange,
  onReset,
}: LawyerFiltersProps) {
  return (
    <div className="space-y-4 rounded-lg border border-border bg-cream-light p-4">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
        <Input
          placeholder="Search lawyers by name..."
          value={filters.search}
          onChange={(e) => onFilterChange({ search: e.target.value })}
          className="pl-10"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Select
          id="specialization"
          options={specializations}
          value={filters.specialization}
          onChange={(e) => onFilterChange({ specialization: e.target.value })}
        />
        <Input
          placeholder="City..."
          value={filters.city}
          onChange={(e) => onFilterChange({ city: e.target.value })}
        />
        <Select
          id="rating"
          options={ratingOptions}
          value={String(filters.minRating)}
          onChange={(e) => onFilterChange({ minRating: parseFloat(e.target.value) })}
        />
        <Select
          id="sortBy"
          options={sortOptions}
          value={filters.sortBy}
          onChange={(e) => onFilterChange({ sortBy: e.target.value })}
        />
      </div>

      <div className="flex justify-end">
        <Button variant="ghost" size="sm" onClick={onReset}>
          <RotateCcw className="h-3.5 w-3.5" />
          Reset Filters
        </Button>
      </div>
    </div>
  );
}
