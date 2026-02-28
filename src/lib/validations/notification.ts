import { z } from "zod";

export const createNotificationSchema = z.object({
  user_id: z.string().uuid("Invalid user ID"),
  title: z.string().min(1, "Title is required").max(200),
  message: z.string().min(1, "Message is required").max(1000),
  type: z.enum([
    "case_filed",
    "case_assigned",
    "case_accepted",
    "case_declined",
    "case_status_changed",
    "payment_pending",
    "payment_completed",
    "hearing_scheduled",
    "hearing_reminder",
    "document_uploaded",
    "scrutiny_approved",
    "scrutiny_returned",
    "judgment_delivered",
    "general",
  ]),
  reference_type: z.string().optional(),
  reference_id: z.string().uuid().optional(),
});
