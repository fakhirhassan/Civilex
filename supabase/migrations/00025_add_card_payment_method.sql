-- Migration 00025: Add 'card' to the payment_method enum so credit/debit
-- card simulated payments can be persisted.

ALTER TYPE public.payment_method ADD VALUE IF NOT EXISTS 'card';
