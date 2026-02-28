-- Civilex Demo Seed Data
-- This seed data creates demo users and sample cases for demonstration.
-- NOTE: Users must be created through Supabase Auth first.
--       This seed only populates profiles and related data for existing auth users.
--
-- USAGE:
-- 1. Create these demo users in Supabase Auth (Dashboard > Authentication > Users):
--    Email                    | Password      | Role
--    ======================== | ============= | ==============
--    client1@civilex.pk       | demo123456    | client
--    client2@civilex.pk       | demo123456    | client
--    lawyer1@civilex.pk       | demo123456    | lawyer
--    lawyer2@civilex.pk       | demo123456    | lawyer
--    admin@civilex.pk         | demo123456    | admin_court
--    magistrate@civilex.pk    | demo123456    | magistrate
--    judge@civilex.pk         | demo123456    | trial_judge
--    steno@civilex.pk         | demo123456    | stenographer
--
-- 2. After creating auth users, note their UUIDs and replace the placeholders below.
-- 3. Run this SQL in the Supabase SQL Editor.

-- ============================================================
-- STEP 1: Update profiles (auto-created by trigger on signup)
-- Replace UUIDs below with actual auth.users IDs after creating accounts.
-- ============================================================

-- Uncomment and fill in with actual UUIDs after creating auth users:

/*
-- Client 1: Ahmad Khan (Plaintiff)
UPDATE public.profiles SET
  full_name = 'Ahmad Khan',
  phone = '+923001234567',
  cnic = '35201-1234567-1',
  address = '123 Model Town, Lahore',
  city = 'Lahore'
WHERE id = '<CLIENT1_UUID>';

-- Client 2: Fatima Bibi (Defendant)
UPDATE public.profiles SET
  full_name = 'Fatima Bibi',
  phone = '+923009876543',
  cnic = '35201-7654321-2',
  address = '45 Gulberg III, Lahore',
  city = 'Lahore'
WHERE id = '<CLIENT2_UUID>';

-- Lawyer 1: Barrister Ali Raza
UPDATE public.profiles SET
  full_name = 'Barrister Ali Raza',
  phone = '+923331112233',
  cnic = '35201-1111111-1',
  address = 'Lawyers Chamber, District Courts',
  city = 'Lahore'
WHERE id = '<LAWYER1_UUID>';

-- Lawyer 1 profile
INSERT INTO public.lawyer_profiles (id, bar_license_number, specialization, experience_years, bio, hourly_rate, rating, total_reviews, is_available, location)
VALUES (
  '<LAWYER1_UUID>',
  'LHR-2015-4521',
  ARRAY['Civil', 'Property', 'Family'],
  9,
  'Experienced civil lawyer with a strong track record in property and family law matters in Lahore High Court jurisdiction.',
  5000,
  4.5,
  28,
  true,
  'Lahore'
) ON CONFLICT (id) DO UPDATE SET
  specialization = EXCLUDED.specialization,
  experience_years = EXCLUDED.experience_years,
  bio = EXCLUDED.bio;

-- Lawyer 2: Advocate Ayesha Malik
UPDATE public.profiles SET
  full_name = 'Advocate Ayesha Malik',
  phone = '+923214445566',
  cnic = '35201-2222222-2',
  address = 'Supreme Court Bar, Islamabad',
  city = 'Islamabad'
WHERE id = '<LAWYER2_UUID>';

-- Lawyer 2 profile
INSERT INTO public.lawyer_profiles (id, bar_license_number, specialization, experience_years, bio, hourly_rate, rating, total_reviews, is_available, location)
VALUES (
  '<LAWYER2_UUID>',
  'ISB-2012-7789',
  ARRAY['Criminal', 'Constitutional', 'Cyber'],
  12,
  'Senior criminal lawyer specializing in constitutional and cyber crime cases. Former additional advocate general.',
  8000,
  4.8,
  45,
  true,
  'Islamabad'
) ON CONFLICT (id) DO UPDATE SET
  specialization = EXCLUDED.specialization,
  experience_years = EXCLUDED.experience_years,
  bio = EXCLUDED.bio;

-- Admin Court official
UPDATE public.profiles SET
  full_name = 'Registrar Mahmood Ahmed',
  phone = '+923005551122',
  address = 'Admin Court Complex, Lahore',
  city = 'Lahore'
WHERE id = '<ADMIN_UUID>';

-- Magistrate
UPDATE public.profiles SET
  full_name = 'Magistrate Hassan Ali',
  phone = '+923005553344',
  address = 'Magistrate Court, Lahore',
  city = 'Lahore'
WHERE id = '<MAGISTRATE_UUID>';

-- Trial Judge
UPDATE public.profiles SET
  full_name = 'Justice Saeed Akhtar',
  phone = '+923005557788',
  address = 'District & Sessions Court, Lahore',
  city = 'Lahore'
WHERE id = '<JUDGE_UUID>';

-- Stenographer
UPDATE public.profiles SET
  full_name = 'Muhammad Usman (Court Writer)',
  phone = '+923005559900',
  address = 'Court Complex, Lahore',
  city = 'Lahore'
WHERE id = '<STENO_UUID>';
*/

