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
    case_category: string;
    title: string;
    description: string;
    sensitivity: string;
    lawyer_id?: string;
    // Plaintiff
    plaintiff_name: string;
    plaintiff_phone: string;
    plaintiff_cnic: string;
    plaintiff_address: string;
    // Defendant
    defendant_name: string;
    defendant_email?: string;
    defendant_phone?: string;
    defendant_cnic?: string;
    defendant_address?: string;
    // Family-specific
    marriage_certificate_number?: string;
    // Criminal
    criminal_details?: {
      fir_number: string;
      police_station: string;
      offense_description: string;
      offense_section?: string;
      io_name?: string;
      io_contact?: string;
      arrest_date?: string;
      evidence_type: "oral" | "documentary";
    };
  }) => {
    if (!user) return { error: "Not authenticated", data: null };

    try {
      const supabase = createClient();

      // Generate case number (DB function handles family/civil/criminal + race lock)
      const { data: caseNumber, error: caseNumberError } = await supabase.rpc(
        "generate_case_number",
        { p_case_type: caseData.case_type }
      );

      if (caseNumberError || !caseNumber) {
        return { error: "Failed to generate case number. Please try again.", data: null };
      }

      // Create the case
      const { data: newCase, error: caseError } = await supabase
        .from("cases")
        .insert({
          case_number: caseNumber,
          case_type: caseData.case_type,
          case_category: caseData.case_category,
          title: caseData.title,
          description: caseData.description,
          sensitivity: caseData.sensitivity,
          plaintiff_id: user.id,
          plaintiff_name: caseData.plaintiff_name,
          plaintiff_phone: caseData.plaintiff_phone,
          plaintiff_cnic: caseData.plaintiff_cnic,
          plaintiff_address: caseData.plaintiff_address,
          defendant_name: caseData.defendant_name,
          defendant_email: caseData.defendant_email || null,
          defendant_phone: caseData.defendant_phone || null,
          defendant_cnic: caseData.defendant_cnic || null,
          defendant_address: caseData.defendant_address || null,
          marriage_certificate_number:
            caseData.marriage_certificate_number || null,
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
            fir_number: caseData.criminal_details.fir_number,
            police_station: caseData.criminal_details.police_station,
            offense_description: caseData.criminal_details.offense_description,
            offense_section: caseData.criminal_details.offense_section || null,
            io_name: caseData.criminal_details.io_name || null,
            io_contact: caseData.criminal_details.io_contact || null,
            arrest_date: caseData.criminal_details.arrest_date || null,
            evidence_type: caseData.criminal_details.evidence_type,
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
        details: {
          case_type: caseData.case_type,
          case_category: caseData.case_category,
          title: caseData.title,
        },
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
    title: string,
    description?: string
  ) => {
    if (!user) return { error: "Not authenticated", data: null };

    try {
      const supabase = createClient();
      // Sanitise file name: replace spaces so storage doesn't reject it
      const safeName = file.name.replace(/\s+/g, "_");
      const filePath = `${caseId}/${documentType}/${crypto.randomUUID()}_${safeName}`;

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
          description: description?.trim() || null,
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

  const deleteDocument = async (documentId: string, filePath: string) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      // Delete from storage (best-effort; DB record is the source of truth)
      const { error: storageError } = await supabase.storage
        .from("case-documents")
        .remove([filePath]);

      if (storageError) {
        console.error("Error deleting file from storage:", storageError.message);
      }

      // Admin court can delete any document; others only their own uploads
      const isAdmin = user.role === "admin_court";
      let query = supabase.from("documents").delete().eq("id", documentId);
      if (!isAdmin) query = query.eq("uploaded_by", user.id);

      const { error: docError } = await query;
      if (docError) return { error: docError.message };

      return { error: null };
    } catch (err) {
      console.error("Error deleting document:", err);
      return { error: "Failed to delete document" };
    }
  };

  /** Get a short-lived signed URL so private storage files can be downloaded / previewed. */
  const getDocumentUrl = async (filePath: string): Promise<string | null> => {
    try {
      const supabase = createClient();
      const { data, error } = await supabase.storage
        .from("case-documents")
        .createSignedUrl(filePath, 60 * 5); // 5-minute URL
      if (error || !data) return null;
      return data.signedUrl;
    } catch {
      return null;
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

      // Get the assignment to determine side and client_id
      const { data: assignment, error: fetchAssignError } = await supabase
        .from("case_assignments")
        .select("id, side, client_id")
        .eq("id", assignmentId)
        .eq("lawyer_id", user.id)
        .single();

      if (fetchAssignError || !assignment) return { error: "Assignment not found or does not belong to you" };

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

      const isDefendantSide = assignment.side === "defendant";
      const payerId = isDefendantSide ? assignment.client_id : null;

      // Only transition case status for plaintiff-side assignments
      if (!isDefendantSide) {
        // Transition case to payment_pending
        const { data: updatedCase, error: caseError } = await supabase
          .from("cases")
          .update({ status: "payment_pending" })
          .eq("id", caseId)
          .eq("status", "pending_lawyer_acceptance")
          .select("id")
          .maybeSingle();

        if (caseError) return { error: caseError.message };
        if (!updatedCase) return { error: "Failed to update case status. Please try again." };
      }

      // Get plaintiff_id for plaintiff-side payment, or use assignment client_id for defendant side
      const { data: caseRow } = await supabase
        .from("cases")
        .select("plaintiff_id, title")
        .eq("id", caseId)
        .single();

      const actualPayerId = isDefendantSide ? payerId : caseRow?.plaintiff_id;

      // Create payment records
      if (allowInstallments && installmentCount > 1) {
        const installmentAmount = Math.ceil(feeAmount / installmentCount);
        const { data: firstPayment } = await supabase
          .from("payments")
          .insert({
            case_id: caseId,
            payer_id: actualPayerId,
            receiver_id: user.id,
            amount: installmentAmount,
            payment_type: "lawyer_fee",
            status: "pending",
            is_installment: true,
            installment_number: 1,
            total_installments: installmentCount,
            description: `Lawyer fee installment 1 of ${installmentCount} (${isDefendantSide ? "defendant" : "plaintiff"} side)`,
          })
          .select()
          .single();

        if (firstPayment) {
          for (let i = 2; i <= installmentCount; i++) {
            await supabase.from("payments").insert({
              case_id: caseId,
              payer_id: actualPayerId,
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
              description: `Lawyer fee installment ${i} of ${installmentCount} (${isDefendantSide ? "defendant" : "plaintiff"} side)`,
            });
          }
        }
      } else {
        await supabase.from("payments").insert({
          case_id: caseId,
          payer_id: actualPayerId,
          receiver_id: user.id,
          amount: feeAmount,
          payment_type: "lawyer_fee",
          status: "pending",
          description: `Lawyer fee (${isDefendantSide ? "defendant" : "plaintiff"} side)`,
        });
      }

      // Log activity
      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "lawyer_accepted",
        details: { fee_amount: feeAmount, allow_installments: allowInstallments, side: assignment.side },
      });

      // Notify the client (defendant or plaintiff) that lawyer accepted
      if (actualPayerId) {
        await supabase.from("notifications").insert({
          user_id: actualPayerId,
          title: "Lawyer Accepted Your Case",
          message: `Your lawyer has accepted the case "${caseRow?.title}" and set a fee of PKR ${feeAmount.toLocaleString()}. Please proceed with payment.`,
          type: "case_accepted",
          reference_type: "case",
          reference_id: caseId,
        });

        await supabase.from("notifications").insert({
          user_id: actualPayerId,
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

      // Fetch assignment to know the side
      const { data: decliningAssignment } = await supabase
        .from("case_assignments")
        .select("side, client_id")
        .eq("id", assignmentId)
        .eq("lawyer_id", user.id)
        .single();

      const isDecliningDefendantSide = decliningAssignment?.side === "defendant";

      // Only revert case status for plaintiff-side assignments
      if (!isDecliningDefendantSide) {
        // Revert case to draft BEFORE updating assignment,
        // because the cases_update_lawyer RLS policy requires an
        // assignment with status != 'declined' for the lawyer to update
        const { error: caseError } = await supabase
          .from("cases")
          .update({ status: "draft" })
          .eq("id", caseId)
          .eq("status", "pending_lawyer_acceptance");

        if (caseError) return { error: caseError.message };
      }

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
        details: { reason, side: decliningAssignment?.side },
      });

      // Get case info for notification
      const { data: declinedCase } = await supabase
        .from("cases")
        .select("plaintiff_id, title")
        .eq("id", caseId)
        .single();

      // Notify the correct client (defendant or plaintiff)
      const notifyUserId = isDecliningDefendantSide
        ? decliningAssignment?.client_id
        : declinedCase?.plaintiff_id;

      if (notifyUserId) {
        await supabase.from("notifications").insert({
          user_id: notifyUserId,
          title: "Lawyer Declined Your Case",
          message: `The lawyer has declined your case "${declinedCase?.title}". Reason: ${reason}. You can request a different lawyer.`,
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

  const issueSummon = async (caseId: string) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const res = await fetch("/api/summon/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case_id: caseId }),
      });

      const data = await res.json();

      if (!res.ok) return { error: data.error || "Failed to issue summon" };

      await fetchCases();
      return { error: null, data };
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

  /**
   * Defendant requests a lawyer for their side of the case.
   * Creates a case_assignment with side='defendant' and status='pending'.
   */
  const requestDefendantLawyer = async (caseId: string, lawyerId: string) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      // Verify the case exists and this user is the defendant
      const { data: caseRow, error: caseError } = await supabase
        .from("cases")
        .select("id, title, case_number, defendant_id, plaintiff_id")
        .eq("id", caseId)
        .single();

      if (caseError || !caseRow) return { error: "Case not found" };
      if (caseRow.defendant_id !== user.id) return { error: "You are not the defendant in this case" };

      // Check no active (non-declined) defendant assignment already exists for this lawyer
      const { data: existing } = await supabase
        .from("case_assignments")
        .select("id, status")
        .eq("case_id", caseId)
        .eq("side", "defendant")
        .neq("status", "declined");

      if (existing && existing.length > 0) {
        return { error: "You already have an active lawyer request for this case. Wait for a response or request another after a decline." };
      }

      // Create the assignment
      const { error: assignError } = await supabase
        .from("case_assignments")
        .insert({
          case_id: caseId,
          lawyer_id: lawyerId,
          client_id: user.id,
          side: "defendant",
          status: "pending",
        });

      if (assignError) return { error: assignError.message };

      // Log activity
      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "defendant_lawyer_requested",
        details: { lawyer_id: lawyerId },
      });

      // Notify the lawyer
      await supabase.from("notifications").insert({
        user_id: lawyerId,
        title: "New Case Request (Defendant Side)",
        message: `You have a new case assignment request for case "${caseRow.title}" (${caseRow.case_number}). The client is the defendant and needs representation.`,
        type: "case_assigned",
        reference_type: "case",
        reference_id: caseId,
      });

      await fetchCases();
      return { error: null };
    } catch (err) {
      console.error("Error requesting defendant lawyer:", err);
      return { error: "Failed to request lawyer" };
    }
  };

  /**
   * Client-initiated withdrawal of a case that was declined by the lawyer
   * (or is still in draft). Sets status to "disposed" so it's archived rather
   * than hard-deleted (preserves audit trail).
   */
  const withdrawCase = async (caseId: string) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      // Only allow withdrawal for cases the user owns that are in draft or
      // had a declined lawyer assignment (pending_lawyer_acceptance with all declined)
      const { data: updated, error } = await supabase
        .from("cases")
        .update({ status: "disposed" })
        .eq("id", caseId)
        .eq("plaintiff_id", user.id)
        .in("status", ["draft", "pending_lawyer_acceptance"])
        .select("id")
        .maybeSingle();

      if (error) return { error: error.message };
      if (!updated) return { error: "Could not remove case. You may not have permission, or the case is no longer in a removable state." };

      await supabase.from("case_activity_log").insert({
        case_id: caseId,
        actor_id: user.id,
        action: "status_changed",
        details: { new_status: "disposed", old_status: "withdrawn_by_client" },
      });

      await fetchCases();
      return { error: null };
    } catch (err) {
      console.error("Error withdrawing case:", err);
      return { error: "Failed to withdraw case" };
    }
  };

  return {
    cases,
    isLoading,
    fetchCases,
    createCase,
    uploadDocument,
    deleteDocument,
    getDocumentUrl,
    acceptCase,
    declineCase,
    withdrawCase,
    requestDefendantLawyer,
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
          trial_judge:profiles!trial_judge_id(id, full_name, email),
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

      // Fetch documents with uploader name for display
      const { data: docs, error: docsError } = await supabase
        .from("documents")
        .select("*, uploader:profiles!uploaded_by(id, full_name, email)")
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
