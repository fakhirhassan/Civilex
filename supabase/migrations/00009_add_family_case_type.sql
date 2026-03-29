-- Add 'family' to case_type enum
ALTER TYPE public.case_type ADD VALUE IF NOT EXISTS 'family';
