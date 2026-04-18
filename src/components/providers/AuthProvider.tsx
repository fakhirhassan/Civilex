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
import type { UserProfile, LawyerProfile, AuthState } from "@/types/auth";
import type { SupabaseClient, User } from "@supabase/supabase-js";

interface AuthContextType extends AuthState {
  signUp: (
    email: string,
    password: string,
    metadata: { full_name: string; role: string }
  ) => Promise<{ error: string | null; userId: string | null }>;
  signIn: (
    email: string,
    password: string,
    role: string
  ) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (
    data: Partial<UserProfile>
  ) => Promise<{ error: string | null }>;
  createLawyerProfile: (
    data: Omit<LawyerProfile, "id" | "created_at" | "rating" | "total_reviews">,
    userId?: string
  ) => Promise<{ error: string | null }>;
}

export const AuthContext = createContext<AuthContextType | null>(null);

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    lawyerProfile: null,
    isLoading: true,
    isAuthenticated: false,
  });

  // Stable ref — never changes between renders, no re-render side effects
  const supabaseRef = useRef<SupabaseClient>(createClient());
  const supabase = supabaseRef.current;

  // Tracks the last userId we fetched a profile for, to avoid duplicate fetches
  // when signIn and onAuthStateChange both fire for the same user.
  const lastFetchedUserIdRef = useRef<string | null>(null);

  const fetchProfile = useCallback(
    async (authUser: User) => {
      if (!supabase) {
        setState({ user: null, lawyerProfile: null, isLoading: false, isAuthenticated: false });
        return;
      }

      lastFetchedUserIdRef.current = authUser.id;

      try {
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .maybeSingle();

        if (error || !profile) {
          // Profile not found — mark as not authenticated but don't force sign out
          // (registration flow creates the profile after signUp returns)
          setState({ user: null, lawyerProfile: null, isLoading: false, isAuthenticated: false });
          return;
        }

        let lawyerProfile: LawyerProfile | null = null;
        if (profile.role === "lawyer") {
          const { data } = await supabase
            .from("lawyer_profiles")
            .select("*")
            .eq("id", authUser.id)
            .maybeSingle();
          lawyerProfile = data;
        }

        setState({
          user: profile,
          lawyerProfile,
          isLoading: false,
          isAuthenticated: true,
        });
      } catch {
        setState({ user: null, lawyerProfile: null, isLoading: false, isAuthenticated: false });
      }
    },
    [supabase]
  );

  useEffect(() => {
    if (!supabase) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    let cancelled = false;
    const getInitialSession = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (cancelled) return;

      if (authUser) {
        // Don't await here — let getInitialSession return so the GoTrue lock
        // is released before fetchProfile starts its own queries.
        fetchProfile(authUser);
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
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && session?.user) {
        // Skip if signIn just fetched the profile for this user — avoids the
        // lock-steal race between signIn's own query and this listener.
        if (lastFetchedUserIdRef.current === session.user.id) return;
        await fetchProfile(session.user);
      } else if (event === "SIGNED_OUT" || (event === "TOKEN_REFRESHED" && !session)) {
        lastFetchedUserIdRef.current = null;
        setState({
          user: null,
          lawyerProfile: null,
          isLoading: false,
          isAuthenticated: false,
        });
      }
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [supabase, fetchProfile]);

  const signUp = async (
    email: string,
    password: string,
    metadata: { full_name: string; role: string }
  ) => {
    if (!supabase) return { error: "Supabase not configured", userId: null };
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

    return { error: error?.message ?? null, userId: data.user?.id ?? null };
  };

  const signIn = async (email: string, password: string, role: string) => {
    if (!supabase) return { error: "Supabase not configured" };
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return { error: error.message };

    // Role verification — runs after signInWithPassword has released the auth lock,
    // so it won't race with onAuthStateChange → fetchProfile.
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    if (profileError) {
      await supabase.auth.signOut();
      return { error: "Failed to verify account. Please try again." };
    }

    if (!profile) {
      await supabase.auth.signOut();
      return { error: "Account setup incomplete. Please re-register." };
    }

    if (profile.role !== role) {
      await supabase.auth.signOut();
      return { error: `This account is registered as "${profile.role}", not "${role}".` };
    }

    // Populate state directly here so the caller can navigate immediately.
    // onAuthStateChange will also fire, but fetchProfile is idempotent.
    await fetchProfile(data.user);

    return { error: null };
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
    data: Omit<LawyerProfile, "id" | "created_at" | "rating" | "total_reviews">,
    userId?: string
  ) => {
    if (!supabase) return { error: "Supabase not configured" };

    // Get the current auth user directly — don't rely on state.user
    // because after signUp the state may not have updated yet
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    // Use passed userId as fallback when email confirmation is pending
    // (user exists but session isn't established yet)
    const effectiveUserId = authUser?.id ?? userId;

    if (!effectiveUserId) return { error: "Not authenticated" };

    // Use server API route with admin client to bypass RLS issues
    // that can occur right after signup when session isn't fully established
    try {
      const res = await fetch("/api/lawyers/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: effectiveUserId, ...data }),
      });

      const result = await res.json();

      if (!res.ok) {
        return { error: result.error || "Failed to create lawyer profile" };
      }

      if (authUser) {
        await fetchProfile(authUser);
      }
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
