export type PaymentMethod = "jazzcash" | "easypaisa" | "bank_transfer";
export type PaymentStatus = "pending" | "processing" | "completed" | "failed" | "refunded";
export type PaymentType = "court_fee" | "lawyer_fee" | "stamp_duty" | "miscellaneous";

export interface Payment {
  id: string;
  case_id: string;
  payer_id: string;
  receiver_id: string | null;

  amount: number;
  payment_type: PaymentType;
  payment_method: PaymentMethod | null;
  status: PaymentStatus;

  transaction_id: string | null;
  transaction_reference: string | null;

  is_installment: boolean;
  installment_number: number;
  total_installments: number;
  parent_payment_id: string | null;

  description: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PaymentWithRelations extends Payment {
  case?: {
    id: string;
    case_number: string;
    title: string;
  };
  payer?: {
    id: string;
    full_name: string;
    email: string;
  };
  receiver?: {
    id: string;
    full_name: string;
    email: string;
  };
}
