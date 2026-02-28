import { z } from "zod";

export const paymentSchema = z.object({
  payment_method: z.enum(["jazzcash", "easypaisa", "bank_transfer"]),
  account_number: z.string().min(8, "Account number must be at least 8 characters"),
  account_name: z.string().min(2, "Account holder name is required"),
});

export const feeStructureSchema = z.object({
  fee_amount: z.number().min(1, "Fee must be greater than 0"),
  allow_installments: z.boolean(),
  installment_count: z.number().min(1).max(12).optional(),
});

export type PaymentFormData = z.infer<typeof paymentSchema>;
export type FeeStructureFormData = z.infer<typeof feeStructureSchema>;
