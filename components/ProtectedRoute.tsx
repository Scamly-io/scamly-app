/**
 * Protected Route Component
 *
 * Wraps content that requires authentication.
 * Shows a loading spinner while checking auth state,
 * redirects to login if not authenticated.
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
  const { user, loading } = useAuth();
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
      // User is authenticated but on an auth route, redirect to home
      router.replace("/home");
    }
  }, [user, loading, segments, router]);

  // Show loading spinner while checking auth
  if (loading) {
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
