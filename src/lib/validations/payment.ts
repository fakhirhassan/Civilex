import { z } from "zod";

export const paymentSchema = z
  .object({
    payment_method: z.enum(["jazzcash", "easypaisa", "bank_transfer", "card"]),
    // Wallet/bank fields (optional here; enforced via refine when applicable)
    account_number: z.string().optional(),
    account_name: z.string().optional(),
    // Card fields (optional here; enforced via refine when method is "card")
    card_number: z.string().optional(),
    card_holder: z.string().optional(),
    card_expiry: z.string().optional(),
    card_cvv: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.payment_method === "card") {
      const digits = (data.card_number || "").replace(/\s+/g, "");
      if (!/^\d{16}$/.test(digits)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["card_number"],
          message: "Card number must be 16 digits",
        });
      }
      if (!data.card_holder || data.card_holder.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["card_holder"],
          message: "Cardholder name is required",
        });
      }
      if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(data.card_expiry || "")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["card_expiry"],
          message: "Expiry must be MM/YY",
        });
      }
      if (!/^\d{3,4}$/.test(data.card_cvv || "")) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["card_cvv"],
          message: "CVV must be 3 or 4 digits",
        });
      }
    } else {
      if (!data.account_name || data.account_name.trim().length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["account_name"],
          message: "Account holder name is required",
        });
      }
      if (!data.account_number || data.account_number.trim().length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["account_number"],
          message: "Account number must be at least 8 characters",
        });
      }
    }
  });

export const feeStructureSchema = z.object({
  fee_amount: z.number().min(1, "Fee must be greater than 0"),
  allow_installments: z.boolean(),
  installment_count: z.number().min(1).max(12).optional(),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;
export type FeeStructureFormData = z.infer<typeof feeStructureSchema>;
