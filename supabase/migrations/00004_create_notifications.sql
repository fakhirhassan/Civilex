-- Notification type enum
CREATE TYPE public.notification_type AS ENUM (
  'case_filed',
  'case_assigned',
  'case_accepted',
  'case_declined',
  'case_status_changed',
  'payment_pending',
  'payment_completed',
  'hearing_scheduled',
  'hearing_reminder',
  'document_uploaded',
  'scrutiny_approved',
  'scrutiny_returned',
  'judgment_delivered',
  'general'
);

-- Notifications table
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type public.notification_type DEFAULT 'general' NOT NULL,

  -- Reference to related entity
  reference_type TEXT,           -- 'case', 'payment', 'hearing', etc.
  reference_id UUID,             -- ID of the related entity

  is_read BOOLEAN DEFAULT false NOT NULL,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_notifications_user ON public.notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON public.notifications(user_id) WHERE is_read = false;
CREATE INDEX idx_notifications_created ON public.notifications(created_at DESC);
CREATE INDEX idx_notifications_reference ON public.notifications(reference_type, reference_id);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (
    auth.uid() = user_id
  );

-- Users can mark their own notifications as read
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (
    auth.uid() = user_id
  );

-- Allow inserts from authenticated users (for app-level notification creation)
-- In production, you'd restrict this to service role or use triggers
CREATE POLICY "notifications_insert_authenticated" ON public.notifications
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL
  );

-- Allow users to delete their own notifications
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE USING (
    auth.uid() = user_id
  );

-- ========================================
-- Enable Supabase Realtime for notifications
-- ========================================
-- Run this in the Supabase SQL editor:
-- ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ========================================
-- Helper function to create a notification
-- ========================================
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type public.notification_type DEFAULT 'general',
  p_reference_type TEXT DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type, reference_type, reference_id)
  VALUES (p_user_id, p_title, p_message, p_type, p_reference_type, p_reference_id)
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
