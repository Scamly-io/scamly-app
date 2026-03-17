/**
 * Authentication Context for Scamly
 *
 * Provides global authentication state management using Supabase Auth.
 * Centralizes session handling, user identification for analytics/error tracking,
 * onboarding completion gate, and sign-out logic.
 */

import { identifyUser, resetUser, type UserPlan } from "@/utils/analytics";
import { checkOnboardingStatus } from "@/utils/onboarding";
import { clearUserContext, setUserContext } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import type { Session, User } from "@supabase/supabase-js";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

// ============================================================================
// Types
// ============================================================================

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  onboardingComplete: boolean | null; // null = still checking
  checkOnboarding: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  signOut: () => Promise<void>;
};

// ============================================================================
// Context
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// Helpers
// ============================================================================

/**
 * Determine the user plan category from subscription_plan string.
 * Maps Supabase subscription_plan values to analytics plan types.
 */
function getPlanCategory(subscriptionPlan: string): UserPlan {
  if (subscriptionPlan === "free") return "free";
  if (subscriptionPlan.includes("trial")) return "trial";
  return "paid";
}

/**
 * Identify user for analytics and error tracking.
 * Fetches profile to get subscription plan and sets up PostHog/Sentry context.
 */
async function identifyUserForTracking(userId: string): Promise<void> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_plan")
      .eq("id", userId)
      .single();

    if (profile) {
      const planCategory = getPlanCategory(profile.subscription_plan);
      identifyUser(userId, planCategory);
      setUserContext(userId, planCategory);
    }
  } catch {
    // Non-blocking - continue even if identification fails
  }
}

// ============================================================================
// Provider
// ============================================================================

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [onboardingComplete, setOnboardingComplete] = useState<boolean | null>(null);

  /**
   * Check onboarding status for the current user.
   * Can be called externally (e.g., after webview onboarding completes).
   */
  const checkOnboarding = async (): Promise<void> => {
    const userId = session?.user?.id;
    if (!userId) {
      setOnboardingComplete(null);
      return;
    }

    try {
      const isComplete = await checkOnboardingStatus(userId);
      setOnboardingComplete(isComplete);
    } catch {
      // Default to false if check fails - user will be sent to onboarding
      setOnboardingComplete(false);
    }
  };

  /**
   * Refresh the auth session and derived context values.
   * Useful after profile/account changes so dependent screens can re-render.
   */
  const refreshAuth = async (): Promise<void> => {
    try {
      const {
        data: { session: refreshedSession },
      } = await supabase.auth.getSession();

      setSession(refreshedSession);

      if (!refreshedSession?.user) {
        setOnboardingComplete(null);
        return;
      }

      await identifyUserForTracking(refreshedSession.user.id);

      try {
        const isComplete = await checkOnboardingStatus(refreshedSession.user.id);
        setOnboardingComplete(isComplete);
      } catch {
        setOnboardingComplete(false);
      }
    } catch {
      // Non-blocking refresh failure; keep existing auth state
    }
  };

  useEffect(() => {
    let mounted = true;

    // Use onAuthStateChange as the single source of truth for session state.
    // The INITIAL_SESSION event handles restoring the session from storage,
    // which avoids the race condition between getSession() and onAuthStateChange
    // that could leave `loading` stuck at true on cold starts.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      if (!mounted) return;

      // Handle the initial session load from storage
      if (event === "INITIAL_SESSION") {
        setSession(newSession);

        if (newSession?.user) {
          identifyUserForTracking(newSession.user.id);

          // Check onboarding status on initial session load
          try {
            const isComplete = await checkOnboardingStatus(newSession.user.id);
            if (mounted) setOnboardingComplete(isComplete);
          } catch {
            if (mounted) setOnboardingComplete(false);
          }
        }

        setLoading(false);
        return;
      }

      // Handle token refresh errors silently - user will be redirected to login
      if (event === "TOKEN_REFRESHED" && !newSession) {
        setSession(null);
        setOnboardingComplete(null);
        resetUser();
        clearUserContext();
        return;
      }

      setSession(newSession);

      // Handle user identification and onboarding check on sign in
      if (event === "SIGNED_IN" && newSession?.user) {
        try {
          await identifyUserForTracking(newSession.user.id);
        } catch {
          // Non-blocking - continue even if identification fails
        }

        // Check onboarding status on sign in
        try {
          const isComplete = await checkOnboardingStatus(newSession.user.id);
          if (mounted) setOnboardingComplete(isComplete);
        } catch {
          if (mounted) setOnboardingComplete(false);
        }
      }

      // Handle cleanup on sign out
      if (event === "SIGNED_OUT") {
        setOnboardingComplete(null);
        resetUser();
        clearUserContext();
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Sign out the current user.
   * Clears analytics/error tracking context and signs out from Supabase.
   */
  const signOut = async (): Promise<void> => {
    resetUser();
    clearUserContext();
    setOnboardingComplete(null);
    await supabase.auth.signOut();
  };

  const value: AuthContextType = {
    session,
    user: session?.user ?? null,
    loading,
    onboardingComplete,
    checkOnboarding,
    refreshAuth,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook to access authentication state and methods.
 * Must be used within an AuthProvider.
 *
 * @returns {AuthContextType} The auth context with session, user, loading, onboardingComplete, checkOnboarding, and signOut
 * @throws {Error} If used outside of AuthProvider
 *
 * @example
 * const { user, loading, onboardingComplete, signOut } = useAuth();
 *
 * if (loading) return <ActivityIndicator />;
 * if (!user) return <Navigate to="/login" />;
 * if (!onboardingComplete) return <Navigate to="/onboarding" />;
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
