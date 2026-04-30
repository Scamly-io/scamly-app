import type { SignUpData } from "@/contexts/SignUpContext";
import { getPreviousProfileOnboardingHref } from "@/utils/onboarding/onboarding";
import { onboardingHref } from "@/utils/onboarding/onboarding-href";
import { isEmailPasswordProfileDraft } from "@/utils/auth/signup-profile-draft";
import type { Router } from "expo-router";

export function replaceFromProfileStep(
  router: Pick<Router, "replace">,
  currentHref: string,
  signUpData: SignUpData,
): void {
  const draft = isEmailPasswordProfileDraft(signUpData);
  const prev = getPreviousProfileOnboardingHref(currentHref);
  if (prev) {
    router.replace(onboardingHref(prev));
    return;
  }
  if (draft) {
    router.replace(onboardingHref("/signup"));
    return;
  }
  router.replace(onboardingHref("/login"));
}
