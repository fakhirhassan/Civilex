"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  WitnessRecord,
  WitnessRecordWithRelations,
  WitnessStatus,
  WitnessSide,
} from "@/types/trial";

interface AddWitnessData {
  witness_name: string;
  witness_cnic?: string;
  witness_contact?: string;
  witness_address?: string;
  witness_side: WitnessSide;
  relation_to_case?: string;
}

interface ExamineWitnessData {
  statement?: string;
  cross_examination?: string;
  re_examination?: string;
  judge_notes?: string;
  status?: WitnessStatus;
  hearing_id?: string;
  examination_date?: string;
}

export function useWitnesses(caseId: string) {
  const [witnesses, setWitnesses] = useState<WitnessRecordWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchWitnesses = useCallback(async () => {
    if (!caseId) return;
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("witness_records")
        .select(
          `*,
          added_by_profile:profiles!added_by(full_name),
          hearing:hearings!hearing_id(hearing_number, scheduled_date)`
        )
        .eq("case_id", caseId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching witnesses:", error);
        setWitnesses([]);
      } else {
        setWitnesses((data as unknown as WitnessRecordWithRelations[]) || []);
      }
    } catch (err) {
      console.error("Error fetching witnesses:", err);
      setWitnesses([]);
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchWitnesses();
  }, [fetchWitnesses]);

  const addWitness = useCallback(
    async (data: AddWitnessData) => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return { error: "Not authenticated" };

        const { error } = await supabase.from("witness_records").insert({
          case_id: caseId,
          ...data,
          added_by: user.id,
        });

        if (error) return { error: error.message };

        // Log activity
        await supabase.from("case_activity_log").insert({
          case_id: caseId,
          actor_id: user.id,
          action: "witness_added",
          details: { witness_name: data.witness_name, side: data.witness_side },
        });

        await fetchWitnesses();
        return { error: null };
      } catch {
        return { error: "Failed to add witness" };
      }
    },
    [caseId, fetchWitnesses]
  );

  const updateWitness = useCallback(
    async (witnessId: string, data: ExamineWitnessData) => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return { error: "Not authenticated" };

        const { error } = await supabase
          .from("witness_records")
          .update(data)
          .eq("id", witnessId);

        if (error) return { error: error.message };

        if (data.status) {
          await supabase.from("case_activity_log").insert({
            case_id: caseId,
            actor_id: user.id,
            action: "witness_status_updated",
            details: { witness_id: witnessId, status: data.status },
          });
        }

        await fetchWitnesses();
        return { error: null };
      } catch {
        return { error: "Failed to update witness" };
      }
    },
    [caseId, fetchWitnesses]
  );

  const summonWitness = useCallback(
    async (witnessId: string) => {
      return updateWitness(witnessId, { status: "summoned" });
    },
    [updateWitness]
  );

  return {
    witnesses,
    isLoading,
    addWitness,
    updateWitness,
    summonWitness,
    fetchWitnesses,
  };
}
