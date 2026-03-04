"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import type {
  BailApplication,
  BailApplicationWithRelations,
  BailApplicationType,
  BailStatus,
} from "@/types/criminal";

export function useBailApplications(caseId: string) {
  const { user } = useAuth();
  const [applications, setApplications] = useState<BailApplicationWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchApplications = useCallback(async () => {
    if (!user || !caseId) return;

    setIsLoading(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("bail_applications")
        .select(`
          *,
          applicant:profiles!applicant_id(id, full_name, email),
          lawyer:profiles!lawyer_id(id, full_name),
          decided_by_profile:profiles!decided_by(id, full_name)
        `)
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching bail applications:", error);
      } else {
        setApplications((data as unknown as BailApplicationWithRelations[]) || []);
      }
    } catch (err) {
      console.error("Error fetching bail applications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, caseId]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  const createApplication = async (data: {
    application_type: BailApplicationType;
    grounds: string;
    surety_details?: string;
    surety_amount?: number;
  }) => {
    if (!user) return { error: "Not authenticated", data: null };

    try {
      const supabase = createClient();

      // Get case data for the lawyer assignment
      const { data: assignments } = await supabase
        .from("case_assignments")
        .select("lawyer_id")
        .eq("case_id", caseId)
        .eq("status", "accepted")
        .limit(1)
        .maybeSingle();

      const { data: app, error } = await supabase
        .from("bail_applications")
        .insert({
          case_id: caseId,
          applicant_id: user.id,
          lawyer_id: assignments?.lawyer_id || null,
          application_type: data.application_type,
          grounds: data.grounds,
          surety_details: data.surety_details || null,
          surety_amount: data.surety_amount || null,
          status: "pending",
        })
        .select()
        .single();

      if (error) return { error: error.message, data: null };

      // Update criminal_case_details bail_status
      await supabase
        .from("criminal_case_details")
        .update({ bail_status: "applied" })
        .eq("case_id", caseId);

      // Log activity
      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "bail_application_filed",
        details: { application_type: data.application_type },
      });

      // Notify magistrate/court officials
      const { data: courtOfficials } = await supabase
        .from("profiles")
        .select("id")
        .in("role", ["magistrate", "admin_court"]);

      const { data: caseRow } = await supabase
        .from("cases")
        .select("title, case_number")
        .eq("id", caseId)
        .single();

      if (courtOfficials) {
        for (const official of courtOfficials) {
          await supabase.from("notifications").insert({
            user_id: official.id,
            title: "Bail Application Filed",
            message: `A ${data.application_type.replace(/_/g, " ")} bail application has been filed for case "${caseRow?.title}" (${caseRow?.case_number}).`,
            type: "case_status_changed",
            reference_type: "case",
            reference_id: caseId,
          });
        }
      }

      await fetchApplications();
      return { error: null, data: app as BailApplication };
    } catch (err) {
      console.error("Error creating bail application:", err);
      return { error: "Failed to file bail application", data: null };
    }
  };

  const decideBail = async (
    applicationId: string,
    decision: "granted" | "denied",
    remarks: string,
    conditions?: string,
    suretyAmount?: number
  ) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("bail_applications")
        .update({
          status: decision,
          decision_date: new Date().toISOString(),
          decision_remarks: remarks,
          decided_by: user.id,
          conditions: conditions || null,
          surety_amount: suretyAmount || null,
        })
        .eq("id", applicationId);

      if (error) return { error: error.message };

      // Update criminal_case_details bail_status
      await supabase
        .from("criminal_case_details")
        .update({ bail_status: decision })
        .eq("case_id", caseId);

      // Log activity
      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: `bail_${decision}`,
        details: { application_id: applicationId, remarks },
      });

      // Notify applicant and lawyers
      const { data: app } = await supabase
        .from("bail_applications")
        .select("applicant_id, lawyer_id")
        .eq("id", applicationId)
        .single();

      const { data: caseRow } = await supabase
        .from("cases")
        .select("title")
        .eq("id", caseId)
        .single();

      const notifyIds: string[] = [];
      if (app?.applicant_id) notifyIds.push(app.applicant_id);
      if (app?.lawyer_id && !notifyIds.includes(app.lawyer_id)) notifyIds.push(app.lawyer_id);

      for (const pid of notifyIds) {
        await supabase.from("notifications").insert({
          user_id: pid,
          title: `Bail ${decision === "granted" ? "Granted" : "Denied"}`,
          message: `Bail has been ${decision} for case "${caseRow?.title}". ${remarks}`,
          type: "case_status_changed",
          reference_type: "case",
          reference_id: caseId,
        });
      }

      await fetchApplications();
      return { error: null };
    } catch (err) {
      console.error("Error deciding bail:", err);
      return { error: "Failed to process bail decision" };
    }
  };

  return {
    applications,
    isLoading,
    fetchApplications,
    createApplication,
    decideBail,
  };
}
