import Button from "@/components/Button";
import ThemedBackground from "@/components/ThemedBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { getAuthenticationMethodForAnalytics, trackOnboardingStepViewed } from "@/utils/analytics";
import { completeOnboardingTutorialWithPaywall } from "@/utils/onboarding-tutorial-exit";
import { setStoredOnboardingTutorialStep } from "@/utils/onboarding-tutorial-storage";
import { captureError } from "@/utils/sentry";
import { useRouter } from "expo-router";
import { CheckCircle } from "lucide-react-native";
import { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Shown after a successful first scan. "Finish tutorial" runs the end-of-tour paywall, then the main app.
 */
export default function OnboardingTutorialCelebration() {
  const { colors } = useTheme();
  const { user, checkOnboarding, refreshAuth } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const authMethod = getAuthenticationMethodForAnalytics(user);

  useEffect(() => {
    void setStoredOnboardingTutorialStep("celebration");
    trackOnboardingStepViewed("tutorial_celebration", { auth_method: authMethod });
  }, [authMethod]);

  const onFinish = async () => {
    if (!user) {
      return;
    }
    setLoading(true);
    try {
      await completeOnboardingTutorialWithPaywall({ user, checkOnboarding, refreshAuth, router });
    } catch (e) {
      captureError(e, { feature: "onboarding", action: "finish_tutorial", severity: "critical" });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <ThemedBackground>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView
          contentContainerStyle={{
            flexGrow: 1,
            paddingHorizontal: 24,
            paddingTop: 24,
            paddingBottom: 32,
            justifyContent: "center",
            alignItems: "center",
            gap: 20,
          }}
          contentInsetAdjustmentBehavior="automatic"
        >
          <View
            style={{
              width: 88,
              height: 88,
              borderRadius: 24,
              backgroundColor: colors.successMuted,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <CheckCircle size={40} color={colors.success} />
          </View>
          <Text
            style={{
              fontSize: 28,
              lineHeight: 36,
              fontFamily: "Poppins-Bold",
              color: colors.textPrimary,
              textAlign: "center",
            }}
            selectable
          >
            That’s a real first scan
          </Text>
          <Text
            style={{
              fontSize: 16,
              lineHeight: 25,
              fontFamily: "Poppins-Regular",
              color: colors.textSecondary,
              textAlign: "center",
              maxWidth: 360,
            }}
            selectable
          >
            You just used the core of Scamly. Next, we’ll show you subscription options — you can always explore the
            free tier first.
          </Text>
          <View
            style={{
              width: "100%",
              maxWidth: 400,
              marginTop: 8,
            }}
          >
            <Button onPress={onFinish} size="lg" fullWidth loading={loading} disabled={loading}>
              Finish tutorial
            </Button>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedBackground>
  );
}
