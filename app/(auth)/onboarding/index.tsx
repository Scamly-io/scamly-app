import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { onboardingHref } from "@/utils/onboarding/onboarding-href";
import { captureError } from "@/utils/shared/sentry";
import {
  fetchProfileOnboardingRow,
  getNextProfileOnboardingHref,
  resolveOnboardingEntryPath,
} from "@/utils/onboarding/onboarding";
import { clearOnboardingTutorialStorage, getStoredOnboardingTutorialStep } from "@/utils/onboarding/onboarding-tutorial-storage";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

/**
 * Resolves the first relevant onboarding / tutorial screen for this user.
 */
export default function OnboardingIndex() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { colors } = useTheme();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) {
      return;
    }
    if (!user) {
      router.replace(onboardingHref("/onboarding/signup"));
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const profile = await fetchProfileOnboardingRow(user.id);
        const hasProfileStep = getNextProfileOnboardingHref(profile) !== null;
        if (hasProfileStep) {
          await clearOnboardingTutorialStorage();
        }
        const storedTutorialStep = await getStoredOnboardingTutorialStep();
        const path = resolveOnboardingEntryPath({
          profile,
          emailConfirmed: Boolean(user.email_confirmed_at),
          storedTutorialStep,
        });
        if (cancelled) {
          return;
        }
        if (path === "/home") {
          router.replace(onboardingHref("/home"));
        } else {
          router.replace(onboardingHref(path));
        }
      } catch (e) {
        captureError(e, { feature: "onboarding", action: "resolve_entry", severity: "critical" });
        if (!cancelled) {
          setError("We couldn't start onboarding. Please try again.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user, authLoading, router]);

  if (error) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24 }}>
        <Text style={{ color: colors.error, textAlign: "center", fontFamily: "Poppins-Medium" }} selectable>
          {error}
        </Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
      <ActivityIndicator size="large" color={colors.accent} />
    </View>
  );
}
