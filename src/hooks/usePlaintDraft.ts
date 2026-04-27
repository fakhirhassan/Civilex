"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import type {
  PlaintDraft,
  PlaintDraftSavePayload,
  PlaintFact,
} from "@/types/draft";

export function usePlaintDraft(caseId: string) {
  const { user } = useAuth();
  const [draft, setDraft] = useState<PlaintDraft | null>(null);
  const [loading, setLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!caseId) return;
    setLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("case_drafts")
        .select("*")
        .eq("case_id", caseId)
        .maybeSingle();
      if (error) {
        console.error("Error loading draft:", error);
        setDraft(null);
      } else {
        setDraft(data as PlaintDraft | null);
      }
    } finally {
      setLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const ensureDraft = async (): Promise<PlaintDraft | null> => {
    if (!user) return null;
    if (draft) return draft;
    const supabase = createClient();
    const { data, error } = await supabase
      .from("case_drafts")
      .insert({ case_id: caseId, created_by: user.id })
      .select()
      .single();
    if (error) {
      console.error("Error creating draft:", error);
      return null;
    }
    setDraft(data as PlaintDraft);
    return data as PlaintDraft;
  };

  const saveDraft = async (payload: PlaintDraftSavePayload) => {
    if (!user) return { error: "Not authenticated" };
    const existing = await ensureDraft();
    if (!existing) return { error: "Could not create draft" };

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("case_drafts")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .in("status", ["in_progress", "returned"])
        .select()
        .maybeSingle();
      if (error) return { error: error.message };
      if (!data) return { error: "Draft is locked (already submitted)" };
      setDraft(data as PlaintDraft);
      return { error: null };
    } catch (err) {
      console.error("Error saving draft:", err);
      return { error: "Failed to save draft" };
    }
  };

  const submitDraft = async () => {
    if (!user) return { error: "Not authenticated" };
    if (!draft) return { error: "No draft to submit" };
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("case_drafts")
        .update({
          status: "submitted",
          submitted_at: new Date().toISOString(),
          revision_notes: null,
        })
        .eq("id", draft.id)
        .in("status", ["in_progress", "returned"])
        .select()
        .maybeSingle();
      if (error) return { error: error.message };
      if (!data) return { error: "Draft could not be submitted" };
      setDraft(data as PlaintDraft);
      return { error: null };
    } catch (err) {
      console.error("Error submitting draft:", err);
      return { error: "Failed to submit draft" };
    }
  };

  const returnDraft = async (notes: string) => {
    if (!user) return { error: "Not authenticated" };
    if (!draft) return { error: "No draft to return" };
    if (!notes.trim()) return { error: "Revision notes are required" };
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("case_drafts")
        .update({
          status: "returned",
          revision_notes: notes.trim(),
        })
        .eq("id", draft.id)
        .eq("status", "submitted")
        .select()
        .maybeSingle();
      if (error) return { error: error.message };
      if (!data) return { error: "Draft is not in a returnable state" };
      setDraft(data as PlaintDraft);
      return { error: null };
    } catch (err) {
      console.error("Error returning draft:", err);
      return { error: "Failed to return draft" };
    }
  };

  const approveDraft = async () => {
    if (!user) return { error: "Not authenticated" };
    if (!draft) return { error: "No draft to approve" };
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("case_drafts")
        .update({
          status: "approved",
          approved_at: new Date().toISOString(),
        })
        .eq("id", draft.id)
        .eq("status", "submitted")
        .select()
        .maybeSingle();
      if (error) return { error: error.message };
      if (!data) return { error: "Draft is not in an approvable state" };
      setDraft(data as PlaintDraft);
      return { error: null };
    } catch (err) {
      console.error("Error approving draft:", err);
      return { error: "Failed to approve draft" };
    }
  };

  const addFact = async () => {
    if (!draft) await ensureDraft();
    const current = draft?.facts ?? [];
    const next: PlaintFact[] = [
      ...current,
      { number: current.length + 1, text: "" },
    ];
    return saveDraft({ facts: next });
  };

  const updateFact = async (index: number, text: string) => {
    if (!draft) return { error: "No draft loaded" };
    const next = draft.facts.map((f, i) => (i === index ? { ...f, text } : f));
    return saveDraft({ facts: next });
  };

  const removeFact = async (index: number) => {
    if (!draft) return { error: "No draft loaded" };
    const next = draft.facts
      .filter((_, i) => i !== index)
      .map((f, i) => ({ ...f, number: i + 1 }));
    return saveDraft({ facts: next });
  };

  return {
    draft,
    loading,
    refresh: fetch,
    ensureDraft,
    saveDraft,
    submitDraft,
    returnDraft,
    approveDraft,
    addFact,
    updateFact,
    removeFact,
  };
}
