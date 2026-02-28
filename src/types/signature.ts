export type SignableEntityType = "document" | "judgment";

export interface OtpSignature {
  id: string;
  document_id: string | null;
  judgment_id: string | null;
  entity_type: SignableEntityType;
  signer_id: string;
  signer_role: string;
  otp_hash: string;
  otp_verified: boolean;
  otp_sent_at: string;
  otp_verified_at: string | null;
  otp_expires_at: string;
  attempts: number;
  max_attempts: number;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface OtpSignatureWithRelations extends OtpSignature {
  signer_profile?: { full_name: string; email: string } | null;
}

export interface SignDocumentPayload {
  document_id: string;
  case_id: string;
}

export interface SignJudgmentPayload {
  judgment_id: string;
  case_id: string;
}

export interface OtpSendResponse {
  success: boolean;
  signature_id: string;
  expires_at: string;
  error?: string;
}

export interface OtpVerifyResponse {
  success: boolean;
  error?: string;
}
