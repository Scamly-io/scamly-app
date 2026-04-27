import Button from "@/components/Button";
import ThemedBackground from "@/components/ThemedBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import {
  getAuthenticationMethodForAnalytics,
  trackOnboardingStepViewed,
  trackOnboardingTutorialDismissed,
} from "@/utils/analytics";
import { onboardingHref } from "@/utils/onboarding-href";
import { completeOnboardingTutorialWithPaywall } from "@/utils/onboarding-tutorial-exit";
import { captureError } from "@/utils/sentry";
import { useRouter } from "expo-router";
import { BookOpen, Sparkles } from "lucide-react-native";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

/**
 * Shown after profile onboarding when the user is ready for the in-app product tutorial.
 * Opt-in before the screenshot + first-scan flow in `tutorial-how-it-works`.
 */
export default function OnboardingTutorialOffer() {
  const { colors, radius, shadows } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, checkOnboarding, refreshAuth } = useAuth();
  const router = useRouter();
  const [exitLoading, setExitLoading] = useState(false);
  const authMethod = getAuthenticationMethodForAnalytics(user);
  const footerPadBottom = Math.max(insets.bottom, 10);

  useEffect(() => {
    trackOnboardingStepViewed("tutorial_offer", { auth_method: authMethod });
  }, [authMethod]);

  const onStartTutorial = () => {
    router.replace(onboardingHref("/onboarding/tutorial-how-it-works"));
  };

  const onNotNow = async () => {
    if (!user) {
      return;
    }
    setExitLoading(true);
    try {
      trackOnboardingTutorialDismissed("tutorial_offer", { auth_method: authMethod });
      await completeOnboardingTutorialWithPaywall({ user, checkOnboarding, refreshAuth, router });
    } catch (e) {
      captureError(e, { feature: "onboarding", action: "decline_tutorial_offer", severity: "critical" });
    } finally {
      setExitLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  if (exitLoading) {
    return (
      <ThemedBackground>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </ThemedBackground>
    );
  }

  return (
    <ThemedBackground>
      <SafeAreaView style={{ flex: 1, width: "100%" }} edges={["top", "left", "right"]}>
        <View style={{ flex: 1, minHeight: 0, width: "100%" }}>
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 16, flexGrow: 1 }}
            contentInsetAdjustmentBehavior="automatic"
            showsVerticalScrollIndicator={false}
          >
            <View style={{ flexGrow: 1, justifyContent: "center" }}>
            <View
              style={{
                width: 72,
                height: 72,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.accentMuted,
                borderRadius: 22,
                marginBottom: 20,
                borderCurve: "continuous" as const,
              }}
            >
              <BookOpen size={32} color={colors.accent} />
            </View>
            <Text
              style={{
                fontSize: 28,
                fontFamily: "Poppins-Bold",
                color: colors.textPrimary,
                lineHeight: 36,
                marginBottom: 10,
              }}
              selectable
            >
              Want a quick tour?
            </Text>
            <Text
              style={{
                fontSize: 16,
                fontFamily: "Poppins-Regular",
                color: colors.textSecondary,
                lineHeight: 24,
                marginBottom: 8,
              }}
              selectable
            >
              We can show you how to grab a screenshot and run your first scam check — it only takes a minute.
            </Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 8, marginTop: 12 }}>
              <Sparkles size={16} color={colors.accent} />
              <Text style={{ flex: 1, fontSize: 14, fontFamily: "Poppins-Regular", color: colors.textTertiary, lineHeight: 20 }} selectable>
                You can still use every feature on your own if you prefer to skip.
              </Text>
            </View>
            <View
              style={[
                {
                  marginTop: 28,
                  backgroundColor: colors.surface,
                  borderRadius: radius["2xl"],
                  padding: 22,
                },
                shadows.lg,
                { borderCurve: "continuous" as const },
              ]}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontFamily: "Poppins-SemiBold",
                  color: colors.textPrimary,
                  marginBottom: 6,
                }}
                selectable
              >
                The tour covers
              </Text>
              <Text style={{ fontSize: 14, fontFamily: "Poppins-Regular", color: colors.textSecondary, lineHeight: 22 }} selectable>
                1) Taking a screenshot of a message{`\n`}2) Uploading it and getting your first result in the app
              </Text>
            </View>
            </View>
          </ScrollView>

          <View
            style={{
              width: "100%",
              maxWidth: "100%",
              alignSelf: "stretch",
              paddingHorizontal: 20,
              paddingTop: 12,
              paddingBottom: footerPadBottom,
              gap: 12,
            }}
          >
            <Button onPress={onStartTutorial} size="lg" fullWidth>
              Yes, show me
            </Button>
            <Button onPress={onNotNow} variant="ghost" size="lg" fullWidth>
              Not now
            </Button>
          </View>
        </View>
      </SafeAreaView>
    </ThemedBackground>
  );
}
