"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { UserProfile, LawyerProfile, AuthState } from "@/types/auth";
import type { SupabaseClient, User } from "@supabase/supabase-js";

interface AuthContextType extends AuthState {
  signUp: (
    email: string,
    password: string,
    metadata: { full_name: string; role: string }
  ) => Promise<{ error: string | null }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (
    data: Partial<UserProfile>
  ) => Promise<{ error: string | null }>;
  createLawyerProfile: (
    data: Omit<LawyerProfile, "id" | "created_at" | "rating" | "total_reviews">
  ) => Promise<{ error: string | null }>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

function getSupabase(): SupabaseClient | null {
  try {
    return createClient();
  } catch {
    return null;
  }
}

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    lawyerProfile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  const supabaseRef = useRef<SupabaseClient | null>(null);

  const supabase = useMemo(() => {
    if (!supabaseRef.current) {
      supabaseRef.current = getSupabase();
    }
    return supabaseRef.current;
  }, []);

  const fetchProfile = useCallback(
    async (authUser: User) => {
      if (!supabase) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", authUser.id)
        .single();

      let lawyerProfile: LawyerProfile | null = null;
      if (profile?.role === "lawyer") {
        const { data } = await supabase
          .from("lawyer_profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();
        lawyerProfile = data;
      }

      setState({
        user: profile,
        lawyerProfile,
        isLoading: false,
        isAuthenticated: true,
      });
    },
    [supabase]
  );

  useEffect(() => {
    if (!supabase) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    const getInitialSession = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (authUser) {
        await fetchProfile(authUser);
      } else {
        setState({
          user: null,
          lawyerProfile: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    };

    getInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        await fetchProfile(session.user);
      } else if (event === "SIGNED_OUT") {
        setState({
          user: null,
          lawyerProfile: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, [supabase, fetchProfile]);

  const signUp = async (
    email: string,
    password: string,
    metadata: { full_name: string; role: string }
  ) => {
    if (!supabase) return { error: "Supabase not configured" };
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: metadata,
      },
    });

    // If signup succeeded and user is auto-confirmed, fetch their profile
    if (!error && data.user && data.session) {
      // Wait briefly for the database trigger to create the profile
      await new Promise((r) => setTimeout(r, 500));
      await fetchProfile(data.user);
    }

    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    if (!supabase) return { error: "Supabase not configured" };
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
  };

  const refreshProfile = async () => {
    if (!supabase) return;
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser) {
      await fetchProfile(authUser);
    }
  };

  const updateProfile = async (data: Partial<UserProfile>) => {
    if (!supabase) return { error: "Supabase not configured" };
    if (!state.user) return { error: "Not authenticated" };

    const { error } = await supabase
      .from("profiles")
      .update(data)
      .eq("id", state.user.id);

    if (!error) {
      setState((prev) => ({
        ...prev,
        user: prev.user ? { ...prev.user, ...data } : null,
      }));
    }

    return { error: error?.message ?? null };
  };

  const createLawyerProfile = async (
    data: Omit<LawyerProfile, "id" | "created_at" | "rating" | "total_reviews">
  ) => {
    if (!supabase) return { error: "Supabase not configured" };

    // Get the current auth user directly — don't rely on state.user
    // because after signUp the state may not have updated yet
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) return { error: "Not authenticated" };

    // Use server API route with admin client to bypass RLS issues
    // that can occur right after signup when session isn't fully established
    try {
      const res = await fetch("/api/lawyers/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: authUser.id, ...data }),
      });

      const result = await res.json();

      if (!res.ok) {
        return { error: result.error || "Failed to create lawyer profile" };
      }

      await fetchProfile(authUser);
      return { error: null };
    } catch (err) {
      return { error: "Failed to create lawyer profile" };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        ...state,
        signUp,
        signIn,
        signOut,
        refreshProfile,
        updateProfile,
        createLawyerProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
