"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import type { JudgeDraft } from "@/types/case";

export function useJudgeDrafts(caseId: string) {
  const { user } = useAuth();
  const [drafts, setDrafts] = useState<JudgeDraft[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchDrafts = useCallback(async () => {
    if (!user || !caseId) return;

    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("judge_drafts")
        .select("*")
        .eq("case_id", caseId)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error fetching judge drafts:", error);
      } else {
        setDrafts((data as JudgeDraft[]) || []);
      }
    } catch (err) {
      console.error("Error fetching judge drafts:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, caseId]);

  useEffect(() => {
    fetchDrafts();
  }, [fetchDrafts]);

  const createDraft = async (data: {
    title: string;
    content: string;
    hearing_id?: string | null;
  }) => {
    if (!user) return { error: "Not authenticated", draft: null };

    try {
      const supabase = createClient();
      const { data: inserted, error } = await supabase
        .from("judge_drafts")
        .insert({
          case_id: caseId,
          judge_id: user.id,
          title: data.title,
          content: data.content,
          hearing_id: data.hearing_id || null,
        })
        .select()
        .single();

      if (error) return { error: error.message, draft: null };

      await fetchDrafts();
      return { error: null, draft: inserted as JudgeDraft };
    } catch (err) {
      console.error("Error creating draft:", err);
      return { error: "Failed to create draft", draft: null };
    }
  };

  const updateDraft = async (
    draftId: string,
    data: { title?: string; content?: string; hearing_id?: string | null }
  ) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("judge_drafts")
        .update(data)
        .eq("id", draftId)
        .eq("judge_id", user.id)
        .eq("is_published", false);

      if (error) return { error: error.message };

      await fetchDrafts();
      return { error: null };
    } catch (err) {
      console.error("Error updating draft:", err);
      return { error: "Failed to update draft" };
    }
  };

  const deleteDraft = async (draftId: string) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("judge_drafts")
        .delete()
        .eq("id", draftId)
        .eq("judge_id", user.id)
        .eq("is_published", false);

      if (error) return { error: error.message };

      await fetchDrafts();
      return { error: null };
    } catch (err) {
      console.error("Error deleting draft:", err);
      return { error: "Failed to delete draft" };
    }
  };

  /**
   * Publish a draft: creates a court_order document record (no actual file upload —
   * the draft content is stored in the description field) and marks the draft published.
   * After publishing, the draft becomes read-only and is visible to all case parties
   * via the normal documents table (subject to existing document RLS).
   */
  const publishDraft = async (draftId: string) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      // Fetch the draft to get its content
      const { data: draft, error: fetchError } = await supabase
        .from("judge_drafts")
        .select("*")
        .eq("id", draftId)
        .eq("judge_id", user.id)
        .eq("is_published", false)
        .single();

      if (fetchError || !draft) return { error: "Draft not found or already published" };

      // Fetch judge's profile for attribution
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();

      const judgeName = profile?.full_name ?? "Judge";

      // Insert into documents table as a court_order
      // The file_path is a sentinel so queries don't break — no actual file exists.
      const { data: doc, error: docError } = await supabase
        .from("documents")
        .insert({
          case_id: caseId,
          uploaded_by: user.id,
          document_type: "court_order",
          title: draft.title,
          description: `Published by ${judgeName}.\n\n${draft.content}`,
          file_path: `judge-drafts/${caseId}/${draftId}.txt`,
          file_name: `${draft.title}.txt`,
          file_size: new Blob([draft.content]).size,
          mime_type: "text/plain",
        })
        .select()
        .single();

      if (docError) return { error: docError.message };

      // Mark the draft as published
      const { error: updateError } = await supabase
        .from("judge_drafts")
        .update({
          is_published: true,
          published_at: new Date().toISOString(),
          published_document_id: doc.id,
        })
        .eq("id", draftId)
        .eq("judge_id", user.id);

      if (updateError) return { error: updateError.message };

      // Notify case parties that a court order has been uploaded
      const { data: caseRow } = await supabase
        .from("cases")
        .select("title, case_number, plaintiff_id, defendant_id")
        .eq("id", caseId)
        .single();

      if (caseRow) {
        const recipients = [caseRow.plaintiff_id, caseRow.defendant_id].filter(
          (id): id is string => !!id && id !== user.id
        );

        // Also notify assigned lawyers
        const { data: assignments } = await supabase
          .from("case_assignments")
          .select("lawyer_id")
          .eq("case_id", caseId)
          .eq("status", "accepted");

        if (assignments) {
          for (const a of assignments) {
            if (a.lawyer_id !== user.id) recipients.push(a.lawyer_id);
          }
        }

        const uniqueRecipients = [...new Set(recipients)];
        for (const uid of uniqueRecipients) {
          await supabase.from("notifications").insert({
            user_id: uid,
            title: "Court Order Published",
            message: `${judgeName} has published a court order: "${draft.title}" for case "${caseRow.title}" (${caseRow.case_number}).`,
            type: "document_uploaded",
            reference_type: "case",
            reference_id: caseId,
          });
        }
      }

      await fetchDrafts();
      return { error: null };
    } catch (err) {
      console.error("Error publishing draft:", err);
      return { error: "Failed to publish draft" };
    }
  };

  return {
    drafts,
    isLoading,
    createDraft,
    updateDraft,
    deleteDraft,
    publishDraft,
    refreshDrafts: fetchDrafts,
  };
}
