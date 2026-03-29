"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import type { Case, CaseWithRelations, CaseDocument } from "@/types/case";

export function useCases() {
  const { user } = useAuth();
  const [cases, setCases] = useState<CaseWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCases = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const supabase = createClient();

      let query = supabase
        .from("cases")
        .select(`
          *,
          plaintiff:profiles!plaintiff_id(id, full_name, email),
          defendant:profiles!defendant_id(id, full_name, email),
          assignments:case_assignments(
            id, lawyer_id, side, status, fee_amount,
            lawyer:profiles!lawyer_id(id, full_name, email)
          )
        `)
        .order("created_at", { ascending: false });

      // Role-based filtering (RLS handles security, but we optimize queries)
      if (user.role === "client") {
        query = query.or(`plaintiff_id.eq.${user.id},defendant_id.eq.${user.id}`);
      } else if (user.role === "lawyer") {
        // Lawyer sees cases through assignments - RLS handles this
        // But we filter out cases where the lawyer declined the assignment
      } else if (user.role === "admin_court" || user.role === "magistrate") {
        // Only show cases that have been submitted by a lawyer (filed)
        query = query.in("status", [
          "submitted_to_admin",
          "under_scrutiny",
          "returned_for_revision",
          "registered",
          "summon_issued",
          "preliminary_hearing",
          "issues_framed",
          "transferred_to_trial",
          "evidence_stage",
          "arguments",
          "reserved_for_judgment",
          "judgment_delivered",
          "closed",
          "disposed",
        ]);
      }

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching cases:", error);
      } else {
        let filtered = (data as CaseWithRelations[]) || [];

        // For lawyers, exclude cases where they declined the assignment
        if (user.role === "lawyer") {
          filtered = filtered.filter(
            (c) =>
              !c.assignments?.some(
                (a) => a.lawyer_id === user.id && a.status === "declined"
              )
          );
        }

        setCases(filtered);
      }
    } catch (err) {
      console.error("Error fetching cases:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchCases();
  }, [fetchCases]);

  const createCase = async (caseData: {
    case_type: "civil" | "criminal" | "family";
    title: string;
    description: string;
    sensitivity: string;
    lawyer_id?: string;
    criminal_details?: {
      fir_number: string;
      police_station: string;
      offense_description: string;
      offense_section?: string;
      io_name?: string;
      io_contact?: string;
      arrest_date?: string;
    };
  }) => {
    if (!user) return { error: "Not authenticated", data: null };

    try {
      const supabase = createClient();

      // Generate case number
      const { data: caseNumber } = await supabase.rpc("generate_case_number", {
        p_case_type: caseData.case_type,
      });

      // Create the case
      const { data: newCase, error: caseError } = await supabase
        .from("cases")
        .insert({
          case_number: caseNumber || `${caseData.case_type === "civil" ? "CIV" : caseData.case_type === "family" ? "FAM" : "CRM"}-${new Date().getFullYear()}-0001`,
          case_type: caseData.case_type,
          title: caseData.title,
          description: caseData.description,
          sensitivity: caseData.sensitivity,
          plaintiff_id: user.id,
          status: caseData.lawyer_id ? "pending_lawyer_acceptance" : "draft",
          filing_date: new Date().toISOString(),
        })
        .select()
        .single();

      if (caseError) return { error: caseError.message, data: null };

      // If criminal, insert criminal details
      if (caseData.case_type === "criminal" && caseData.criminal_details) {
        const { error: crimError } = await supabase
          .from("criminal_case_details")
          .insert({
            case_id: newCase.id,
            ...caseData.criminal_details,
          });

        if (crimError) {
          console.error("Error creating criminal details:", crimError);
        }
      }

      // If lawyer selected, create assignment
      if (caseData.lawyer_id) {
        const { error: assignError } = await supabase
          .from("case_assignments")
          .insert({
            case_id: newCase.id,
            lawyer_id: caseData.lawyer_id,
            client_id: user.id,
            side: "plaintiff",
            status: "pending",
          });

        if (assignError) {
          console.error("Error creating assignment:", assignError);
        }
      }

      // Log activity
      await supabase.from("case_activity_log").insert({
        case_id: newCase.id,
        actor_id: user.id,
        action: "case_created",
        details: { case_type: caseData.case_type, title: caseData.title },
      });

      // Notify assigned lawyer about new case
      if (caseData.lawyer_id) {
        await supabase.from("notifications").insert({
          user_id: caseData.lawyer_id,
          title: "New Case Assignment",
          message: `You have been assigned to case "${caseData.title}". Please review and respond.`,
          type: "case_assigned",
          reference_type: "case",
          reference_id: newCase.id,
        });
      }

      await fetchCases();
      return { error: null, data: newCase as Case };
    } catch (err) {
      console.error("Error creating case:", err);
      return { error: "Failed to create case", data: null };
    }
  };

  const uploadDocument = async (
    caseId: string,
    file: File,
    documentType: string,
    title: string
  ) => {
    if (!user) return { error: "Not authenticated", data: null };

    try {
      const supabase = createClient();
      const filePath = `${caseId}/${documentType}/${crypto.randomUUID()}_${file.name}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("case-documents")
        .upload(filePath, file);

      if (uploadError) return { error: uploadError.message, data: null };

      // Create document record
      const { data: doc, error: docError } = await supabase
        .from("documents")
        .insert({
          case_id: caseId,
          uploaded_by: user.id,
          document_type: documentType,
          title,
          file_path: filePath,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
        })
        .select()
        .single();

      if (docError) return { error: docError.message, data: null };

      return { error: null, data: doc as CaseDocument };
    } catch (err) {
      console.error("Error uploading document:", err);
      return { error: "Failed to upload document", data: null };
    }
  };

  const acceptCase = async (
    assignmentId: string,
    caseId: string,
    feeAmount: number,
    allowInstallments: boolean,
    installmentCount: number
  ) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      // Update assignment (verify it belongs to this lawyer)
      const { error: assignError } = await supabase
        .from("case_assignments")
        .update({
          status: "accepted",
          fee_amount: feeAmount,
          allow_installments: allowInstallments,
          installment_count: installmentCount,
          responded_at: new Date().toISOString(),
        })
        .eq("id", assignmentId)
        .eq("lawyer_id", user.id);

      if (assignError) return { error: assignError.message };

      // Get plaintiff id for payment
      const { data: caseRow } = await supabase
        .from("cases")
        .select("plaintiff_id")
        .eq("id", caseId)
        .single();

      // Transition case to payment_pending
      // Use .select() to verify the update actually affected a row
      const { data: updatedCase, error: caseError } = await supabase
        .from("cases")
        .update({ status: "payment_pending" })
        .eq("id", caseId)
        .eq("status", "pending_lawyer_acceptance")
        .select("id")
        .maybeSingle();

      if (caseError) return { error: caseError.message };
      if (!updatedCase) return { error: "Failed to update case status. Please try again." };

      // Create payment records
      if (allowInstallments && installmentCount > 1) {
        const installmentAmount = Math.ceil(feeAmount / installmentCount);
        const { data: firstPayment } = await supabase
          .from("payments")
          .insert({
            case_id: caseId,
            payer_id: caseRow?.plaintiff_id,
            receiver_id: user.id,
            amount: installmentAmount,
            payment_type: "lawyer_fee",
            status: "pending",
            is_installment: true,
            installment_number: 1,
            total_installments: installmentCount,
            description: `Lawyer fee installment 1 of ${installmentCount}`,
          })
          .select()
          .single();

        if (firstPayment) {
          for (let i = 2; i <= installmentCount; i++) {
            await supabase.from("payments").insert({
              case_id: caseId,
              payer_id: caseRow?.plaintiff_id,
              receiver_id: user.id,
              amount: i === installmentCount
                ? feeAmount - installmentAmount * (installmentCount - 1)
                : installmentAmount,
              payment_type: "lawyer_fee",
              status: "pending",
              is_installment: true,
              installment_number: i,
              total_installments: installmentCount,
              parent_payment_id: firstPayment.id,
              description: `Lawyer fee installment ${i} of ${installmentCount}`,
            });
          }
        }
      } else {
        await supabase.from("payments").insert({
          case_id: caseId,
          payer_id: caseRow?.plaintiff_id,
          receiver_id: user.id,
          amount: feeAmount,
          payment_type: "lawyer_fee",
          status: "pending",
          description: "Lawyer fee",
        });
      }

      // Log activity
      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "lawyer_accepted",
        details: { fee_amount: feeAmount, allow_installments: allowInstallments },
      });

      // Notify client that lawyer accepted and payment is pending
      if (caseRow?.plaintiff_id) {
        await supabase.from("notifications").insert({
          user_id: caseRow.plaintiff_id,
          title: "Lawyer Accepted Your Case",
          message: `Your lawyer has accepted the case and set a fee of PKR ${feeAmount.toLocaleString()}. Please proceed with payment.`,
          type: "case_accepted",
          reference_type: "case",
          reference_id: caseId,
        });

        await supabase.from("notifications").insert({
          user_id: caseRow.plaintiff_id,
          title: "Payment Pending",
          message: `A payment of PKR ${feeAmount.toLocaleString()} is required for your case to proceed.`,
          type: "payment_pending",
          reference_type: "case",
          reference_id: caseId,
        });
      }

      await fetchCases();
      return { error: null };
    } catch (err) {
      console.error("Error accepting case:", err);
      return { error: "Failed to accept case" };
    }
  };

  const declineCase = async (
    assignmentId: string,
    caseId: string,
    reason: string
  ) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      // Revert case to draft BEFORE updating assignment,
      // because the cases_update_lawyer RLS policy requires an
      // assignment with status != 'declined' for the lawyer to update
      const { error: caseError } = await supabase
        .from("cases")
        .update({ status: "draft" })
        .eq("id", caseId)
        .eq("status", "pending_lawyer_acceptance");

      if (caseError) return { error: caseError.message };

      const { error: assignError } = await supabase
        .from("case_assignments")
        .update({
          status: "declined",
          decline_reason: reason,
          responded_at: new Date().toISOString(),
        })
        .eq("id", assignmentId)
        .eq("lawyer_id", user.id);

      if (assignError) return { error: assignError.message };

      // Log activity
      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "lawyer_declined",
        details: { reason },
      });

      // Get case info for notification
      const { data: declinedCase } = await supabase
        .from("cases")
        .select("plaintiff_id, title")
        .eq("id", caseId)
        .single();

      // Notify client that lawyer declined
      if (declinedCase?.plaintiff_id) {
        await supabase.from("notifications").insert({
          user_id: declinedCase.plaintiff_id,
          title: "Lawyer Declined Your Case",
          message: `The lawyer has declined your case "${declinedCase.title}". Reason: ${reason}. You can assign a different lawyer.`,
          type: "case_declined",
          reference_type: "case",
          reference_id: caseId,
        });
      }

      await fetchCases();
      return { error: null };
    } catch (err) {
      console.error("Error declining case:", err);
      return { error: "Failed to decline case" };
    }
  };

  const submitToAdmin = async (caseId: string) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("cases")
        .update({ status: "submitted_to_admin" })
        .eq("id", caseId)
        .in("status", ["drafting", "returned_for_revision"]);

      if (error) return { error: error.message };

      // Log activity
      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "submitted_to_admin",
        details: {},
      });

      // Notify admin court users
      const { data: adminUsers } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "admin_court");

      const { data: caseRow } = await supabase
        .from("cases")
        .select("title, case_number")
        .eq("id", caseId)
        .single();

      if (adminUsers) {
        for (const admin of adminUsers) {
          await supabase.from("notifications").insert({
            user_id: admin.id,
            title: "New Case for Scrutiny",
            message: `Case "${caseRow?.title}" (${caseRow?.case_number}) has been submitted for scrutiny.`,
            type: "case_status_changed",
            reference_type: "case",
            reference_id: caseId,
          });
        }
      }

      await fetchCases();
      return { error: null };
    } catch (err) {
      console.error("Error submitting to admin:", err);
      return { error: "Failed to submit to admin court" };
    }
  };

  const startDrafting = async (caseId: string) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("cases")
        .update({ status: "drafting" })
        .eq("id", caseId)
        .eq("status", "payment_confirmed");

      if (error) return { error: error.message };

      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "drafting_started",
        details: {},
      });

      await fetchCases();
      return { error: null };
    } catch (err) {
      console.error("Error starting drafting:", err);
      return { error: "Failed to start drafting" };
    }
  };

  const issueSummon = async (caseId: string, defendantName: string) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("cases")
        .update({ status: "summon_issued" })
        .eq("id", caseId)
        .eq("status", "registered");

      if (error) return { error: error.message };

      // Log activity
      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "summon_issued",
        details: { defendant: defendantName },
      });

      // Notify defendant
      const { data: caseRow } = await supabase
        .from("cases")
        .select("defendant_id, title")
        .eq("id", caseId)
        .single();

      if (caseRow?.defendant_id) {
        await supabase.from("notifications").insert({
          user_id: caseRow.defendant_id,
          title: "Court Summon Issued",
          message: `You have been summoned in case "${caseRow.title}". Please respond within the given time.`,
          type: "case_status_changed",
          reference_type: "case",
          reference_id: caseId,
        });
      }

      await fetchCases();
      return { error: null };
    } catch (err) {
      console.error("Error issuing summon:", err);
      return { error: "Failed to issue summon" };
    }
  };

  const updateCriminalDetails = async (
    caseId: string,
    updates: Record<string, unknown>
  ) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("criminal_case_details")
        .update(updates)
        .eq("case_id", caseId);

      if (error) return { error: error.message };

      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "criminal_details_updated",
        details: updates,
      });

      return { error: null };
    } catch (err) {
      console.error("Error updating criminal details:", err);
      return { error: "Failed to update criminal details" };
    }
  };

  const submitChallan = async (caseId: string) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("criminal_case_details")
        .update({
          challan_submitted: true,
          challan_date: new Date().toISOString(),
          investigation_status: "completed",
        })
        .eq("case_id", caseId);

      if (error) return { error: error.message };

      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "challan_submitted",
        details: {},
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
            title: "Challan Submitted",
            message: `Challan has been submitted for case "${caseRow?.title}" (${caseRow?.case_number}). Investigation is complete.`,
            type: "case_status_changed",
            reference_type: "case",
            reference_id: caseId,
          });
        }
      }

      await fetchCases();
      return { error: null };
    } catch (err) {
      console.error("Error submitting challan:", err);
      return { error: "Failed to submit challan" };
    }
  };

  const updateCaseStatus = async (
    caseId: string,
    newStatus: string,
    currentStatus: string
  ) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("cases")
        .update({ status: newStatus })
        .eq("id", caseId)
        .eq("status", currentStatus);

      if (error) return { error: error.message };

      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "status_changed",
        details: { new_status: newStatus, old_status: currentStatus },
      });

      // Notify all parties
      const { data: caseRow } = await supabase
        .from("cases")
        .select("plaintiff_id, defendant_id, title")
        .eq("id", caseId)
        .single();

      const partyIds: string[] = [];
      if (caseRow?.plaintiff_id) partyIds.push(caseRow.plaintiff_id);
      if (caseRow?.defendant_id) partyIds.push(caseRow.defendant_id);

      const { data: assignments } = await supabase
        .from("case_assignments")
        .select("lawyer_id")
        .eq("case_id", caseId)
        .eq("status", "accepted");

      if (assignments) {
        for (const a of assignments) {
          if (!partyIds.includes(a.lawyer_id)) partyIds.push(a.lawyer_id);
        }
      }

      for (const pid of partyIds) {
        if (pid !== user.id) {
          await supabase.from("notifications").insert({
            user_id: pid,
            title: "Case Status Updated",
            message: `Case "${caseRow?.title}" status has been updated to "${newStatus.replace(/_/g, " ")}".`,
            type: "case_status_changed",
            reference_type: "case",
            reference_id: caseId,
          });
        }
      }

      await fetchCases();
      return { error: null };
    } catch (err) {
      console.error("Error updating case status:", err);
      return { error: "Failed to update case status" };
    }
  };

  return {
    cases,
    isLoading,
    fetchCases,
    createCase,
    uploadDocument,
    acceptCase,
    declineCase,
    submitToAdmin,
    startDrafting,
    issueSummon,
    updateCaseStatus,
    updateCriminalDetails,
    submitChallan,
  };
}

export function useCase(caseId: string) {
  const { user } = useAuth();
  const [caseData, setCaseData] = useState<CaseWithRelations | null>(null);
  const [documents, setDocuments] = useState<CaseDocument[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCase = useCallback(async () => {
    if (!user || !caseId) return;

    setIsLoading(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("cases")
        .select(`
          *,
          plaintiff:profiles!plaintiff_id(id, full_name, email),
          defendant:profiles!defendant_id(id, full_name, email),
          assignments:case_assignments(
            id, lawyer_id, client_id, side, status, fee_amount, allow_installments, installment_count, decline_reason, assigned_at, responded_at,
            lawyer:profiles!lawyer_id(id, full_name, email)
          ),
          criminal_details:criminal_case_details(*)
        `)
        .eq("id", caseId)
        .maybeSingle();

      if (error) {
        console.error("Error fetching case:", error.message, error.code);
      } else {
        setCaseData((data as CaseWithRelations) ?? null);
      }

      // Fetch documents
      const { data: docs, error: docsError } = await supabase
        .from("documents")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (docsError) {
        console.error("Error fetching documents:", docsError.message, docsError.code);
      }
      setDocuments((docs as CaseDocument[]) || []);
    } catch (err) {
      console.error("Error fetching case:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, caseId]);

  useEffect(() => {
    fetchCase();
  }, [fetchCase]);

  return {
    caseData,
    documents,
    isLoading,
    refreshCase: fetchCase,
  };
}
