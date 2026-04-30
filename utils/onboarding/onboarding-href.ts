import type { Href } from "expo-router";

/**
 * Expo Router's generated `Href` union may lag new route files; use this for onboarding paths.
 */
export function onboardingHref(path: string): Href {
  return path as Href;
}
