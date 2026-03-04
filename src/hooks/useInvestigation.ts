"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import type {
  InvestigationReport,
  InvestigationReportWithRelations,
  InvestigationReportType,
  InvestigationStatus,
} from "@/types/criminal";

export function useInvestigation(caseId: string) {
  const { user } = useAuth();
  const [reports, setReports] = useState<InvestigationReportWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchReports = useCallback(async () => {
    if (!user || !caseId) return;

    setIsLoading(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("investigation_reports")
        .select(`
          *,
          submitter:profiles!submitted_by(id, full_name),
          reviewer:profiles!reviewed_by(id, full_name)
        `)
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching investigation reports:", error);
      } else {
        setReports((data as unknown as InvestigationReportWithRelations[]) || []);
      }
    } catch (err) {
      console.error("Error fetching investigation reports:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, caseId]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const submitReport = async (data: {
    report_type: InvestigationReportType;
    report_text: string;
    findings?: string;
    recommendations?: string;
    evidence_collected?: string;
  }) => {
    if (!user) return { error: "Not authenticated", data: null };

    try {
      const supabase = createClient();

      const { data: report, error } = await supabase
        .from("investigation_reports")
        .insert({
          case_id: caseId,
          submitted_by: user.id,
          report_type: data.report_type,
          report_text: data.report_text,
          findings: data.findings || null,
          recommendations: data.recommendations || null,
          evidence_collected: data.evidence_collected || null,
          status: "submitted",
        })
        .select()
        .single();

      if (error) return { error: error.message, data: null };

      // Update investigation status in criminal_case_details
      await supabase
        .from("criminal_case_details")
        .update({
          investigation_status: data.report_type === "final" ? "completed" : "report_submitted",
        })
        .eq("case_id", caseId);

      // Log activity
      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "investigation_report_submitted",
        details: { report_type: data.report_type },
      });

      // Notify magistrate
      const { data: magistrates } = await supabase
        .from("profiles")
        .select("id")
        .in("role", ["magistrate", "admin_court"]);

      const { data: caseRow } = await supabase
        .from("cases")
        .select("title, case_number")
        .eq("id", caseId)
        .single();

      if (magistrates) {
        for (const m of magistrates) {
          await supabase.from("notifications").insert({
            user_id: m.id,
            title: "Investigation Report Submitted",
            message: `A ${data.report_type} investigation report has been submitted for case "${caseRow?.title}" (${caseRow?.case_number}).`,
            type: "case_status_changed",
            reference_type: "case",
            reference_id: caseId,
          });
        }
      }

      await fetchReports();
      return { error: null, data: report as InvestigationReport };
    } catch (err) {
      console.error("Error submitting investigation report:", err);
      return { error: "Failed to submit report", data: null };
    }
  };

  const reviewReport = async (
    reportId: string,
    decision: "accepted" | "returned",
    remarks: string
  ) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("investigation_reports")
        .update({
          status: decision,
          reviewed_by: user.id,
          review_remarks: remarks,
        })
        .eq("id", reportId);

      if (error) return { error: error.message };

      // Log activity
      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: `investigation_report_${decision}`,
        details: { report_id: reportId, remarks },
      });

      // Notify submitter
      const { data: report } = await supabase
        .from("investigation_reports")
        .select("submitted_by")
        .eq("id", reportId)
        .single();

      if (report?.submitted_by) {
        await supabase.from("notifications").insert({
          user_id: report.submitted_by,
          title: `Investigation Report ${decision === "accepted" ? "Accepted" : "Returned"}`,
          message: `Your investigation report has been ${decision}. ${remarks}`,
          type: "case_status_changed",
          reference_type: "case",
          reference_id: caseId,
        });
      }

      await fetchReports();
      return { error: null };
    } catch (err) {
      console.error("Error reviewing report:", err);
      return { error: "Failed to review report" };
    }
  };

  const updateInvestigationStatus = async (status: InvestigationStatus) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("criminal_case_details")
        .update({ investigation_status: status })
        .eq("case_id", caseId);

      if (error) return { error: error.message };

      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "investigation_status_updated",
        details: { new_status: status },
      });

      return { error: null };
    } catch (err) {
      console.error("Error updating investigation status:", err);
      return { error: "Failed to update status" };
    }
  };

  return {
    reports,
    isLoading,
    fetchReports,
    submitReport,
    reviewReport,
    updateInvestigationStatus,
  };
}
