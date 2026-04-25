import { onboardingHref } from "@/utils/onboarding-href";
import { Redirect } from "expo-router";

/**
 * @deprecated Use `/onboarding/collect-profile` (email sign-up + profile lives there).
 */
export default function OnboardingReferralRedirect() {
  return <Redirect href={onboardingHref("/onboarding/collect-profile")} />;
}