-- ============================================================
-- STEP 2: Sample Cases (uncomment after profiles are set up)
-- ============================================================

/*
-- Civil Case 1: Property Dispute
INSERT INTO public.cases (
  id, case_number, case_type, status, title, description,
  plaintiff_id, defendant_id, admin_court_id, trial_judge_id, stenographer_id,
  current_phase, sensitivity, filing_date, registration_date
) VALUES (
  gen_random_uuid(),
  'CIV-2026-0001',
  'civil',
  'evidence_stage',
  'Ahmad Khan vs Fatima Bibi - Property Dispute',
  'Dispute regarding ownership of property situated at Plot No. 123, Block A, Model Town, Lahore. The plaintiff claims rightful ownership through registered sale deed dated 15-01-2024, while the defendant contests the validity of said deed.',
  '<CLIENT1_UUID>',
  '<CLIENT2_UUID>',
  '<ADMIN_UUID>',
  '<JUDGE_UUID>',
  '<STENO_UUID>',
  'trial_court',
  'normal',
  '2026-01-15',
  '2026-01-20'
);

-- Criminal Case 1: Theft
INSERT INTO public.cases (
  id, case_number, case_type, status, title, description,
  plaintiff_id, defendant_id, admin_court_id,
  current_phase, sensitivity, filing_date, registration_date
) VALUES (
  gen_random_uuid(),
  'CRM-2026-0001',
  'criminal',
  'registered',
  'State vs Unknown Accused - Theft Case',
  'FIR No. 234/2026 registered at Model Town Police Station, Lahore for theft of valuables worth PKR 5,00,000 from the complainant residence.',
  '<CLIENT1_UUID>',
  NULL,
  '<ADMIN_UUID>',
  'admin_court',
  'normal',
  '2026-02-01',
  '2026-02-05'
);

-- Civil Case 2: Family Matter (Draft)
INSERT INTO public.cases (
  case_number, case_type, status, title, description,
  plaintiff_id,
  current_phase, sensitivity, filing_date
) VALUES (
  'CIV-2026-0002',
  'civil',
  'draft',
  'Maintenance & Custody Application',
  'Application for maintenance allowance and custody rights of minor children under the Guardian and Wards Act 1890 and Family Courts Act 1964.',
  '<CLIENT2_UUID>',
  'filing',
  'sensitive',
  '2026-02-20'
);
*/

-- ============================================================
-- STEP 3: Sample Notifications (uncomment after cases exist)
-- ============================================================

/*
INSERT INTO public.notifications (user_id, title, message, type, reference_type, is_read)
VALUES
  ('<CLIENT1_UUID>', 'Case Filed Successfully', 'Your case CIV-2026-0001 has been filed successfully.', 'case_status_changed', 'case', true),
  ('<CLIENT1_UUID>', 'Case Registered', 'Your case has been registered by the Admin Court.', 'case_status_changed', 'case', true),
  ('<CLIENT1_UUID>', 'Hearing Scheduled', 'Next hearing for your case is scheduled.', 'hearing_scheduled', 'case', false),
  ('<LAWYER1_UUID>', 'New Case Assignment', 'You have been assigned to a new case. Please review.', 'case_assigned', 'case', false),
  ('<ADMIN_UUID>', 'New Case for Scrutiny', 'A new case has been submitted for scrutiny review.', 'case_status_changed', 'case', false),
  ('<JUDGE_UUID>', 'Case Transferred', 'A new case has been transferred to your court.', 'case_status_changed', 'case', false);
*/

-- ============================================================
-- INSTRUCTIONS
-- ============================================================
-- 1. Create auth users in Supabase Dashboard (Authentication > Users)
-- 2. Copy each user's UUID from the dashboard
-- 3. Replace all '<..._UUID>' placeholders above with actual UUIDs
-- 4. Uncomment the SQL blocks (remove /* and */ wrappers)
-- 5. Run this file in the Supabase SQL Editor
-- 6. Login with demo credentials to test the application
