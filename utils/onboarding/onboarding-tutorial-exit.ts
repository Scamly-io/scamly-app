import { getAuthenticationMethodForAnalytics, trackOnboardingTutorialPaywallResult } from "@/utils/shared/analytics";
import { markAppTutorialCompleted } from "@/utils/onboarding/onboarding";
import { onboardingHref } from "@/utils/onboarding/onboarding-href";
import { clearOnboardingTutorialStorage } from "@/utils/onboarding/onboarding-tutorial-storage";
import { presentScamlyPaywall } from "@/utils/shared/revenuecat";
import { captureError } from "@/utils/shared/sentry";
import type { User } from "@supabase/supabase-js";
import type { Router } from "expo-router";
import { PAYWALL_RESULT } from "react-native-purchases-ui";

type ExitArgs = {
  user: User;
  checkOnboarding: () => Promise<void>;
  refreshAuth: () => Promise<void>;
  router: Pick<Router, "replace">;
};

/**
 * After the in-app tutorial (or skip), mark the profile flag, then show the first paywall, then the main app.
 * Matches post-tutorial subscription routing used elsewhere in the app.
 */
export async function completeOnboardingTutorialWithPaywall({
  user,
  checkOnboarding,
  refreshAuth,
  router,
}: ExitArgs): Promise<void> {
  const authMethod = getAuthenticationMethodForAnalytics(user);

  try {
    await markAppTutorialCompleted(user.id);
    await checkOnboarding();
    await refreshAuth();
  } catch (error) {
    captureError(error, {
      feature: "onboarding",
      action: "mark_tutorial_and_refresh",
      severity: "critical",
    });
    throw error;
  }

  await clearOnboardingTutorialStorage();

  let didSubscribe = false;
  try {
    const paywallResult = await presentScamlyPaywall(undefined, {
      trigger: "onboarding_tutorial",
    });
    didSubscribe =
      paywallResult === PAYWALL_RESULT.PURCHASED || paywallResult === PAYWALL_RESULT.RESTORED;
    if (paywallResult === PAYWALL_RESULT.PURCHASED) {
      trackOnboardingTutorialPaywallResult("purchased", { auth_method: authMethod });
    } else if (paywallResult === PAYWALL_RESULT.RESTORED) {
      trackOnboardingTutorialPaywallResult("restored", { auth_method: authMethod });
    } else {
      trackOnboardingTutorialPaywallResult("dismissed", { auth_method: authMethod });
    }
  } catch (error) {
    trackOnboardingTutorialPaywallResult("error", { auth_method: authMethod });
    captureError(error, {
      feature: "onboarding",
      action: "present_paywall",
      severity: "warning",
    });
  }

  if (didSubscribe) {
    router.replace(onboardingHref("/subscription-success"));
  } else {
    router.replace(onboardingHref("/home"));
  }
}
