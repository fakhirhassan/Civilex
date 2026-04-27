import { z } from "zod";

// ── Shared reusable field groups ──────────────────────────────────────

const cnicRegex = /^\d{5}-\d{7}-\d{1}$/;
const phoneRegex = /^03\d{9}$/;

/** Plaintiff (filing party) fields — all required */
const plaintiffFields = {
  plaintiff_name: z
    .string()
    .min(2, "Plaintiff name must be at least 2 characters"),
  plaintiff_phone: z
    .string()
    .regex(phoneRegex, "Phone must be in format 03XXXXXXXXX"),
  plaintiff_cnic: z
    .string()
    .regex(cnicRegex, "CNIC must be in format XXXXX-XXXXXXX-X"),
  plaintiff_address: z
    .string()
    .min(5, "Please provide a valid address"),
};

/** Defendant fields — name required, others optional */
const defendantFields = {
  defendant_name: z
    .string()
    .min(2, "Defendant name must be at least 2 characters"),
  defendant_phone: z
    .string()
    .regex(phoneRegex, "Phone must be in format 03XXXXXXXXX")
    .optional()
    .or(z.literal("")),
  defendant_cnic: z
    .string()
    .regex(cnicRegex, "CNIC must be in format XXXXX-XXXXXXX-X")
    .optional()
    .or(z.literal("")),
  defendant_email: z
    .string()
    .min(1, "Defendant email is required so the court can serve summons")
    .email("Invalid email address"),
  defendant_address: z
    .string()
    .optional(),
};

/** Common base fields shared by all case types */
const baseCaseFields = {
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  sensitivity: z.enum(["normal", "sensitive", "highly_sensitive"]),
  lawyer_id: z.string().uuid("Please select a lawyer").optional(),
  ...plaintiffFields,
  ...defendantFields,
};

// ── Civil case ────────────────────────────────────────────────────────

export const civilCaseSchema = z.object({
  ...baseCaseFields,
  case_type: z.literal("civil"),
  case_category: z.literal("civil"),
});

// ── Family sub-schemas ────────────────────────────────────────────────

export const familyCaseSchema = z.object({
  ...baseCaseFields,
  case_type: z.literal("family"),
  case_category: z.literal("family"),
});

export const marriageDivorceCaseSchema = z.object({
  ...baseCaseFields,
  case_type: z.literal("family"),
  case_category: z.literal("marriage_divorce"),
  marriage_certificate_number: z
    .string()
    .min(1, "Marriage/divorce certificate number is required"),
});

export const frcCaseSchema = z.object({
  ...baseCaseFields,
  case_type: z.literal("family"),
  case_category: z.literal("frc"),
});

export const documentsCaseSchema = z.object({
  ...baseCaseFields,
  case_type: z.literal("family"),
  case_category: z.literal("documents"),
});

export const affidavitsCaseSchema = z.object({
  ...baseCaseFields,
  case_type: z.literal("family"),
  case_category: z.literal("affidavits"),
});

// ── Criminal case ─────────────────────────────────────────────────────

export const criminalCaseSchema = z.object({
  ...baseCaseFields,
  case_type: z.literal("criminal"),
  case_category: z.literal("criminal"),
  fir_number: z.string().min(1, "FIR number is required"),
  police_station: z.string().min(1, "Police station is required"),
  offense_description: z
    .string()
    .min(10, "Offense description must be at least 10 characters"),
  offense_section: z.string().optional(),
  io_name: z.string().optional(),
  io_contact: z.string().optional(),
  arrest_date: z.string().optional(),
  evidence_type: z.enum(["oral", "documentary"], {
    error: "Evidence type is required",
  }),
});

// ── Discriminated union for the full form ─────────────────────────────

export const caseFormSchema = z.discriminatedUnion("case_category", [
  civilCaseSchema,
  familyCaseSchema,
  marriageDivorceCaseSchema,
  frcCaseSchema,
  documentsCaseSchema,
  affidavitsCaseSchema,
  criminalCaseSchema,
]);

// ── Inferred TypeScript types ──────────────────────────────────────────

export type CivilCaseFormData = z.infer<typeof civilCaseSchema>;
export type FamilyCaseFormData = z.infer<typeof familyCaseSchema>;
export type MarriageDivorceCaseFormData = z.infer<typeof marriageDivorceCaseSchema>;
export type FrcCaseFormData = z.infer<typeof frcCaseSchema>;
export type DocumentsCaseFormData = z.infer<typeof documentsCaseSchema>;
export type AffidavitsCaseFormData = z.infer<typeof affidavitsCaseSchema>;
export type CriminalCaseFormData = z.infer<typeof criminalCaseSchema>;
export type CaseFormData = z.infer<typeof caseFormSchema>;
