"use client";

import { useState, useEffect, useRef } from "react";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { useSignatures } from "@/hooks/useSignatures";
import type { SignableEntityType } from "@/types/signature";
import { ShieldCheck, AlertCircle, KeyRound, Clock } from "lucide-react";

interface OtpSignatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: SignableEntityType;
  entityId: string;
  entityLabel: string;
  onSigned: () => void;
}

export default function OtpSignatureModal({
  isOpen,
  onClose,
  entityType,
  entityId,
  entityLabel,
  onSigned,
}: OtpSignatureModalProps) {
  const { sendOtp, verifyOtp, isLoading } = useSignatures();

  const [step, setStep] = useState<"confirm" | "verify" | "success">("confirm");
  const [signatureId, setSignatureId] = useState("");
  const [demoOtp, setDemoOtp] = useState("");
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [expiresAt, setExpiresAt] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Countdown timer
  useEffect(() => {
    if (!expiresAt) return;

    const interval = setInterval(() => {
      const remaining = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      );
      setTimeLeft(remaining);
      if (remaining === 0) clearInterval(interval);
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt]);

  // Reset state on open
  useEffect(() => {
    if (isOpen) {
      setStep("confirm");
      setSignatureId("");
      setDemoOtp("");
      setOtpDigits(["", "", "", "", "", ""]);
      setExpiresAt("");
      setTimeLeft(0);
      setError("");
    }
  }, [isOpen]);

  const handleSendOtp = async () => {
    setError("");
    const result = await sendOtp(entityType, entityId);

    if (!result.success) {
      setError(result.error || "Failed to send OTP");
      return;
    }

    setSignatureId(result.signature_id);
    setExpiresAt(result.expires_at);
    if (result.demo_otp) setDemoOtp(result.demo_otp);
    setStep("verify");

    // Focus first input
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  };

  const handleDigitChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto-advance to next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (value && index === 5 && newDigits.every((d) => d)) {
      handleVerifyOtp(newDigits.join(""));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length === 6) {
      const digits = pasted.split("");
      setOtpDigits(digits);
      handleVerifyOtp(pasted);
    }
  };

  const handleVerifyOtp = async (otpValue?: string) => {
    const otp = otpValue || otpDigits.join("");
    if (otp.length !== 6) {
      setError("Please enter all 6 digits.");
      return;
    }

    setError("");
    const result = await verifyOtp(signatureId, otp);

    if (!result.success) {
      setError(result.error || "Verification failed");
      setOtpDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
      return;
    }

    setStep("success");
    setTimeout(() => {
      onSigned();
      onClose();
    }, 1500);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${String(s).padStart(2, "0")}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Digital Signature - OTP Verification">
      {/* Step 1: Confirm signing */}
      {step === "confirm" && (
        <div className="space-y-4">
          <div className="rounded-lg border border-primary/20 bg-cream/30 p-4">
            <div className="flex items-start gap-3">
              <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  You are about to digitally sign:
                </p>
                <p className="mt-1 text-sm text-muted">{entityLabel}</p>
              </div>
            </div>
          </div>

          <p className="text-sm text-muted">
            A 6-digit OTP will be sent to your registered email/phone for
            verification. This signature is legally binding and will be recorded
            in the audit trail.
          </p>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="primary"
              onClick={handleSendOtp}
              isLoading={isLoading}
            >
              <KeyRound className="h-4 w-4" />
              Send OTP
            </Button>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Enter OTP */}
      {step === "verify" && (
        <div className="space-y-4">
          {demoOtp && (
            <div className="rounded-lg border border-warning/40 bg-warning/10 p-3">
              <p className="text-xs font-medium text-warning">
                Demo Mode: Your OTP is{" "}
                <span className="font-mono text-sm font-bold">{demoOtp}</span>
              </p>
            </div>
          )}

          <div className="text-center">
            <p className="text-sm text-muted">
              Enter the 6-digit OTP sent to your registered contact
            </p>
            <div className="mt-2 flex items-center justify-center gap-1">
              <Clock className="h-3.5 w-3.5 text-muted" />
              <span
                className={`text-xs font-medium ${timeLeft < 60 ? "text-danger" : "text-muted"}`}
              >
                {timeLeft > 0
                  ? `Expires in ${formatTime(timeLeft)}`
                  : "OTP expired"}
              </span>
            </div>
          </div>

          {/* OTP input boxes */}
          <div className="flex justify-center gap-2" onPaste={handlePaste}>
            {otpDigits.map((digit, i) => (
              <input
                key={i}
                ref={(el) => { inputRefs.current[i] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(i, e.target.value)}
                onKeyDown={(e) => handleKeyDown(i, e)}
                className="h-12 w-12 rounded-lg border border-border bg-cream-light text-center text-lg font-bold text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            ))}
          </div>

          {error && (
            <div className="flex items-center justify-center gap-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex justify-center gap-3">
            <Button
              variant="primary"
              onClick={() => handleVerifyOtp()}
              isLoading={isLoading}
              disabled={otpDigits.some((d) => !d) || timeLeft === 0}
            >
              Verify & Sign
            </Button>
            <Button
              variant="outline"
              onClick={handleSendOtp}
              disabled={isLoading}
            >
              Resend OTP
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Success */}
      {step === "success" && (
        <div className="space-y-4 text-center py-4">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success/10">
            <ShieldCheck className="h-8 w-8 text-success" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              Signed Successfully
            </h3>
            <p className="mt-1 text-sm text-muted">
              Your digital signature has been recorded.
            </p>
          </div>
          <Badge variant="success">Signature Verified</Badge>
        </div>
      )}
    </Modal>
  );
}
