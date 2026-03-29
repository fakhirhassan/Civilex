"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { JudgmentRecordWithRelations } from "@/types/trial";

interface DeliverJudgmentData {
  judgment_text: string;
  judgment_summary?: string;
  verdict: string;
  relief_granted?: string;
  costs_awarded?: string;
  sentence_details?: string;
  hearing_id?: string;
  delivery_date?: string;
}

export function useJudgment(caseId: string) {
  const [judgment, setJudgment] = useState<JudgmentRecordWithRelations | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);

  const fetchJudgment = useCallback(async () => {
    if (!caseId) return;
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("judgment_records")
        .select(
          `*,
          delivered_by_profile:profiles!delivered_by(full_name),
          hearing:hearings!hearing_id(hearing_number, scheduled_date)`
        )
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching judgment:", error);
        setJudgment(null);
      } else {
        setJudgment(
          data as unknown as JudgmentRecordWithRelations | null
        );
      }
    } catch (err) {
      console.error("Error fetching judgment:", err);
      setJudgment(null);
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchJudgment();
  }, [fetchJudgment]);

  const deliverJudgment = useCallback(
    async (data: DeliverJudgmentData) => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return { error: "Not authenticated" };

        const { error } = await supabase.from("judgment_records").insert({
          case_id: caseId,
          delivered_by: user.id,
          delivery_date:
            data.delivery_date || new Date().toISOString().split("T")[0],
          ...data,
        });

        if (error) return { error: error.message };

        // Update case status to judgment_delivered
        await supabase
          .from("cases")
          .update({
            status: "judgment_delivered",
            disposal_date: new Date().toISOString(),
          })
          .eq("id", caseId)
          .eq("status", "reserved_for_judgment");

        // Log activity
        await supabase.from("case_activity_log").insert({
          case_id: caseId,
          actor_id: user.id,
          action: "judgment_delivered",
          details: { verdict: data.verdict },
        });

        // Notify case parties
        const { data: caseData } = await supabase
          .from("cases")
          .select("plaintiff_id, defendant_id, title")
          .eq("id", caseId)
          .single();

        if (caseData) {
          const notifyIds = [
            caseData.plaintiff_id,
            caseData.defendant_id,
          ].filter(Boolean);

          // Also notify assigned lawyers
          const { data: assignments } = await supabase
            .from("case_assignments")
            .select("lawyer_id")
            .eq("case_id", caseId)
            .eq("status", "accepted");

          if (assignments) {
            assignments.forEach((a) => notifyIds.push(a.lawyer_id));
          }

          for (const userId of notifyIds) {
            if (!userId || userId === user.id) continue;
            await supabase.from("notifications").insert({
              user_id: userId,
              title: "Judgment Delivered",
              message: `Judgment has been delivered in case "${caseData.title}". Verdict: ${data.verdict}`,
              type: "judgment_delivered",
              reference_id: caseId,
              reference_type: "case",
            });
          }
        }

        await fetchJudgment();
        return { error: null };
      } catch {
        return { error: "Failed to deliver judgment" };
      }
    },
    [caseId, fetchJudgment]
  );

  return {
    judgment,
    isLoading,
    deliverJudgment,
    fetchJudgment,
  };
}
