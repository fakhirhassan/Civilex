"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import type { HearingTranscript } from "@/types/hearing";

export function useHearingTranscript(hearingId: string, caseId: string) {
  const { user } = useAuth();
  const [transcript, setTranscript] = useState<HearingTranscript | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTranscript = useCallback(async () => {
    if (!user || !hearingId) return;
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("hearing_transcripts")
        .select(`
          *,
          stenographer:profiles!stenographer_id(id, full_name, email)
        `)
        .eq("hearing_id", hearingId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching transcript:", error);
      } else {
        setTranscript((data as HearingTranscript) ?? null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user, hearingId]);

  useEffect(() => {
    fetchTranscript();
  }, [fetchTranscript]);

  const wordCount = (text: string) =>
    text.trim() ? text.trim().split(/\s+/).length : 0;

  /** Create or update the transcript's text. No-ops if already signed. */
  const saveTranscript = async (text: string) => {
    if (!user) return { error: "Not authenticated" };
    if (transcript?.status === "signed") {
      return { error: "Transcript is signed and cannot be edited." };
    }

    try {
      const supabase = createClient();

      if (transcript) {
        const { error } = await supabase
          .from("hearing_transcripts")
          .update({
            transcript_text: text,
            word_count: wordCount(text),
          })
          .eq("id", transcript.id);
        if (error) return { error: error.message };
      } else {
        const { error } = await supabase
          .from("hearing_transcripts")
          .insert({
            hearing_id: hearingId,
            case_id: caseId,
            stenographer_id: user.id,
            transcript_text: text,
            word_count: wordCount(text),
            status: "draft",
          });
        if (error) return { error: error.message };
      }

      await fetchTranscript();
      return { error: null };
    } catch (err) {
      console.error("Error saving transcript:", err);
      return { error: "Failed to save transcript" };
    }
  };

  /** Lock the transcript — no more edits after this. */
  const signTranscript = async () => {
    if (!user) return { error: "Not authenticated" };
    if (!transcript) return { error: "No transcript to sign" };
    if (transcript.status === "signed") return { error: "Already signed" };
    if (!transcript.transcript_text.trim()) {
      return { error: "Cannot sign an empty transcript" };
    }

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("hearing_transcripts")
        .update({
          status: "signed",
          signed_at: new Date().toISOString(),
        })
        .eq("id", transcript.id)
        .eq("status", "draft")
        .select("id")
        .maybeSingle();

      if (error) return { error: error.message };
      if (!data) return { error: "Failed to sign — transcript state may have changed" };

      // Log + notify judge / parties
      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "transcript_signed",
        details: { hearing_id: hearingId, transcript_id: transcript.id },
      });

      const { data: caseRow } = await supabase
        .from("cases")
        .select("title, trial_judge_id, plaintiff_id, defendant_id")
        .eq("id", caseId)
        .single();

      if (caseRow?.trial_judge_id && caseRow.trial_judge_id !== user.id) {
        await supabase.from("notifications").insert({
          user_id: caseRow.trial_judge_id,
          title: "Hearing Transcript Signed",
          message: `The stenographer has signed the transcript for a hearing in "${caseRow.title}". It is now part of the official record.`,
          type: "case_status_changed",
          reference_type: "case",
          reference_id: caseId,
        });
      }

      await fetchTranscript();
      return { error: null };
    } catch (err) {
      console.error("Error signing transcript:", err);
      return { error: "Failed to sign transcript" };
    }
  };

  return {
    transcript,
    isLoading,
    saveTranscript,
    signTranscript,
    refresh: fetchTranscript,
  };
}
