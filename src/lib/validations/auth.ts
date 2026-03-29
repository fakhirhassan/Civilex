import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.string().min(1, "Please select a role"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  role: z.string().min(1, "Please select a role"),
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().regex(/^(\+92|0)?3\d{9}$/, "Invalid Pakistani phone number (e.g., 03001234567)").optional().or(z.literal("")),
  cnic: z.string().regex(/^\d{5}-\d{7}-\d$/, "Invalid CNIC format (e.g., 12345-1234567-1)").optional().or(z.literal("")),
  // Lawyer-specific fields
  barLicenseNumber: z.string().optional(),
  specialization: z.array(z.string()).optional(),
  experienceYears: z.number().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
}).refine(
  (data) => {
    if (data.role === "lawyer") {
      return !!data.barLicenseNumber && data.barLicenseNumber.length > 0;
    }
    return true;
  },
  { message: "Bar license number is required for lawyers", path: ["barLicenseNumber"] }
).refine(
  (data) => {
    if (data.role === "lawyer") {
      return !!data.specialization && data.specialization.length > 0;
    }
    return true;
  },
  { message: "At least one specialization is required for lawyers", path: ["specialization"] }
);

export type RegisterFormData = z.infer<typeof registerSchema>;

export const profileUpdateSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().regex(/^(\+92|0)?3\d{9}$/, "Invalid Pakistani phone number (e.g., 03001234567)").optional().or(z.literal("")),
  cnic: z.string().regex(/^\d{5}-\d{7}-\d$/, "Invalid CNIC format (e.g., 12345-1234567-1)").optional().or(z.literal("")),
  address: z.string().optional(),
  city: z.string().optional(),
});

export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
