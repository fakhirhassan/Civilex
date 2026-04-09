"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";

export interface DocumentRequest {
  id: string;
  case_id: string;
  requested_by: string;
  requested_from: string;
  document_type: string;
  title: string;
  description: string | null;
  status: "pending" | "fulfilled" | "cancelled";
  fulfilled_at: string | null;
  created_at: string;
  requester?: { full_name: string; email: string };
  recipient?: { full_name: string; email: string };
}

export function useDocumentRequests(caseId: string) {
  const { user } = useAuth();
  const [requests, setRequests] = useState<DocumentRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!user || !caseId) return;

    setIsLoading(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("document_requests")
        .select(`
          *,
          requester:profiles!requested_by(full_name, email),
          recipient:profiles!requested_from(full_name, email)
        `)
        .eq("case_id", caseId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching document requests:", error);
      } else {
        setRequests((data as DocumentRequest[]) || []);
      }
    } catch (err) {
      console.error("Error fetching document requests:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user, caseId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const createRequest = async (data: {
    requested_from: string;
    document_type: string;
    title: string;
    description?: string;
  }) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("document_requests")
        .insert({
          case_id: caseId,
          requested_by: user.id,
          requested_from: data.requested_from,
          document_type: data.document_type,
          title: data.title,
          description: data.description || null,
        });

      if (error) return { error: error.message };

      // Notify the recipient
      const { data: caseRow } = await supabase
        .from("cases")
        .select("title, case_number")
        .eq("id", caseId)
        .single();

      await supabase.from("notifications").insert({
        user_id: data.requested_from,
        title: "Document Requested",
        message: `Your lawyer has requested a document: "${data.title}" for case "${caseRow?.title}" (${caseRow?.case_number}). Please upload it as soon as possible.`,
        type: "document_requested",
        reference_type: "case",
        reference_id: caseId,
      });

      await fetchRequests();
      return { error: null };
    } catch (err) {
      console.error("Error creating document request:", err);
      return { error: "Failed to create document request" };
    }
  };

  const fulfillRequest = async (requestId: string) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("document_requests")
        .update({
          status: "fulfilled",
          fulfilled_at: new Date().toISOString(),
        })
        .eq("id", requestId)
        .eq("requested_from", user.id);

      if (error) return { error: error.message };

      await fetchRequests();
      return { error: null };
    } catch (err) {
      console.error("Error fulfilling document request:", err);
      return { error: "Failed to mark as fulfilled" };
    }
  };

  const cancelRequest = async (requestId: string) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      const { error } = await supabase
        .from("document_requests")
        .update({ status: "cancelled" })
        .eq("id", requestId)
        .eq("requested_by", user.id);

      if (error) return { error: error.message };

      await fetchRequests();
      return { error: null };
    } catch (err) {
      console.error("Error cancelling document request:", err);
      return { error: "Failed to cancel request" };
    }
  };

  // Pending requests addressed to the current user
  const pendingForMe = requests.filter(
    (r) => r.requested_from === user?.id && r.status === "pending"
  );

  return {
    requests,
    pendingForMe,
    isLoading,
    createRequest,
    fulfillRequest,
    cancelRequest,
    refreshRequests: fetchRequests,
  };
}
