"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import type { Hearing, HearingTranscript } from "@/types/hearing";

export interface StenoHearingRow {
  hearing: Hearing & {
    case?: { id: string; case_number: string; title: string; status: string };
    presiding_officer?: { id: string; full_name: string } | null;
  };
  transcript: HearingTranscript | null;
}

/**
 * Aggregates hearings + transcripts for the logged-in stenographer.
 * Only returns data for cases where this user is the assigned stenographer.
 */
export function useStenographerWorkload() {
  const { user } = useAuth();
  const [rows, setRows] = useState<StenoHearingRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const supabase = createClient();

      // Cases assigned to this stenographer
      const { data: cases } = await supabase
        .from("cases")
        .select("id")
        .eq("stenographer_id", user.id);

      const caseIds = (cases ?? []).map((c) => c.id);
      if (caseIds.length === 0) {
        setRows([]);
        return;
      }

      // Hearings for those cases
      const { data: hearings } = await supabase
        .from("hearings")
        .select(`
          *,
          case:cases!case_id(id, case_number, title, status),
          presiding_officer:profiles!presiding_officer_id(id, full_name)
        `)
        .in("case_id", caseIds)
        .order("scheduled_date", { ascending: false });

      const hearingList = hearings ?? [];

      // Transcripts for these hearings
      const hearingIds = hearingList.map((h: { id: string }) => h.id);
      const { data: transcripts } = hearingIds.length
        ? await supabase
            .from("hearing_transcripts")
            .select("*")
            .in("hearing_id", hearingIds)
        : { data: [] };

      const transcriptMap = new Map<string, HearingTranscript>();
      for (const t of (transcripts ?? []) as HearingTranscript[]) {
        transcriptMap.set(t.hearing_id, t);
      }

      setRows(
        hearingList.map((h) => ({
          hearing: h as StenoHearingRow["hearing"],
          transcript: transcriptMap.get(h.id) ?? null,
        }))
      );
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { rows, isLoading, refresh: fetch };
}
