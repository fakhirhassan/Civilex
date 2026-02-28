"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Notification, NotificationType } from "@/types/notification";
import type { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";

interface NotificationContextType {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  createNotification: (data: {
    user_id: string;
    title: string;
    message: string;
    type: NotificationType;
    reference_type?: string;
    reference_id?: string;
  }) => Promise<{ error: string | null }>;
  refreshNotifications: () => Promise<void>;
}

export const NotificationContext = createContext<NotificationContextType | null>(null);

function getSupabase(): SupabaseClient | null {
  try {
    return createClient();
  } catch {
    return null;
  }
}

export default function NotificationProvider({ children }: { children: ReactNode }) {
  const { user, isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const supabaseRef = useRef<SupabaseClient | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const supabase = (() => {
    if (!supabaseRef.current) {
      supabaseRef.current = getSupabase();
    }
    return supabaseRef.current;
  })();

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const fetchNotifications = useCallback(async () => {
    if (!supabase || !user) return;

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) {
        console.error("Error fetching notifications:", error);
      } else {
        setNotifications((data as Notification[]) || []);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, user]);

  // Fetch notifications when user is authenticated
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchNotifications();
    } else {
      setNotifications([]);
    }
  }, [isAuthenticated, user, fetchNotifications]);

  // Set up realtime subscription
  useEffect(() => {
    if (!supabase || !user || !isAuthenticated) return;

    // Clean up previous channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setNotifications((prev) => [newNotification, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as Notification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
        }
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const deleted = payload.old as { id: string };
          setNotifications((prev) => prev.filter((n) => n.id !== deleted.id));
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [supabase, user, isAuthenticated]);

  const markAsRead = useCallback(
    async (id: string) => {
      if (!supabase) return;

      const { error } = await supabase
        .from("notifications")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id);

      if (!error) {
        setNotifications((prev) =>
          prev.map((n) =>
            n.id === id ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
          )
        );
      }
    },
    [supabase]
  );

  const markAllAsRead = useCallback(async () => {
    if (!supabase || !user) return;

    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_read", false);

    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, is_read: true, read_at: new Date().toISOString() }))
      );
    }
  }, [supabase, user]);

  const deleteNotification = useCallback(
    async (id: string) => {
      if (!supabase) return;

      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("id", id);

      if (!error) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
      }
    },
    [supabase]
  );

  const clearAll = useCallback(async () => {
    if (!supabase || !user) return;

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", user.id);

    if (!error) {
      setNotifications([]);
    }
  }, [supabase, user]);

  const createNotificationFn = useCallback(
    async (data: {
      user_id: string;
      title: string;
      message: string;
      type: NotificationType;
      reference_type?: string;
      reference_id?: string;
    }) => {
      if (!supabase) return { error: "Supabase not configured" };

      const { error } = await supabase.from("notifications").insert({
        user_id: data.user_id,
        title: data.title,
        message: data.message,
        type: data.type,
        reference_type: data.reference_type || null,
        reference_id: data.reference_id || null,
      });

      return { error: error?.message ?? null };
    },
    [supabase]
  );

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isLoading,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        clearAll,
        createNotification: createNotificationFn,
        refreshNotifications: fetchNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
