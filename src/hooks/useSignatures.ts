"use client";

import { useState, useCallback } from "react";
import type {
  SignableEntityType,
  OtpSendResponse,
  OtpVerifyResponse,
} from "@/types/signature";

export function useSignatures() {
  const [isLoading, setIsLoading] = useState(false);

  const sendOtp = useCallback(
    async (
      entityType: SignableEntityType,
      entityId: string
    ): Promise<OtpSendResponse & { demo_otp?: string }> => {
      setIsLoading(true);
      try {
        const payload: Record<string, string> = { entity_type: entityType };
        if (entityType === "document") {
          payload.document_id = entityId;
        } else {
          payload.judgment_id = entityId;
        }

        const res = await fetch("/api/otp/send", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          return {
            success: false,
            signature_id: "",
            expires_at: "",
            error: data.error || "Failed to send OTP",
          };
        }

        return data;
      } catch {
        return {
          success: false,
          signature_id: "",
          expires_at: "",
          error: "Failed to send OTP",
        };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const verifyOtp = useCallback(
    async (signatureId: string, otp: string): Promise<OtpVerifyResponse> => {
      setIsLoading(true);
      try {
        const res = await fetch("/api/otp/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ signature_id: signatureId, otp }),
        });

        const data = await res.json();

        if (!res.ok) {
          return { success: false, error: data.error || "Failed to verify OTP" };
        }

        return { success: true };
      } catch {
        return { success: false, error: "Failed to verify OTP" };
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return { sendOtp, verifyOtp, isLoading };
}
