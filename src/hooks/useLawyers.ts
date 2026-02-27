"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { LawyerWithProfile } from "@/types/case";

interface LawyerFilters {
  search: string;
  specialization: string;
  city: string;
  minRating: number;
  sortBy: "rating" | "experience" | "rate";
}

const defaultFilters: LawyerFilters = {
  search: "",
  specialization: "",
  city: "",
  minRating: 0,
  sortBy: "rating",
};

export function useLawyers() {
  const [lawyers, setLawyers] = useState<LawyerWithProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<LawyerFilters>(defaultFilters);

  const fetchLawyers = useCallback(async () => {
    setIsLoading(true);
    try {
      const supabase = createClient();

      let query = supabase
        .from("profiles")
        .select(`
          id, full_name, email, phone, avatar_url, city,
          lawyer_profiles!inner(
            bar_license_number, specialization, experience_years,
            bio, hourly_rate, rating, total_reviews, is_available, location
          )
        `)
        .eq("role", "lawyer")
        .eq("is_active", true);

      // Apply search filter
      if (filters.search) {
        query = query.ilike("full_name", `%${filters.search}%`);
      }

      // Apply city filter
      if (filters.city) {
        query = query.ilike("city", `%${filters.city}%`);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching lawyers:", error);
        setLawyers([]);
        return;
      }

      // Post-process for specialization and rating filters
      // (Supabase doesn't easily filter on nested/array fields via REST)
      let filtered = (data as unknown as LawyerWithProfile[]) || [];

      if (filters.specialization) {
        filtered = filtered.filter((l) =>
          l.lawyer_profiles.specialization.some(
            (s) => s.toLowerCase() === filters.specialization.toLowerCase()
          )
        );
      }

      if (filters.minRating > 0) {
        filtered = filtered.filter(
          (l) => l.lawyer_profiles.rating >= filters.minRating
        );
      }

      // Sort
      filtered.sort((a, b) => {
        switch (filters.sortBy) {
          case "rating":
            return b.lawyer_profiles.rating - a.lawyer_profiles.rating;
          case "experience":
            return b.lawyer_profiles.experience_years - a.lawyer_profiles.experience_years;
          case "rate":
            return (a.lawyer_profiles.hourly_rate || 0) - (b.lawyer_profiles.hourly_rate || 0);
          default:
            return 0;
        }
      });

      setLawyers(filtered);
    } catch (err) {
      console.error("Error fetching lawyers:", err);
      setLawyers([]);
    } finally {
      setIsLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchLawyers();
  }, [fetchLawyers]);

  const updateFilters = (newFilters: Partial<LawyerFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
  };

  const resetFilters = () => {
    setFilters(defaultFilters);
  };

  return {
    lawyers,
    isLoading,
    filters,
    updateFilters,
    resetFilters,
    fetchLawyers,
  };
}

export function useLawyer(lawyerId: string) {
  const [lawyer, setLawyer] = useState<LawyerWithProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!lawyerId) return;

    const fetch = async () => {
      setIsLoading(true);
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from("profiles")
          .select(`
            id, full_name, email, phone, avatar_url, city,
            lawyer_profiles!inner(
              bar_license_number, specialization, experience_years,
              bio, hourly_rate, rating, total_reviews, is_available, location
            )
          `)
          .eq("id", lawyerId)
          .eq("role", "lawyer")
          .single();

        if (error) {
          console.error("Error fetching lawyer:", error);
        } else {
          setLawyer(data as unknown as LawyerWithProfile);
        }
      } catch (err) {
        console.error("Error fetching lawyer:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetch();
  }, [lawyerId]);

  return { lawyer, isLoading };
}
