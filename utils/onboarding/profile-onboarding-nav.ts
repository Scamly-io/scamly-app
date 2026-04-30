import type { SignUpData } from "@/contexts/SignUpContext";
import { isEmailPasswordProfileDraft } from "@/utils/auth/signup-profile-draft";
import { getPreviousProfileOnboardingHref } from "@/utils/onboarding/onboarding";
import { onboardingHref } from "@/utils/onboarding/onboarding-href";
import type { Router } from "expo-router";

export function replaceFromProfileStep(
  router: Pick<Router, "replace">,
  currentHref: string,
  signUpData: SignUpData,
  sessionUserId?: string | null,
): void {
  const draft = isEmailPasswordProfileDraft(signUpData, sessionUserId);
  const prev = getPreviousProfileOnboardingHref(currentHref);
  if (prev) {
    router.replace(onboardingHref(prev));
    return;
  }
  if (draft) {
    router.back();
    return;
  }
  router.replace(onboardingHref("/login"));
}
