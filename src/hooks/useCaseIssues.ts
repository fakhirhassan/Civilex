"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import type { CaseIssue, IssueType, IssueFinding } from "@/types/hearing";

export function useCaseIssues(caseId: string) {
  const { user } = useAuth();
  const [issues, setIssues] = useState<CaseIssue[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user || !caseId) return;
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("case_issues")
        .select(`
          *,
          framer:profiles!framed_by(id, full_name),
          decider:profiles!decided_by(id, full_name)
        `)
        .eq("case_id", caseId)
        .order("issue_number", { ascending: true });

      if (error) {
        console.error("Error fetching issues:", error);
        setIssues([]);
      } else {
        setIssues((data as CaseIssue[]) ?? []);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, caseId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const addIssue = async (input: {
    issue_text: string;
    issue_type: IssueType;
    burden_of_proof?: string | null;
  }) => {
    if (!user) return { error: "Not authenticated" };
    if (!input.issue_text.trim()) return { error: "Issue text is required" };

    try {
      const supabase = createClient();
      const nextNumber =
        issues.length > 0
          ? Math.max(...issues.map((i) => i.issue_number)) + 1
          : 1;

      const { error } = await supabase.from("case_issues").insert({
        case_id: caseId,
        issue_number: nextNumber,
        issue_text: input.issue_text.trim(),
        issue_type: input.issue_type,
        burden_of_proof: input.burden_of_proof?.trim() || null,
        framed_by: user.id,
        framed_at: new Date().toISOString(),
      });

      if (error) return { error: error.message };

      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "issue_framed",
        details: { issue_number: nextNumber },
      });

      await fetch();
      return { error: null };
    } catch (err) {
      console.error("Error adding issue:", err);
      return { error: "Failed to add issue" };
    }
  };

  const updateIssue = async (
    issueId: string,
    updates: {
      issue_text?: string;
      issue_type?: IssueType;
      burden_of_proof?: string | null;
    }
  ) => {
    if (!user) return { error: "Not authenticated" };
    try {
      const supabase = createClient();
      const payload: Record<string, unknown> = {};
      if (updates.issue_text !== undefined)
        payload.issue_text = updates.issue_text.trim();
      if (updates.issue_type !== undefined)
        payload.issue_type = updates.issue_type;
      if (updates.burden_of_proof !== undefined)
        payload.burden_of_proof = updates.burden_of_proof?.trim() || null;

      const { error } = await supabase
        .from("case_issues")
        .update(payload)
        .eq("id", issueId);

      if (error) return { error: error.message };
      await fetch();
      return { error: null };
    } catch (err) {
      console.error("Error updating issue:", err);
      return { error: "Failed to update issue" };
    }
  };

  const deleteIssue = async (issueId: string) => {
    if (!user) return { error: "Not authenticated" };
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("case_issues")
        .delete()
        .eq("id", issueId);

      if (error) return { error: error.message };
      await fetch();
      return { error: null };
    } catch (err) {
      console.error("Error deleting issue:", err);
      return { error: "Failed to delete issue" };
    }
  };

  const recordFinding = async (
    issueId: string,
    finding: IssueFinding,
    findingText: string
  ) => {
    if (!user) return { error: "Not authenticated" };
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("case_issues")
        .update({
          finding,
          finding_text: findingText.trim() || null,
          decided_by: user.id,
          decided_at: new Date().toISOString(),
        })
        .eq("id", issueId);

      if (error) return { error: error.message };
      await fetch();
      return { error: null };
    } catch (err) {
      console.error("Error recording finding:", err);
      return { error: "Failed to record finding" };
    }
  };

  return {
    issues,
    isLoading,
    addIssue,
    updateIssue,
    deleteIssue,
    recordFinding,
    refresh: fetch,
  };
}
