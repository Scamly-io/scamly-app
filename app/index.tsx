import ThemedBackground from "@/components/ThemedBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";

/**
 * Root index screen component that handles initial authentication routing.
 * Uses the global auth context to check authentication state and redirects accordingly.
 */
export default function Index() {
  const { colors } = useTheme();
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;

    if (user) {
      router.replace("/home");
    } else {
      router.replace("/login");
    }
  }, [user, loading, router]);

  return (
    <ThemedBackground>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    </ThemedBackground>
  );
}
