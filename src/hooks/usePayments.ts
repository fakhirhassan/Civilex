"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "./useAuth";
import type { PaymentWithRelations, PaymentMethod } from "@/types/payment";

export function usePayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<PaymentWithRelations[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchPayments = useCallback(async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const supabase = createClient();

      const { data, error } = await supabase
        .from("payments")
        .select(`
          *,
          case:cases(id, case_number, title),
          payer:profiles!payer_id(id, full_name, email),
          receiver:profiles!receiver_id(id, full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching payments:", error);
      } else {
        setPayments((data as PaymentWithRelations[]) || []);
      }
    } catch (err) {
      console.error("Error fetching payments:", err);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const createPayment = async (data: {
    case_id: string;
    receiver_id: string;
    amount: number;
    payment_type: string;
    payment_method: PaymentMethod;
    description?: string;
    is_installment?: boolean;
    installment_number?: number;
    total_installments?: number;
    parent_payment_id?: string;
  }) => {
    if (!user) return { error: "Not authenticated", data: null };

    try {
      const supabase = createClient();

      const { data: payment, error } = await supabase
        .from("payments")
        .insert({
          ...data,
          payer_id: user.id,
          status: "processing",
        })
        .select()
        .single();

      if (error) return { error: error.message, data: null };

      return { error: null, data: payment as PaymentWithRelations };
    } catch (err) {
      console.error("Error creating payment:", err);
      return { error: "Failed to create payment", data: null };
    }
  };

  const simulatePayment = async (paymentId: string, caseId: string) => {
    if (!user) return { error: "Not authenticated" };

    try {
      const supabase = createClient();

      // Simulate payment processing - mark as completed
      const { error: payError } = await supabase
        .from("payments")
        .update({
          status: "completed",
          paid_at: new Date().toISOString(),
          transaction_id: `TXN-${Date.now()}`,
          transaction_reference: `REF-${Math.random().toString(36).substring(2, 10).toUpperCase()}`,
        })
        .eq("id", paymentId);

      if (payError) return { error: payError.message };

      // Check if all payments for this case are completed
      const { data: pendingPayments } = await supabase
        .from("payments")
        .select("id")
        .eq("case_id", caseId)
        .neq("status", "completed");

      // Get payment details for notification
      const { data: paymentRow } = await supabase
        .from("payments")
        .select("receiver_id, amount, case:cases(title)")
        .eq("id", paymentId)
        .single();

      // Notify the receiver (lawyer) about the payment
      if (paymentRow?.receiver_id) {
        const caseInfo = paymentRow.case as unknown as { title: string } | null;
        await supabase.from("notifications").insert({
          user_id: paymentRow.receiver_id,
          title: "Payment Received",
          message: `A payment of PKR ${Number(paymentRow.amount).toLocaleString()} has been received for case "${caseInfo?.title || ""}".`,
          type: "payment_completed",
          reference_type: "case",
          reference_id: caseId,
        });
      }

      // If no more pending payments, transition case status
      if (!pendingPayments || pendingPayments.length === 0) {
        await supabase
          .from("cases")
          .update({ status: "payment_confirmed" })
          .eq("id", caseId)
          .eq("status", "payment_pending");

        // Log activity
        await supabase.from("case_activity_log").insert({
          case_id: caseId,
          actor_id: user.id,
          action: "payment_confirmed",
          details: { payment_id: paymentId },
        });

        // Notify the payer (client) about full payment confirmation
        await supabase.from("notifications").insert({
          user_id: user.id,
          title: "Payment Confirmed",
          message: `All payments have been confirmed for your case. Your case will now proceed to the next stage.`,
          type: "payment_completed",
          reference_type: "case",
          reference_id: caseId,
        });
      }

      await fetchPayments();
      return { error: null };
    } catch (err) {
      console.error("Error simulating payment:", err);
      return { error: "Payment simulation failed" };
    }
  };

  return {
    payments,
    isLoading,
    fetchPayments,
    createPayment,
    simulatePayment,
  };
}
