import ThemedBackground from "@/components/ThemedBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

/**
 * Root index screen component that handles initial authentication and onboarding routing.
 * Uses the global auth context to check authentication state and onboarding completion,
 * then redirects accordingly:
 *
 * - Not authenticated -> /login
 * - Authenticated, onboarding status unknown (null) -> show spinner
 * - Authenticated, onboarding incomplete (false) -> /onboarding
 * - Authenticated, onboarding complete (true) -> /home
 */
export default function Index() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, loading, onboardingComplete } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/login");
      return;
    }

    // Wait until onboarding status is determined
    if (onboardingComplete === null) return;

    if (onboardingComplete === false) {
      router.replace("/onboarding");
    } else {
      router.replace("/home");
    }
  }, [user, loading, onboardingComplete, router]);

  return (
    <ThemedBackground>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    </ThemedBackground>
  );
}
