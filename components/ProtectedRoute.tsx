/**
 * Protected Route Component
 *
 * Wraps content that requires authentication and completed onboarding.
 * Shows a loading spinner while checking auth/onboarding state,
 * redirects to login if not authenticated, and redirects to onboarding
 * if the user hasn't completed the onboarding flow.
 */

import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading, onboardingComplete } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    // Check if user is in an auth route
    const inAuthGroup = segments[0] === "(auth)";

    if (!user && !inAuthGroup) {
      // User is not authenticated and trying to access a protected route
      router.replace("/login");
    } else if (user && inAuthGroup) {
      // User is authenticated but on an auth route
      // Allow the onboarding screen to stay in the auth group
      const currentScreen = segments[1];
      if (currentScreen !== "onboarding") {
        // Check onboarding status before redirecting to home
        if (onboardingComplete === false) {
          router.replace("/onboarding");
        } else if (onboardingComplete === true) {
          router.replace("/home");
        }
        // If onboardingComplete is null (still checking), don't redirect yet
      }
    } else if (user && !inAuthGroup && onboardingComplete === false) {
      // User is authenticated, on a protected route, but hasn't completed onboarding
      router.replace("/onboarding");
    }
  }, [user, loading, onboardingComplete, segments, router]);

  // Show loading spinner while checking auth or onboarding status
  if (loading || (user && onboardingComplete === null)) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  // Don't render children if not authenticated (will redirect)
  if (!user) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: colors.background,
        }}
      >
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return <>{children}</>;
}
