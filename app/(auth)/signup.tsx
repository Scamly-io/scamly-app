import { Redirect } from "expo-router";

/** Deep links and older paths still use `/signup`; canonical route is `/onboarding/signup`. */
export default function SignUpRedirect() {
  return <Redirect href="/onboarding/signup" />;
}
