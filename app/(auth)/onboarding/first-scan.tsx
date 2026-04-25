import { onboardingHref } from "@/utils/onboarding-href";
import { Redirect } from "expo-router";

/**
 * First-scan now lives inside `tutorial-how-it-works` (step 2: upload + scan).
 * Keep this route so older links and any in-app references still resolve.
 */
export default function OnboardingFirstScanRedirect() {
  return <Redirect href={onboardingHref("/onboarding/tutorial-how-it-works?start=scan")} />;
}
