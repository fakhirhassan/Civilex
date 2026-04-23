"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import type {
  DecreeWithRelations,
  DecreeType,
  DecreeStatus,
} from "@/types/trial";

interface DrawUpDecreeInput {
  decree_type: DecreeType;
  operative_text: string;
  relief_granted?: string | null;
  amount_awarded?: number | null;
  costs_awarded?: number | null;
  interest_terms?: string | null;
  compliance_period_days?: number | null;
  decree_holder_id?: string | null;
  judgment_debtor_id?: string | null;
  judgment_id?: string | null;
  decree_number?: string | null;
}

export function useDecree(caseId: string) {
  const { user } = useAuth();
  const [decree, setDecree] = useState<DecreeWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetch = useCallback(async () => {
    if (!caseId) return;
    setIsLoading(true);
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("decrees")
        .select(`
          *,
          decree_holder:profiles!decree_holder_id(id, full_name),
          judgment_debtor:profiles!judgment_debtor_id(id, full_name),
          drawn_up_by_profile:profiles!drawn_up_by(id, full_name),
          signed_by_profile:profiles!signed_by(id, full_name)
        `)
        .eq("case_id", caseId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching decree:", error);
        setDecree(null);
      } else {
        setDecree((data as DecreeWithRelations | null) ?? null);
      }
    } finally {
      setIsLoading(false);
    }
  }, [caseId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const drawUpDecree = async (input: DrawUpDecreeInput) => {
    if (!user) return { error: "Not authenticated" };
    if (!input.operative_text.trim())
      return { error: "Operative text is required" };

    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from("decrees")
        .insert({
          case_id: caseId,
          decree_type: input.decree_type,
          operative_text: input.operative_text.trim(),
          relief_granted: input.relief_granted?.trim() || null,
          amount_awarded: input.amount_awarded ?? null,
          costs_awarded: input.costs_awarded ?? null,
          interest_terms: input.interest_terms?.trim() || null,
          compliance_period_days: input.compliance_period_days ?? null,
          decree_holder_id: input.decree_holder_id ?? null,
          judgment_debtor_id: input.judgment_debtor_id ?? null,
          judgment_id: input.judgment_id ?? null,
          decree_number: input.decree_number?.trim() || null,
          drawn_up_by: user.id,
          drawn_up_at: new Date().toISOString(),
        })
        .select()
        .maybeSingle();

      if (error) return { error: error.message };
      if (!data) return { error: "Decree could not be created" };

      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "decree_drawn_up",
        details: { decree_id: data.id, decree_type: input.decree_type },
      });

      await fetch();
      return { error: null };
    } catch (err) {
      console.error("Error drawing up decree:", err);
      return { error: "Failed to draw up decree" };
    }
  };

  const updateDecree = async (
    decreeId: string,
    updates: Partial<DrawUpDecreeInput>
  ) => {
    if (!user) return { error: "Not authenticated" };
    try {
      const supabase = createClient();
      const payload: Record<string, unknown> = {};
      if (updates.decree_type !== undefined)
        payload.decree_type = updates.decree_type;
      if (updates.operative_text !== undefined)
        payload.operative_text = updates.operative_text.trim();
      if (updates.relief_granted !== undefined)
        payload.relief_granted = updates.relief_granted?.trim() || null;
      if (updates.amount_awarded !== undefined)
        payload.amount_awarded = updates.amount_awarded;
      if (updates.costs_awarded !== undefined)
        payload.costs_awarded = updates.costs_awarded;
      if (updates.interest_terms !== undefined)
        payload.interest_terms = updates.interest_terms?.trim() || null;
      if (updates.compliance_period_days !== undefined)
        payload.compliance_period_days = updates.compliance_period_days;
      if (updates.decree_number !== undefined)
        payload.decree_number = updates.decree_number?.trim() || null;

      payload.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from("decrees")
        .update(payload)
        .eq("id", decreeId)
        .eq("status", "drafted");

      if (error) return { error: error.message };
      await fetch();
      return { error: null };
    } catch (err) {
      console.error("Error updating decree:", err);
      return { error: "Failed to update decree" };
    }
  };

  const signDecree = async (decreeId: string) => {
    if (!user) return { error: "Not authenticated" };
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("decrees")
        .update({
          status: "signed",
          signed_by: user.id,
          signed_at: new Date().toISOString(),
        })
        .eq("id", decreeId)
        .eq("status", "drafted");

      if (error) return { error: error.message };

      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "decree_signed",
        details: { decree_id: decreeId },
      });

      await fetch();
      return { error: null };
    } catch (err) {
      console.error("Error signing decree:", err);
      return { error: "Failed to sign decree" };
    }
  };

  const updateStatus = async (decreeId: string, status: DecreeStatus) => {
    if (!user) return { error: "Not authenticated" };
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("decrees")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("id", decreeId);

      if (error) return { error: error.message };

      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "decree_status_updated",
        details: { decree_id: decreeId, status },
      });

      await fetch();
      return { error: null };
    } catch (err) {
      console.error("Error updating decree status:", err);
      return { error: "Failed to update decree status" };
    }
  };

  return {
    decree,
    isLoading,
    drawUpDecree,
    updateDecree,
    signDecree,
    updateStatus,
    refresh: fetch,
  };
}
