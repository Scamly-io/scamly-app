import { onboardingHref } from "@/utils/onboarding-href";
import { Redirect } from "expo-router";

/**
 * @deprecated Use `/onboarding/collect-profile`.
 */
export default function OnboardingGenderRedirect() {
  return <Redirect href={onboardingHref("/onboarding/collect-profile")} />;
}
