"use client";

import { useState } from "react";
import Modal from "@/components/ui/Modal";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import Badge from "@/components/ui/Badge";
import { usePayments } from "@/hooks/usePayments";
import { paymentSchema } from "@/lib/validations/payment";
import { formatCurrency } from "@/lib/utils";
import { CreditCard, CheckCircle, Loader2, Smartphone, Building2 } from "lucide-react";
import type { PaymentWithRelations, PaymentMethod } from "@/types/payment";

interface PaymentFormProps {
  payment: PaymentWithRelations;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "method" | "details" | "processing" | "success";

const paymentMethods: {
  id: PaymentMethod;
  label: string;
  description: string;
  color: string;
  icon: "wallet" | "card" | "bank";
}[] = [
  { id: "card", label: "Credit / Debit Card", description: "Visa, Mastercard, UnionPay", color: "bg-indigo-600", icon: "card" },
  { id: "jazzcash", label: "JazzCash", description: "Pay from your JazzCash wallet", color: "bg-red-500", icon: "wallet" },
  { id: "easypaisa", label: "Easypaisa", description: "Pay from your Easypaisa wallet", color: "bg-green-600", icon: "wallet" },
  { id: "bank_transfer", label: "Bank Transfer", description: "Direct transfer via IBAN", color: "bg-blue-600", icon: "bank" },
];

const methodIcon = (icon: "wallet" | "card" | "bank") => {
  if (icon === "card") return <CreditCard className="h-5 w-5" />;
  if (icon === "bank") return <Building2 className="h-5 w-5" />;
  return <Smartphone className="h-5 w-5" />;
};

const formatCardNumber = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 16);
  return digits.replace(/(.{4})/g, "$1 ").trim();
};

const formatExpiry = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 4);
  if (digits.length < 3) return digits;
  return `${digits.slice(0, 2)}/${digits.slice(2)}`;
};

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
    card_number: "",
    card_holder: "",
    card_expiry: "",
    card_cvv: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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
      card_number: formData.card_number,
      card_holder: formData.card_holder,
      card_expiry: formData.card_expiry,
      card_cvv: formData.card_cvv,
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

    // Persist payment_method on the DB (enum value). "card" requires migration 00025.
    if (payment.id) {
      const { createClient } = await import("@/lib/supabase/client");
      const supabase = createClient();
      await supabase
        .from("payments")
        .update({ payment_method: selectedMethod })
        .eq("id", payment.id);

      await new Promise((r) => setTimeout(r, 2000));
      const { error } = await simulatePayment(payment.id, payment.case_id);
      if (error) {
        setStep("details");
        setErrors({ payment_method: error });
        return;
      }
    } else {
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
        setErrors({ payment_method: createError || "Failed to create payment" });
        return;
      }

      await new Promise((r) => setTimeout(r, 2000));
      await simulatePayment(newPayment.id, payment.case_id);
    }

    setStep("success");
  };

  const handleClose = () => {
    if (step === "success") {
      onSuccess();
    }
    onClose();
    setStep("method");
    setSelectedMethod("");
    setFormData({
      account_number: "",
      account_name: "",
      card_number: "",
      card_holder: "",
      card_expiry: "",
      card_cvv: "",
    });
    setErrors({});
  };

  const isCard = selectedMethod === "card";
  const selectedMethodMeta = paymentMethods.find((m) => m.id === selectedMethod);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === "success" ? "Payment Successful" : "Make Payment"}
      className="max-w-md"
    >
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
                {methodIcon(method.icon)}
              </div>
              <div>
                <p className="font-medium text-foreground">{method.label}</p>
                <p className="text-xs text-muted">{method.description}</p>
              </div>
            </button>
          ))}
          <p className="pt-2 text-center text-xs text-muted">
            This is a demo environment. No real money will be charged.
          </p>
        </div>
      )}

      {step === "details" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">Method:</span>
            <Badge variant="primary">{selectedMethodMeta?.label}</Badge>
            <button
              onClick={() => setStep("method")}
              className="ml-auto text-xs text-primary hover:underline"
            >
              Change
            </button>
          </div>

          {isCard ? (
            <>
              {/* Faux card preview */}
              <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-700 via-indigo-600 to-blue-700 p-4 text-white shadow-md">
                <div className="flex items-start justify-between">
                  <p className="text-xs uppercase tracking-wide opacity-80">Civilex Pay</p>
                  <CreditCard className="h-6 w-6 opacity-90" />
                </div>
                <p className="mt-6 font-mono text-lg tracking-widest">
                  {formData.card_number || "•••• •••• •••• ••••"}
                </p>
                <div className="mt-4 flex justify-between text-xs">
                  <div>
                    <p className="opacity-70">Cardholder</p>
                    <p className="font-medium tracking-wide">
                      {formData.card_holder || "FULL NAME"}
                    </p>
                  </div>
                  <div>
                    <p className="opacity-70">Expires</p>
                    <p className="font-medium tracking-wide">
                      {formData.card_expiry || "MM/YY"}
                    </p>
                  </div>
                </div>
              </div>

              <Input
                id="card_number"
                label="Card Number"
                placeholder="1234 5678 9012 3456"
                value={formData.card_number}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    card_number: formatCardNumber(e.target.value),
                  })
                }
                error={errors.card_number}
                inputMode="numeric"
              />

              <Input
                id="card_holder"
                label="Cardholder Name"
                placeholder="Name as on card"
                value={formData.card_holder}
                onChange={(e) =>
                  setFormData({ ...formData, card_holder: e.target.value.toUpperCase() })
                }
                error={errors.card_holder}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="card_expiry"
                  label="Expiry (MM/YY)"
                  placeholder="MM/YY"
                  value={formData.card_expiry}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      card_expiry: formatExpiry(e.target.value),
                    })
                  }
                  error={errors.card_expiry}
                  inputMode="numeric"
                />
                <Input
                  id="card_cvv"
                  label="CVV"
                  placeholder="•••"
                  value={formData.card_cvv}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      card_cvv: e.target.value.replace(/\D/g, "").slice(0, 4),
                    })
                  }
                  error={errors.card_cvv}
                  inputMode="numeric"
                  type="password"
                />
              </div>
            </>
          ) : (
            <>
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
                    ? "PKXX XXXX XXXX XXXX XXXX XXXX"
                    : "03XX-XXXXXXX"
                }
                value={formData.account_number}
                onChange={(e) =>
                  setFormData({ ...formData, account_number: e.target.value })
                }
                error={errors.account_number}
              />
            </>
          )}

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

          <p className="text-center text-xs text-muted">
            Demo only — no real transaction will occur.
          </p>
        </div>
      )}

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
