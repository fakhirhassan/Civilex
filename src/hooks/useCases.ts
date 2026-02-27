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
          plaintiff:profiles!cases_plaintiff_id_fkey(id, full_name, email),
          defendant:profiles!cases_defendant_id_fkey(id, full_name, email),
          assignments:case_assignments(
            id, lawyer_id, side, status, fee_amount,
            lawyer:profiles!case_assignments_lawyer_id_fkey(id, full_name, email)
          )
        `)
        .order("created_at", { ascending: false });

      // Role-based filtering (RLS handles security, but we optimize queries)
      if (user.role === "client") {
        query = query.or(`plaintiff_id.eq.${user.id},defendant_id.eq.${user.id}`);
      } else if (user.role === "lawyer") {
        // Lawyer sees cases through assignments - RLS handles this
        // We rely on RLS policy for lawyers
      }
      // Court officials see all - handled by RLS

      const { data, error } = await query;

      if (error) {
        console.error("Error fetching cases:", error);
      } else {
        setCases((data as CaseWithRelations[]) || []);
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
    case_type: "civil" | "criminal";
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
          case_number: caseNumber || `${caseData.case_type === "civil" ? "CIV" : "CRM"}-${new Date().getFullYear()}-0001`,
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

  return {
    cases,
    isLoading,
    fetchCases,
    createCase,
    uploadDocument,
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
          plaintiff:profiles!cases_plaintiff_id_fkey(id, full_name, email),
          defendant:profiles!cases_defendant_id_fkey(id, full_name, email),
          assignments:case_assignments(
            id, lawyer_id, client_id, side, status, fee_amount, allow_installments, installment_count, decline_reason, assigned_at, responded_at,
            lawyer:profiles!case_assignments_lawyer_id_fkey(id, full_name, email)
          ),
          criminal_details:criminal_case_details(*)
        `)
        .eq("id", caseId)
        .single();

      if (error) {
        console.error("Error fetching case:", error);
      } else {
        setCaseData(data as CaseWithRelations);
      }

      // Fetch documents
      const { data: docs } = await supabase
        .from("documents")
        .select("*")
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

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
