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
  phone: z.string().optional(),
  cnic: z.string().optional(),
  // Lawyer-specific fields
  barLicenseNumber: z.string().optional(),
  specialization: z.array(z.string()).optional(),
  experienceYears: z.number().optional(),
  bio: z.string().optional(),
  location: z.string().optional(),
});

export type RegisterFormData = z.infer<typeof registerSchema>;

export const profileUpdateSchema = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  phone: z.string().optional(),
  cnic: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
});

export type ProfileUpdateFormData = z.infer<typeof profileUpdateSchema>;
