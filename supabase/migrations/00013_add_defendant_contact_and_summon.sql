-- Add defendant contact info columns to cases table
-- These store defendant details before they register on the platform
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS defendant_name TEXT,
  ADD COLUMN IF NOT EXISTS defendant_email TEXT,
  ADD COLUMN IF NOT EXISTS defendant_phone TEXT,
  ADD COLUMN IF NOT EXISTS defendant_address TEXT;

-- Add summon_issued notification type
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'summon_issued';

-- Add summon tracking columns
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS summon_sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS summon_sent_by UUID REFERENCES public.profiles(id);
