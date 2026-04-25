import type { SignUpData } from "@/contexts/SignUpContext";
import { getPreviousProfileOnboardingHref } from "@/utils/onboarding";
import { onboardingHref } from "@/utils/onboarding-href";
import { isEmailPasswordProfileDraft } from "@/utils/signup-profile-draft";
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
