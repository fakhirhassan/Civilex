"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import type { ScrutinyChecklist, ScrutinyQueueItem, ScrutinyDecision } from "@/types/hearing";

export function useScrutinyQueue() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<ScrutinyQueueItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueue = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("cases")
        .select(`
          id, case_number, title, case_type, status, filing_date,
          plaintiff:profiles!plaintiff_id(id, full_name)
        `)
        .in("status", ["submitted_to_admin", "under_scrutiny"])
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching scrutiny queue:", error);
      } else {
        setQueue((data as unknown as ScrutinyQueueItem[]) || []);
      }
    } catch (err) {
      console.error("Error fetching scrutiny queue:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  return { queue, isLoading, refreshQueue: fetchQueue };
}

export function useScrutiny(caseId: string) {
  const { user } = useAuth();
  const [checklist, setChecklist] = useState<ScrutinyChecklist | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchChecklist = useCallback(async () => {
    if (!user || !caseId) return;

    setIsLoading(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("scrutiny_checklist")
        .select(`
          *,
          reviewer:profiles!reviewed_by(id, full_name)
        `)
        .eq("case_id", caseId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        console.error("Error fetching scrutiny checklist:", error);
      } else {
        setChecklist(data as ScrutinyChecklist | null);
      }
    } catch (err) {
      console.error("Error fetching scrutiny:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, caseId]);

  useEffect(() => {
    fetchChecklist();
  }, [fetchChecklist]);

  const submitScrutiny = async (data: {
    proper_documentation: boolean;
    court_fees_paid: boolean;
    jurisdiction_verified: boolean;
    parties_identified: boolean;
    cause_of_action_valid: boolean;
    limitation_period_checked: boolean;
    proper_format: boolean;
    decision: ScrutinyDecision;
    remarks?: string;
  }) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      // Upsert the scrutiny checklist
      const { error: scrutinyError } = await supabase
        .from("scrutiny_checklist")
        .upsert({
          case_id: caseId,
          reviewed_by: user.id,
          ...data,
          reviewed_at: data.decision !== "pending" ? new Date().toISOString() : null,
        }, { onConflict: "case_id" })
        .select()
        .single();

      // If upsert with onConflict doesn't work (no unique constraint on case_id),
      // do insert instead
      if (scrutinyError) {
        // Try plain insert
        const { error: insertError } = await supabase
          .from("scrutiny_checklist")
          .insert({
            case_id: caseId,
            reviewed_by: user.id,
            ...data,
            reviewed_at: data.decision !== "pending" ? new Date().toISOString() : null,
          });

        if (insertError) return { error: insertError.message };
      }

      // Update case status based on decision
      if (data.decision === "approved") {
        await supabase
          .from("cases")
          .update({
            status: "registered",
            registration_date: new Date().toISOString(),
            admin_court_id: user.id,
          })
          .eq("id", caseId);

        // Log activity
        await supabase.from("case_activity_log").insert({
          case_id: caseId,
          actor_id: user.id,
          action: "scrutiny_approved",
          details: { remarks: data.remarks },
        });

        // Notify case parties
        const { data: caseRow } = await supabase
          .from("cases")
          .select("plaintiff_id, title")
          .eq("id", caseId)
          .single();

        if (caseRow?.plaintiff_id) {
          await supabase.from("notifications").insert({
            user_id: caseRow.plaintiff_id,
            title: "Case Registered",
            message: `Your case "${caseRow.title}" has passed scrutiny and is now registered with the court.`,
            type: "scrutiny_approved",
            reference_type: "case",
            reference_id: caseId,
          });
        }

        // Notify assigned lawyers
        const { data: assignments } = await supabase
          .from("case_assignments")
          .select("lawyer_id")
          .eq("case_id", caseId)
          .eq("status", "accepted");

        if (assignments) {
          for (const a of assignments) {
            await supabase.from("notifications").insert({
              user_id: a.lawyer_id,
              title: "Case Registered",
              message: `Case "${caseRow?.title}" has passed scrutiny and is now registered.`,
              type: "scrutiny_approved",
              reference_type: "case",
              reference_id: caseId,
            });
          }
        }
      } else if (data.decision === "returned") {
        await supabase
          .from("cases")
          .update({ status: "returned_for_revision" })
          .eq("id", caseId);

        // Log activity
        await supabase.from("case_activity_log").insert({
          case_id: caseId,
          actor_id: user.id,
          action: "scrutiny_returned",
          details: { remarks: data.remarks },
        });

        // Notify case parties
        const { data: caseRow } = await supabase
          .from("cases")
          .select("plaintiff_id, title")
          .eq("id", caseId)
          .single();

        if (caseRow?.plaintiff_id) {
          await supabase.from("notifications").insert({
            user_id: caseRow.plaintiff_id,
            title: "Case Returned for Revision",
            message: `Your case "${caseRow.title}" has been returned for revision. Remarks: ${data.remarks || "Please review and resubmit."}`,
            type: "scrutiny_returned",
            reference_type: "case",
            reference_id: caseId,
          });
        }

        // Notify assigned lawyers
        const { data: assignments } = await supabase
          .from("case_assignments")
          .select("lawyer_id")
          .eq("case_id", caseId)
          .eq("status", "accepted");

        if (assignments) {
          for (const a of assignments) {
            await supabase.from("notifications").insert({
              user_id: a.lawyer_id,
              title: "Case Returned for Revision",
              message: `Case "${caseRow?.title}" has been returned. Remarks: ${data.remarks || "Please review."}`,
              type: "scrutiny_returned",
              reference_type: "case",
              reference_id: caseId,
            });
          }
        }
      } else {
        // Pending - just update status to under_scrutiny
        await supabase
          .from("cases")
          .update({ status: "under_scrutiny" })
          .eq("id", caseId)
          .eq("status", "submitted_to_admin");
      }

      await fetchChecklist();
      return { error: null };
    } catch (err) {
      console.error("Error submitting scrutiny:", err);
      return { error: "Failed to submit scrutiny" };
    }
  };

  return {
    checklist,
    isLoading,
    submitScrutiny,
    refreshChecklist: fetchChecklist,
  };
}
