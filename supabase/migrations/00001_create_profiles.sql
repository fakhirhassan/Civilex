-- Create role enum
CREATE TYPE public.user_role AS ENUM (
  'client',
  'lawyer',
  'admin_court',
  'magistrate',
  'trial_judge',
  'stenographer'
);

-- Profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  cnic TEXT UNIQUE,
  role public.user_role NOT NULL,
  avatar_url TEXT,
  address TEXT,
  city TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Lawyer profiles table (additional info for lawyers)
CREATE TABLE public.lawyer_profiles (
  id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  bar_license_number TEXT NOT NULL UNIQUE,
  specialization TEXT[] DEFAULT '{}',
  experience_years INTEGER DEFAULT 0,
  bio TEXT,
  hourly_rate NUMERIC(10, 2),
  rating NUMERIC(3, 2) DEFAULT 0.00,
  total_reviews INTEGER DEFAULT 0,
  is_available BOOLEAN DEFAULT true,
  location TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Auto-update updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Auto-create profile on signup trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'client')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Helper function to get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role::TEXT FROM public.profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lawyer_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
-- Everyone can read all profiles (needed for lawyer directory, case parties, etc.)
CREATE POLICY "profiles_select_all" ON public.profiles
  FOR SELECT USING (true);

-- Users can only update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for lawyer_profiles
-- Everyone can read lawyer profiles (needed for lawyer directory)
CREATE POLICY "lawyer_profiles_select_all" ON public.lawyer_profiles
  FOR SELECT USING (true);

-- Lawyers can only update their own lawyer profile
CREATE POLICY "lawyer_profiles_update_own" ON public.lawyer_profiles
  FOR UPDATE USING (auth.uid() = id);

-- Lawyers can insert their own lawyer profile
CREATE POLICY "lawyer_profiles_insert_own" ON public.lawyer_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);
