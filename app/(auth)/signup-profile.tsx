import { Redirect } from "expo-router";

/**
 * Legacy route: profile collection now lives under `/onboarding` as one question per screen.
 * Unauthenticated users start at sign-up; `/onboarding` requires a session or in-progress draft from there.
 */
export default function SignUpProfileRedirect() {
  return <Redirect href="/onboarding/signup" />;
}
