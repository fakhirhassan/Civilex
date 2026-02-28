"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { usePayments } from "@/hooks/usePayments";
import { paymentSchema } from "@/lib/validations/payment";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, CheckCircle, Loader2 } from "lucide-react";
import type { PaymentWithRelations, PaymentMethod } from "@/types/payment";

interface PaymentFormProps {
  payment: PaymentWithRelations;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "method" | "details" | "processing" | "success";

const paymentMethods: { id: PaymentMethod; label: string; color: string }[] = [
  { id: "jazzcash", label: "JazzCash", color: "bg-red-500" },
  { id: "easypaisa", label: "Easypaisa", color: "bg-green-600" },
  { id: "bank_transfer", label: "Bank Transfer", color: "bg-blue-600" },
];

export default function PaymentForm({
  payment,
  isOpen,
  onClose,
  onSuccess,
}: PaymentFormProps) {
  const { simulatePayment, createPayment } = usePayments();
  const [step, setStep] = useState<Step>("method");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | "">("");
  const [formData, setFormData] = useState({
    account_number: "",
    account_name: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMethodSelect = (method: PaymentMethod) => {
    setSelectedMethod(method);
    setStep("details");
  };

  const handleSubmit = async () => {
    setErrors({});

    if (!selectedMethod) return;

    const result = paymentSchema.safeParse({
      payment_method: selectedMethod,
      account_number: formData.account_number,
      account_name: formData.account_name,
    });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((err) => {
        if (err.path[0]) fieldErrors[err.path[0] as string] = err.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setStep("processing");
    setIsProcessing(true);

    // If payment already exists, just simulate completion
    if (payment.id) {
      // Update payment method first
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase
        .from("payments")
        .update({ payment_method: selectedMethod })
        .eq("id", payment.id);

      // Simulate a short delay for "processing"
      await new Promise((r) => setTimeout(r, 2000));

      const { error } = await simulatePayment(payment.id, payment.case_id);

      if (error) {
        setStep("details");
        setIsProcessing(false);
        setErrors({ payment_method: error });
        return;
      }
    } else {
      // Create new payment and simulate
      const { data: newPayment, error: createError } = await createPayment({
        case_id: payment.case_id,
        receiver_id: payment.receiver_id || "",
        amount: payment.amount,
        payment_type: payment.payment_type || "lawyer_fee",
        payment_method: selectedMethod,
        description: payment.description || undefined,
        is_installment: payment.is_installment,
        installment_number: payment.installment_number,
        total_installments: payment.total_installments,
      });

      if (createError || !newPayment) {
        setStep("details");
        setIsProcessing(false);
        setErrors({ payment_method: createError || "Failed to create payment" });
        return;
      }

      await new Promise((r) => setTimeout(r, 2000));
      await simulatePayment(newPayment.id, payment.case_id);
    }

    setIsProcessing(false);
    setStep("success");
  };

  const handleClose = () => {
    if (step === "success") {
      onSuccess();
    }
    onClose();
    // Reset state
    setStep("method");
    setSelectedMethod("");
    setFormData({ account_number: "", account_name: "" });
    setErrors({});
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === "success" ? "Payment Successful" : "Make Payment"}
      className="max-w-md"
    >
      {/* Payment amount header */}
      {step !== "success" && (
        <div className="mb-6 rounded-lg bg-primary/5 p-4 text-center">
          <p className="text-sm text-muted">Amount Due</p>
          <p className="text-3xl font-bold text-primary">
            {formatCurrency(payment.amount)}
          </p>
          {payment.is_installment && (
            <Badge variant="info" className="mt-1">
              Installment {payment.installment_number} of{" "}
              {payment.total_installments}
            </Badge>
          )}
        </div>
      )}

      {/* Step 1: Select Method */}
      {step === "method" && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-primary">
            Select Payment Method
          </p>
          {paymentMethods.map((method) => (
            <button
              key={method.id}
              onClick={() => handleMethodSelect(method.id)}
              className="flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-colors hover:border-primary hover:bg-primary/5"
            >
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-lg ${method.color} text-white`}
              >
                <CreditCard className="h-5 w-5" />
              </div>
              <div>
                <p className="font-medium text-foreground">{method.label}</p>
                <p className="text-xs text-muted">
                  Pay with {method.label}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Step 2: Enter Details */}
      {step === "details" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">Method:</span>
            <Badge variant="primary">
              {paymentMethods.find((m) => m.id === selectedMethod)?.label}
            </Badge>
            <button
              onClick={() => setStep("method")}
              className="text-xs text-primary hover:underline"
            >
              Change
            </button>
          </div>

          <Input
            id="account_name"
            label="Account Holder Name"
            placeholder="Enter account holder name"
            value={formData.account_name}
            onChange={(e) =>
              setFormData({ ...formData, account_name: e.target.value })
            }
            error={errors.account_name}
          />

          <Input
            id="account_number"
            label={
              selectedMethod === "bank_transfer"
                ? "Account Number / IBAN"
                : "Mobile Number"
            }
            placeholder={
              selectedMethod === "bank_transfer"
                ? "Enter IBAN or account number"
                : "03XX-XXXXXXX"
            }
            value={formData.account_number}
            onChange={(e) =>
              setFormData({ ...formData, account_number: e.target.value })
            }
            error={errors.account_number}
          />

          {errors.payment_method && (
            <p className="text-sm text-danger">{errors.payment_method}</p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setStep("method")}>
              Back
            </Button>
            <Button onClick={handleSubmit}>
              Pay {formatCurrency(payment.amount)}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Processing */}
      {step === "processing" && (
        <div className="flex flex-col items-center py-8">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-sm font-medium text-foreground">
            Processing Payment...
          </p>
          <p className="mt-1 text-xs text-muted">
            Please wait while we confirm your payment
          </p>
        </div>
      )}

      {/* Step 4: Success */}
      {step === "success" && (
        <div className="flex flex-col items-center py-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success-light">
            <CheckCircle className="h-10 w-10 text-success" />
          </div>
          <p className="mt-4 text-lg font-semibold text-foreground">
            Payment Successful!
          </p>
          <p className="mt-1 text-sm text-muted">
            {formatCurrency(payment.amount)} has been paid successfully.
          </p>
          <Button className="mt-6" onClick={handleClose}>
            Done
          </Button>
        </div>
      )}
    </Modal>
  );
}
