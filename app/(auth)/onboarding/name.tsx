import { onboardingHref } from "@/utils/onboarding-href";
import { Redirect } from "expo-router";

/**
 * @deprecated Use `/onboarding/collect-profile` (single stepper with slide transitions).
 */
export default function OnboardingNameRedirect() {
  return <Redirect href={onboardingHref("/onboarding/collect-profile")} />;
}
