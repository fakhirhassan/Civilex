"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import type {
  AppealWithRelations,
  AppealForum,
  AppealSide,
  AppealStatus,
} from "@/types/trial";

interface FileAppealInput {
  appellate_forum: AppealForum;
  appellant_side: AppealSide;
  appellant_id: string;
  respondent_id?: string | null;
  judgment_date: string;
  limitation_days: number;
  filed_on?: string;
  condonation_requested?: boolean;
  condonation_reason?: string | null;
  grounds_of_appeal: string;
  relief_sought: string;
  appeal_number?: string | null;
  decree_id?: string | null;
  judgment_id?: string | null;
}

interface DisposeAppealInput {
  status: Extract<AppealStatus, "allowed" | "dismissed" | "withdrawn" | "rejected" | "time_barred">;
  disposal_reason?: string | null;
}

export function useAppeals(caseId: string) {
  const { user } = useAuth();
  const [appeals, setAppeals] = useState<AppealWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!caseId) return;
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("appeals")
        .select(`
          *,
          appellant:profiles!appellant_id(id, full_name),
          respondent:profiles!respondent_id(id, full_name),
          filed_by_profile:profiles!filed_by(id, full_name),
          admitted_by_profile:profiles!admitted_by(id, full_name)
        `)
        .eq("case_id", caseId)
        .order("filed_on", { ascending: false });

      if (error) {
        console.error("Error fetching appeals:", error);
        setAppeals([]);
      } else {
        setAppeals((data as AppealWithRelations[]) ?? []);
      }
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const fileAppeal = async (input: FileAppealInput) => {
    if (!user) return { error: "Not authenticated" };
    if (!input.grounds_of_appeal.trim())
      return { error: "Grounds of appeal are required" };
    if (!input.relief_sought.trim())
      return { error: "Relief sought is required" };

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("appeals")
        .insert({
          case_id: caseId,
          decree_id: input.decree_id ?? null,
          judgment_id: input.judgment_id ?? null,
          appeal_number: input.appeal_number?.trim() || null,
          appellate_forum: input.appellate_forum,
          appellant_side: input.appellant_side,
          appellant_id: input.appellant_id,
          respondent_id: input.respondent_id ?? null,
          judgment_date: input.judgment_date,
          limitation_days: input.limitation_days,
          filed_on: input.filed_on ?? new Date().toISOString().slice(0, 10),
          condonation_requested: input.condonation_requested ?? false,
          condonation_reason: input.condonation_reason?.trim() || null,
          grounds_of_appeal: input.grounds_of_appeal.trim(),
          relief_sought: input.relief_sought.trim(),
          filed_by: user.id,
        })
        .select()
        .maybeSingle();

      if (error) return { error: error.message };
      if (!data) return { error: "Appeal could not be filed" };

      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "appeal_filed",
        details: {
          appeal_id: data.id,
          forum: input.appellate_forum,
          side: input.appellant_side,
        },
      });

      await fetch();
      return { error: null, appealId: data.id as string };
    } catch (err) {
      console.error("Error filing appeal:", err);
      return { error: "Failed to file appeal" };
    }
  };

  const admitAppeal = async (appealId: string) => {
    if (!user) return { error: "Not authenticated" };
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("appeals")
        .update({
          status: "admitted",
          admitted_at: new Date().toISOString(),
          admitted_by: user.id,
        })
        .eq("id", appealId)
        .eq("status", "filed");

      if (error) return { error: error.message };

      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "appeal_admitted",
        details: { appeal_id: appealId },
      });

      await fetch();
      return { error: null };
    } catch (err) {
      console.error("Error admitting appeal:", err);
      return { error: "Failed to admit appeal" };
    }
  };

  const disposeAppeal = async (appealId: string, input: DisposeAppealInput) => {
    if (!user) return { error: "Not authenticated" };
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("appeals")
        .update({
          status: input.status,
          disposal_date: new Date().toISOString(),
          disposal_reason: input.disposal_reason?.trim() || null,
        })
        .eq("id", appealId);

      if (error) return { error: error.message };

      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "appeal_disposed",
        details: { appeal_id: appealId, status: input.status },
      });

      await fetch();
      return { error: null };
    } catch (err) {
      console.error("Error disposing appeal:", err);
      return { error: "Failed to dispose appeal" };
    }
  };

  const updateAppeal = async (
    appealId: string,
    updates: Partial<FileAppealInput>
  ) => {
    if (!user) return { error: "Not authenticated" };
    try {
      const supabase = createClient();
      const payload: Record<string, unknown> = {};
      if (updates.grounds_of_appeal !== undefined)
        payload.grounds_of_appeal = updates.grounds_of_appeal.trim();
      if (updates.relief_sought !== undefined)
        payload.relief_sought = updates.relief_sought.trim();
      if (updates.appellate_forum !== undefined)
        payload.appellate_forum = updates.appellate_forum;
      if (updates.limitation_days !== undefined)
        payload.limitation_days = updates.limitation_days;
      if (updates.condonation_requested !== undefined)
        payload.condonation_requested = updates.condonation_requested;
      if (updates.condonation_reason !== undefined)
        payload.condonation_reason = updates.condonation_reason?.trim() || null;
      if (updates.appeal_number !== undefined)
        payload.appeal_number = updates.appeal_number?.trim() || null;

      payload.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from("appeals")
        .update(payload)
        .eq("id", appealId)
        .eq("status", "filed");

      if (error) return { error: error.message };
      await fetch();
      return { error: null };
    } catch (err) {
      console.error("Error updating appeal:", err);
      return { error: "Failed to update appeal" };
    }
  };

  return {
    appeals,
    isLoading,
    fileAppeal,
    admitAppeal,
    disposeAppeal,
    updateAppeal,
    refresh: fetch,
  };
}
