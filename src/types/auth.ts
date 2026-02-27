import type { Role } from "@/lib/constants";

export interface UserProfile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  cnic: string | null;
  role: Role;
  avatar_url: string | null;
  address: string | null;
  city: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LawyerProfile {
  id: string;
  bar_license_number: string;
  specialization: string[];
  experience_years: number;
  bio: string | null;
  hourly_rate: number | null;
  rating: number;
  total_reviews: number;
  is_available: boolean;
  location: string | null;
  created_at: string;
}

export interface AuthState {
  user: UserProfile | null;
  lawyerProfile: LawyerProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}
