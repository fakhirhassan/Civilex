"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import type {
  ExecutionApplicationWithRelations,
  ExecutionMode,
  ExecutionStatus,
  WarrantType,
  WarrantStatus,
} from "@/types/trial";

interface FileExecutionInput {
  decree_id: string;
  execution_mode: ExecutionMode;
  decree_holder_id: string;
  judgment_debtor_id: string;
  decretal_amount?: number | null;
  property_description?: string | null;
  property_location?: string | null;
  grounds: string;
  relief_sought: string;
  execution_number?: string | null;
}

interface IssueWarrantInput {
  execution_id: string;
  warrant_type: WarrantType;
  directions: string;
  returnable_by?: string | null;
  bailiff_name?: string | null;
  warrant_number?: string | null;
}

interface RecordSatisfactionInput {
  status: Extract<ExecutionStatus, "satisfied" | "partially_satisfied">;
  amount_recovered?: number | null;
  satisfaction_note?: string | null;
}

export function useExecution(caseId: string) {
  const { user } = useAuth();
  const [applications, setApplications] = useState<
    ExecutionApplicationWithRelations[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!caseId) return;
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("execution_applications")
        .select(`
          *,
          decree_holder:profiles!decree_holder_id(id, full_name),
          judgment_debtor:profiles!judgment_debtor_id(id, full_name),
          filed_by_profile:profiles!filed_by(id, full_name),
          warrants:execution_warrants(
            *,
            issued_by_profile:profiles!issued_by(id, full_name)
          )
        `)
        .eq("case_id", caseId)
        .order("filed_on", { ascending: false });

      if (error) {
        console.error("Error fetching execution applications:", error);
        setApplications([]);
      } else {
        setApplications(
          (data as ExecutionApplicationWithRelations[]) ?? []
        );
      }
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const fileExecution = async (input: FileExecutionInput) => {
    if (!user) return { error: "Not authenticated" };
    if (!input.grounds.trim()) return { error: "Grounds are required" };
    if (!input.relief_sought.trim())
      return { error: "Relief sought is required" };

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("execution_applications")
        .insert({
          case_id: caseId,
          decree_id: input.decree_id,
          execution_number: input.execution_number?.trim() || null,
          execution_mode: input.execution_mode,
          decree_holder_id: input.decree_holder_id,
          judgment_debtor_id: input.judgment_debtor_id,
          decretal_amount: input.decretal_amount ?? null,
          property_description: input.property_description?.trim() || null,
          property_location: input.property_location?.trim() || null,
          grounds: input.grounds.trim(),
          relief_sought: input.relief_sought.trim(),
          filed_by: user.id,
        })
        .select()
        .maybeSingle();

      if (error) return { error: error.message };
      if (!data) return { error: "Execution could not be filed" };

      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "execution_filed",
        details: {
          execution_id: data.id,
          mode: input.execution_mode,
        },
      });

      await fetch();
      return { error: null, executionId: data.id as string };
    } catch (err) {
      console.error("Error filing execution:", err);
      return { error: "Failed to file execution" };
    }
  };

  const issueNotice = async (executionId: string) => {
    if (!user) return { error: "Not authenticated" };
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("execution_applications")
        .update({
          status: "notice_issued",
          notice_issued_at: new Date().toISOString(),
          presiding_officer_id: user.id,
        })
        .eq("id", executionId)
        .eq("status", "filed");

      if (error) return { error: error.message };

      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "execution_notice_issued",
        details: { execution_id: executionId },
      });

      await fetch();
      return { error: null };
    } catch (err) {
      console.error("Error issuing notice:", err);
      return { error: "Failed to issue notice" };
    }
  };

  const orderAttachment = async (executionId: string) => {
    if (!user) return { error: "Not authenticated" };
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("execution_applications")
        .update({
          status: "attachment_ordered",
          attachment_ordered_at: new Date().toISOString(),
          presiding_officer_id: user.id,
        })
        .eq("id", executionId)
        .in("status", ["filed", "notice_issued"]);

      if (error) return { error: error.message };

      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "attachment_ordered",
        details: { execution_id: executionId },
      });

      await fetch();
      return { error: null };
    } catch (err) {
      console.error("Error ordering attachment:", err);
      return { error: "Failed to order attachment" };
    }
  };

  const updateStatus = async (
    executionId: string,
    newStatus: ExecutionStatus
  ) => {
    if (!user) return { error: "Not authenticated" };
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("execution_applications")
        .update({ status: newStatus })
        .eq("id", executionId);

      if (error) return { error: error.message };

      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "execution_status_changed",
        details: { execution_id: executionId, status: newStatus },
      });

      await fetch();
      return { error: null };
    } catch (err) {
      console.error("Error updating execution status:", err);
      return { error: "Failed to update status" };
    }
  };

  const recordSatisfaction = async (
    executionId: string,
    input: RecordSatisfactionInput
  ) => {
    if (!user) return { error: "Not authenticated" };
    try {
      const supabase = createClient();
      const payload: Record<string, unknown> = {
        status: input.status,
        satisfaction_note: input.satisfaction_note?.trim() || null,
      };
      if (input.status === "satisfied") {
        payload.satisfied_at = new Date().toISOString();
      }
      if (input.amount_recovered !== undefined && input.amount_recovered !== null) {
        payload.amount_recovered = input.amount_recovered;
      }

      const { error } = await supabase
        .from("execution_applications")
        .update(payload)
        .eq("id", executionId);

      if (error) return { error: error.message };

      // If fully satisfied, update decree status too
      if (input.status === "satisfied") {
        const { data: app } = await supabase
          .from("execution_applications")
          .select("decree_id")
          .eq("id", executionId)
          .maybeSingle();
        if (app?.decree_id) {
          await supabase
            .from("decrees")
            .update({ status: "satisfied" })
            .eq("id", app.decree_id);
        }
      }

      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "execution_satisfaction_recorded",
        details: {
          execution_id: executionId,
          status: input.status,
          amount_recovered: input.amount_recovered ?? null,
        },
      });

      await fetch();
      return { error: null };
    } catch (err) {
      console.error("Error recording satisfaction:", err);
      return { error: "Failed to record satisfaction" };
    }
  };

  const issueWarrant = async (input: IssueWarrantInput) => {
    if (!user) return { error: "Not authenticated" };
    if (!input.directions.trim())
      return { error: "Warrant directions are required" };

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("execution_warrants")
        .insert({
          execution_id: input.execution_id,
          warrant_number: input.warrant_number?.trim() || null,
          warrant_type: input.warrant_type,
          directions: input.directions.trim(),
          returnable_by: input.returnable_by || null,
          bailiff_name: input.bailiff_name?.trim() || null,
          issued_by: user.id,
        })
        .select()
        .maybeSingle();

      if (error) return { error: error.message };
      if (!data) return { error: "Warrant could not be issued" };

      await supabase
        .from("execution_applications")
        .update({ status: "warrant_issued" })
        .eq("id", input.execution_id)
        .in("status", [
          "filed",
          "notice_issued",
          "attachment_ordered",
          "property_attached",
          "sale_ordered",
        ]);

      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "warrant_issued",
        details: {
          execution_id: input.execution_id,
          warrant_id: data.id,
          warrant_type: input.warrant_type,
        },
      });

      await fetch();
      return { error: null, warrantId: data.id as string };
    } catch (err) {
      console.error("Error issuing warrant:", err);
      return { error: "Failed to issue warrant" };
    }
  };

  const updateWarrantStatus = async (
    warrantId: string,
    newStatus: WarrantStatus,
    returnNote?: string
  ) => {
    if (!user) return { error: "Not authenticated" };
    try {
      const supabase = createClient();
      const payload: Record<string, unknown> = { status: newStatus };
      if (
        newStatus === "served" ||
        newStatus === "returned_executed" ||
        newStatus === "returned_unexecuted"
      ) {
        payload.served_on = new Date().toISOString().slice(0, 10);
      }
      if (returnNote !== undefined) {
        payload.return_note = returnNote.trim() || null;
      }

      const { error } = await supabase
        .from("execution_warrants")
        .update(payload)
        .eq("id", warrantId);

      if (error) return { error: error.message };

      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "warrant_status_changed",
        details: { warrant_id: warrantId, status: newStatus },
      });

      await fetch();
      return { error: null };
    } catch (err) {
      console.error("Error updating warrant:", err);
      return { error: "Failed to update warrant" };
    }
  };

  return {
    applications,
    isLoading,
    fileExecution,
    issueNotice,
    orderAttachment,
    updateStatus,
    recordSatisfaction,
    issueWarrant,
    updateWarrantStatus,
    refresh: fetch,
  };
}
