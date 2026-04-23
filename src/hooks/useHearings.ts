"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import type {
  Hearing,
  HearingWithRelations,
  HearingType,
  OrderSheet,
  OrderType,
} from "@/types/hearing";

export function useHearings(caseId: string) {
  const { user } = useAuth();
  const [hearings, setHearings] = useState<HearingWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchHearings = useCallback(async () => {
    if (!user || !caseId) return;

    setIsLoading(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("hearings")
        .select(`
          *,
          presiding_officer:profiles!presiding_officer_id(id, full_name, email),
          order_sheets(
            id, order_type, order_text, created_at,
            issuer:profiles!issued_by(id, full_name)
          )
        `)
        .eq("case_id", caseId)
        .order("hearing_number", { ascending: true });

      if (error) {
        console.error("Error fetching hearings:", error);
      } else {
        setHearings((data as HearingWithRelations[]) || []);
      }
    } catch (err) {
      console.error("Error fetching hearings:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, caseId]);

  useEffect(() => {
    fetchHearings();
  }, [fetchHearings]);

  const assignJudge = async (judgeId: string) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("cases")
        .update({
          trial_judge_id: judgeId,
          judge_assigned_at: new Date().toISOString(),
        })
        .eq("id", caseId);

      if (error) return { error: error.message };

      // Log activity
      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "judge_assigned",
        details: { judge_id: judgeId },
      });

      // Notify the assigned judge
      const { data: caseRow } = await supabase
        .from("cases")
        .select("title, case_number")
        .eq("id", caseId)
        .single();

      await supabase.from("notifications").insert({
        user_id: judgeId,
        title: "Case Assigned to You",
        message: `You have been assigned as judge for case "${caseRow?.title}" (${caseRow?.case_number}).`,
        type: "case_status_changed",
        reference_type: "case",
        reference_id: caseId,
      });

      // Also notify all parties
      const partyIds: string[] = [];
      const { data: assignedCase } = await supabase
        .from("cases")
        .select("plaintiff_id, defendant_id")
        .eq("id", caseId)
        .single();
      if (assignedCase?.plaintiff_id) partyIds.push(assignedCase.plaintiff_id);
      if (assignedCase?.defendant_id) partyIds.push(assignedCase.defendant_id);

      const { data: assignments } = await supabase
        .from("case_assignments")
        .select("lawyer_id")
        .eq("case_id", caseId)
        .eq("status", "accepted");

      if (assignments) {
        for (const a of assignments) {
          if (!partyIds.includes(a.lawyer_id)) partyIds.push(a.lawyer_id);
        }
      }

      for (const pid of partyIds) {
        if (pid !== judgeId) {
          await supabase.from("notifications").insert({
            user_id: pid,
            title: "Judge Assigned",
            message: `A judge has been assigned to case "${caseRow?.title}" (${caseRow?.case_number}).`,
            type: "case_status_changed",
            reference_type: "case",
            reference_id: caseId,
          });
        }
      }

      return { error: null };
    } catch (err) {
      console.error("Error assigning judge:", err);
      return { error: "Failed to assign judge" };
    }
  };

  const assignStenographer = async (stenographerId: string) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("cases")
        .update({ stenographer_id: stenographerId })
        .eq("id", caseId);

      if (error) return { error: error.message };

      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "stenographer_assigned",
        details: { stenographer_id: stenographerId },
      });

      const { data: caseRow } = await supabase
        .from("cases")
        .select("title, case_number")
        .eq("id", caseId)
        .single();

      if (stenographerId !== user.id) {
        await supabase.from("notifications").insert({
          user_id: stenographerId,
          title: "Case Assigned to You",
          message: `You have been assigned as stenographer for case "${caseRow?.title}" (${caseRow?.case_number}). You will be responsible for recording hearing transcripts.`,
          type: "case_status_changed",
          reference_type: "case",
          reference_id: caseId,
        });
      }

      return { error: null };
    } catch (err) {
      console.error("Error assigning stenographer:", err);
      return { error: "Failed to assign stenographer" };
    }
  };

  const createHearing = async (data: {
    hearing_type: HearingType;
    scheduled_date: string;
    courtroom?: string;
    notes?: string;
  }) => {
    if (!user) return { error: "Not authenticated", data: null };

    try {
      const supabase = createClient();

      // Get next hearing number
      const { data: lastHearing } = await supabase
        .from("hearings")
        .select("hearing_number")
        .eq("case_id", caseId)
        .order("hearing_number", { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextNumber = (lastHearing?.hearing_number || 0) + 1;

      const { data: hearing, error } = await supabase
        .from("hearings")
        .insert({
          case_id: caseId,
          hearing_number: nextNumber,
          hearing_type: data.hearing_type,
          scheduled_date: data.scheduled_date,
          courtroom: data.courtroom,
          presiding_officer_id: user.id,
          status: "scheduled",
          notes: data.notes || null,
        })
        .select()
        .single();

      if (error) return { error: error.message, data: null };

      // Update case next_hearing_date
      await supabase
        .from("cases")
        .update({ next_hearing_date: data.scheduled_date })
        .eq("id", caseId);

      // Log activity
      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "hearing_scheduled",
        details: {
          hearing_number: nextNumber,
          hearing_type: data.hearing_type,
          scheduled_date: data.scheduled_date,
        },
      });

      // Notify all case parties
      const { data: caseRow } = await supabase
        .from("cases")
        .select("plaintiff_id, defendant_id, title")
        .eq("id", caseId)
        .single();

      const partyIds: string[] = [];
      if (caseRow?.plaintiff_id) partyIds.push(caseRow.plaintiff_id);
      if (caseRow?.defendant_id) partyIds.push(caseRow.defendant_id);

      const { data: assignments } = await supabase
        .from("case_assignments")
        .select("lawyer_id")
        .eq("case_id", caseId)
        .eq("status", "accepted");

      if (assignments) {
        for (const a of assignments) {
          if (!partyIds.includes(a.lawyer_id)) partyIds.push(a.lawyer_id);
        }
      }

      for (const pid of partyIds) {
        if (pid === user.id) continue;
        await supabase.from("notifications").insert({
          user_id: pid,
          title: "Hearing Scheduled",
          message: `Hearing #${nextNumber} for case "${caseRow?.title}" has been scheduled for ${new Date(data.scheduled_date).toLocaleDateString("en-PK")}.`,
          type: "hearing_scheduled",
          reference_type: "case",
          reference_id: caseId,
        });
      }

      await fetchHearings();
      return { error: null, data: hearing as Hearing };
    } catch (err) {
      console.error("Error creating hearing:", err);
      return { error: "Failed to create hearing", data: null };
    }
  };

  const updateHearing = async (
    hearingId: string,
    updates: Partial<Pick<Hearing, "status" | "actual_date" | "next_hearing_date" | "courtroom">>
  ) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("hearings")
        .update(updates)
        .eq("id", hearingId);

      if (error) return { error: error.message };

      // If next_hearing_date set, update case too
      if (updates.next_hearing_date) {
        await supabase
          .from("cases")
          .update({ next_hearing_date: updates.next_hearing_date })
          .eq("id", caseId);
      }

      await fetchHearings();
      return { error: null };
    } catch (err) {
      console.error("Error updating hearing:", err);
      return { error: "Failed to update hearing" };
    }
  };

  const addProceedings = async (hearingId: string, summary: string) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("hearings")
        .update({ proceedings_summary: summary })
        .eq("id", hearingId);

      if (error) return { error: error.message };

      // Log activity
      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "proceedings_recorded",
        details: { hearing_id: hearingId },
      });

      await fetchHearings();
      return { error: null };
    } catch (err) {
      console.error("Error adding proceedings:", err);
      return { error: "Failed to add proceedings" };
    }
  };

  const addJudgeRemarks = async (hearingId: string, remarks: string) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("hearings")
        .update({ judge_remarks: remarks })
        .eq("id", hearingId);

      if (error) return { error: error.message };

      await fetchHearings();
      return { error: null };
    } catch (err) {
      console.error("Error adding judge remarks:", err);
      return { error: "Failed to add remarks" };
    }
  };

  const addOrderSheet = async (data: {
    hearing_id?: string;
    order_type: OrderType;
    order_text: string;
  }) => {
    if (!user) return { error: "Not authenticated", data: null };

    try {
      const supabase = createClient();

      const { data: order, error } = await supabase
        .from("order_sheets")
        .insert({
          hearing_id: data.hearing_id || null,
          case_id: caseId,
          order_type: data.order_type,
          order_text: data.order_text,
          issued_by: user.id,
        })
        .select()
        .single();

      if (error) return { error: error.message, data: null };

      // Log activity
      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "order_issued",
        details: { order_type: data.order_type, hearing_id: data.hearing_id },
      });

      await fetchHearings();
      return { error: null, data: order as OrderSheet };
    } catch (err) {
      console.error("Error adding order sheet:", err);
      return { error: "Failed to add order", data: null };
    }
  };

  return {
    hearings,
    isLoading,
    fetchHearings,
    assignJudge,
    assignStenographer,
    createHearing,
    updateHearing,
    addProceedings,
    addJudgeRemarks,
    addOrderSheet,
  };
}
