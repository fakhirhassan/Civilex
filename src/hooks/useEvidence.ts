"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type {
  EvidenceRecordWithRelations,
  EvidenceStatus,
  WitnessSide,
} from "@/types/trial";

interface SubmitEvidenceData {
  exhibit_number?: string;
  evidence_type: string;
  description: string;
  submitted_by_side: WitnessSide;
  document_id?: string;
}

export function useEvidence(caseId: string) {
  const [evidence, setEvidence] = useState<EvidenceRecordWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEvidence = useCallback(async () => {
    if (!caseId) return;
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("evidence_records")
        .select(
          `*,
          submitted_by_profile:profiles!evidence_records_submitted_by_fkey(full_name),
          document:documents!evidence_records_document_id_fkey(title, file_name, file_path)`
        )
        .eq("case_id", caseId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching evidence:", error);
        setEvidence([]);
      } else {
        setEvidence((data as unknown as EvidenceRecordWithRelations[]) || []);
      }
    } catch (err) {
      console.error("Error fetching evidence:", err);
      setEvidence([]);
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetchEvidence();
  }, [fetchEvidence]);

  const submitEvidence = useCallback(
    async (data: SubmitEvidenceData) => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return { error: "Not authenticated" };

        const { error } = await supabase.from("evidence_records").insert({
          case_id: caseId,
          submitted_by: user.id,
          ...data,
        });

        if (error) return { error: error.message };

        await supabase.from("case_activity_log").insert({
          case_id: caseId,
          actor_id: user.id,
          action: "evidence_submitted",
          details: {
            evidence_type: data.evidence_type,
            exhibit_number: data.exhibit_number,
            description: data.description,
          },
        });

        await fetchEvidence();
        return { error: null };
      } catch {
        return { error: "Failed to submit evidence" };
      }
    },
    [caseId, fetchEvidence]
  );

  const updateEvidenceStatus = useCallback(
    async (
      evidenceId: string,
      status: EvidenceStatus,
      remarks?: string
    ) => {
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return { error: "Not authenticated" };

        const updateData: Record<string, unknown> = { status };
        if (status === "admitted" || status === "marked") {
          updateData.admission_date = new Date().toISOString().split("T")[0];
        }
        if (remarks) {
          if (status === "objected" || status === "rejected") {
            updateData.objection_remarks = remarks;
          } else {
            updateData.court_remarks = remarks;
          }
        }

        const { error } = await supabase
          .from("evidence_records")
          .update(updateData)
          .eq("id", evidenceId);

        if (error) return { error: error.message };

        await supabase.from("case_activity_log").insert({
          case_id: caseId,
          actor_id: user.id,
          action: "evidence_status_updated",
          details: { evidence_id: evidenceId, status, remarks },
        });

        await fetchEvidence();
        return { error: null };
      } catch {
        return { error: "Failed to update evidence status" };
      }
    },
    [caseId, fetchEvidence]
  );

  return {
    evidence,
    isLoading,
    submitEvidence,
    updateEvidenceStatus,
    fetchEvidence,
  };
}
