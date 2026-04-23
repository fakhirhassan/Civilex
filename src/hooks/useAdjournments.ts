"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import type { HearingAdjournment, AdjournmentReason } from "@/types/hearing";

export function useAdjournments(hearingId: string, caseId: string) {
  const { user } = useAuth();
  const [adjournments, setAdjournments] = useState<HearingAdjournment[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user || !hearingId) return;
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("hearing_adjournments")
        .select(`
          *,
          adjourner:profiles!adjourned_by(id, full_name)
        `)
        .eq("hearing_id", hearingId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching adjournments:", error);
        setAdjournments([]);
      } else {
        setAdjournments((data as HearingAdjournment[]) ?? []);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, hearingId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const addAdjournment = async (input: {
    reason: AdjournmentReason;
    reason_text?: string;
    cost_imposed?: number;
    next_date?: string | null;
  }) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      const { error: insertError } = await supabase
        .from("hearing_adjournments")
        .insert({
          hearing_id: hearingId,
          case_id: caseId,
          reason: input.reason,
          reason_text: input.reason_text?.trim() || null,
          cost_imposed: input.cost_imposed ?? 0,
          next_date: input.next_date || null,
          adjourned_by: user.id,
        });

      if (insertError) return { error: insertError.message };

      // Side effects: set hearing status to adjourned, propagate next_date.
      const hearingUpdates: Record<string, unknown> = { status: "adjourned" };
      if (input.next_date) hearingUpdates.next_hearing_date = input.next_date;

      await supabase.from("hearings").update(hearingUpdates).eq("id", hearingId);

      if (input.next_date) {
        await supabase
          .from("cases")
          .update({ next_hearing_date: input.next_date })
          .eq("id", caseId);
      }

      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "hearing_adjourned",
        details: {
          hearing_id: hearingId,
          reason: input.reason,
          next_date: input.next_date,
          cost_imposed: input.cost_imposed ?? 0,
        },
      });

      await fetch();
      return { error: null };
    } catch (err) {
      console.error("Error adding adjournment:", err);
      return { error: "Failed to record adjournment" };
    }
  };

  return { adjournments, isLoading, addAdjournment, refresh: fetch };
}
