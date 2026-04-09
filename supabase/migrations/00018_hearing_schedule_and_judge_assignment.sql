-- Migration 00018: Hearing schedule enhancements and judge assignment tracking
-- Adds judge assignment timestamp and notes field to hearings

-- Add judge_assigned_at to cases to track when a judge was assigned
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS judge_assigned_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS assigned_judge_notes TEXT;

-- Add notes field to hearings for court orders / judge notes
ALTER TABLE public.hearings
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- Ensure hearing_reminder exists in notification type check constraint
-- (hearings already use "hearing_scheduled" which is in the enum, so no change needed)
