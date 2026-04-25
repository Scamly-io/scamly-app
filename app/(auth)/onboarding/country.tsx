import { onboardingHref } from "@/utils/onboarding-href";
import { Redirect } from "expo-router";

/**
 * @deprecated Use `/onboarding/collect-profile`.
 */
export default function OnboardingCountryRedirect() {
  return <Redirect href={onboardingHref("/onboarding/collect-profile")} />;
}
