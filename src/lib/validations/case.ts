import { z } from "zod";

export const civilCaseSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  case_type: z.literal("civil"),
  sensitivity: z.enum(["normal", "sensitive", "highly_sensitive"]),
  lawyer_id: z.string().uuid("Please select a lawyer").optional(),
});

export const familyCaseSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  case_type: z.literal("family"),
  sensitivity: z.enum(["normal", "sensitive", "highly_sensitive"]),
  lawyer_id: z.string().uuid("Please select a lawyer").optional(),
});

export const criminalCaseSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters"),
  description: z.string().min(20, "Description must be at least 20 characters"),
  case_type: z.literal("criminal"),
  sensitivity: z.enum(["normal", "sensitive", "highly_sensitive"]),
  lawyer_id: z.string().uuid("Please select a lawyer").optional(),
  fir_number: z.string().min(1, "FIR number is required"),
  police_station: z.string().min(1, "Police station is required"),
  offense_description: z.string().min(10, "Offense description is required"),
  offense_section: z.string().optional(),
  io_name: z.string().optional(),
  io_contact: z.string().optional(),
  arrest_date: z.string().optional(),
});

export type CivilCaseFormData = z.infer<typeof civilCaseSchema>;
export type CriminalCaseFormData = z.infer<typeof criminalCaseSchema>;
export type FamilyCaseFormData = z.infer<typeof familyCaseSchema>;
