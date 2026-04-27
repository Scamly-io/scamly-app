/**
 * Onboarding Utilities for Scamly
 *
 * Provides helper functions to check onboarding status and profile completeness.
 * Used by AuthContext for the global onboarding gate and by the Google OAuth
 * sign-in flow to determine if a new user needs onboarding.
 */

import { supabase } from "@/utils/supabase";

import type { StoredOnboardingTutorialStep } from "./onboarding-tutorial-storage";

// ============================================================================
// Types
// ============================================================================

const REQUIRED_PROFILE_FIELDS = [
  "first_name",
  "dob",
  "gender",
  "country",
  "referral_source",
] as const;

/**
 * Thrown when a profile row does not exist for the given user ID.
 * Indicates the account was likely deleted externally (e.g. from the website)
 * while the app still holds a cached session.
 */
export class ProfileNotFoundError extends Error {
  constructor() {
    super("User profile not found — account may have been deleted");
    this.name = "ProfileNotFoundError";
  }
}

// ============================================================================
// Onboarding Status Check
// ============================================================================

export type ProfileOnboardingRow = {
  first_name: string | null;
  dob: string | null;
  gender: string | null;
  country: string | null;
  referral_source: string | null;
  onboarding_completed: boolean | null;
  app_tutorial_completed: boolean | null;
};

/** One screen handles all profile field steps; inner UI slides between questions. */
export const COLLECT_PROFILE_HREF = "/onboarding/collect-profile" as const;

export const ONBOARDING_PROFILE_HREFS = [COLLECT_PROFILE_HREF] as const;

export function getPreviousProfileOnboardingHref(currentHref: string): string | null {
  const idx = ONBOARDING_PROFILE_HREFS.indexOf(currentHref as (typeof ONBOARDING_PROFILE_HREFS)[number]);
  if (idx <= 0) {
    return null;
  }
  return (ONBOARDING_PROFILE_HREFS as readonly string[]).at(idx - 1) ?? null;
}

/**
 * First in-app step index (0 = name … 4 = referral) for the collect-profile flow.
 * For OAuth users with a name, the UI may insert a "welcome" screen at index 0 before DOB;
 * use {@link getInitialCollectProfileUiStep} after loading `oauth_welcome_seen` from device storage.
 */
export function getProfileCollectStepIndex(
  p: Pick<
    ProfileOnboardingRow,
    "first_name" | "dob" | "gender" | "country" | "referral_source"
  >,
): number {
  if (!p.first_name?.trim()) {
    return 0;
  }
  if (!p.dob?.trim()) {
    return 1;
  }
  if (!p.gender?.trim()) {
    return 2;
  }
  if (!p.country?.trim()) {
    return 3;
  }
  if (!p.referral_source?.trim()) {
    return 4;
  }
  return 0;
}

/**
 * Maps server/profile progress (`dataStep` from {@link getProfileCollectStepIndex}) to the
 * first screen index shown in `collect-profile`. OAuth users with a name see a one-time
 * welcome step at index 0 before DOB until they tap Continue (persisted via AsyncStorage).
 */
export function getInitialCollectProfileUiStep(input: {
  dataStep: number;
  oauth: boolean;
  firstNameTrim: string;
  oauthWelcomeSeen: boolean;
}): number {
  const { dataStep, oauth, firstNameTrim, oauthWelcomeSeen } = input;
  if (!oauth) {
    return dataStep;
  }
  if (dataStep === 0) {
    return 0;
  }
  if (dataStep === 1 && firstNameTrim && !oauthWelcomeSeen) {
    return 0;
  }
  return dataStep;
}

/**
 * Whether the user should continue the profile collect flow.
 * Order on screen: name → DOB → gender → country → referral.
 * DOB and gender are optional; only first name, country, and referral are required to leave this gate.
 */
export function getNextProfileOnboardingHref(
  p: Pick<
    ProfileOnboardingRow,
    "first_name" | "dob" | "gender" | "country" | "referral_source"
  >,
): string | null {
  if (!p.first_name?.trim() || !p.country?.trim() || !p.referral_source?.trim()) {
    return COLLECT_PROFILE_HREF;
  }
  return null;
}

/**
 * Check if a user has full app access: profile setup done and in-app tutorial finished.
 * Queries `profiles` for `onboarding_completed` and `app_tutorial_completed`.
 *
 * @param userId - The Supabase user ID
 * @returns true when the user can enter the main app; false if profile or tutorial remains
 * @throws {ProfileNotFoundError} if the profile row does not exist
 */
export async function checkOnboardingStatus(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("profiles")
    .select("onboarding_completed, app_tutorial_completed")
    .eq("id", userId)
    .single();

  // PGRST116 = ".single() returned zero rows" — profile doesn't exist
  if (error?.code === "PGRST116" || (!error && !data)) {
    throw new ProfileNotFoundError();
  }

  if (error) {
    throw error;
  }

  return data.onboarding_completed === true && data.app_tutorial_completed === true;
}

/**
 * Mark the in-app introduction (tutorial / first core action) as done for a user.
 * Also refreshes the auth home gate.
 */
export async function markAppTutorialCompleted(userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ app_tutorial_completed: true })
    .eq("id", userId);

  if (error) {
    throw error;
  }
}

/**
 * Load profile fields used for the progressive onboarding + tutorial gate.
 * @throws {ProfileNotFoundError} if the profile row does not exist
 */
export async function fetchProfileOnboardingRow(userId: string): Promise<ProfileOnboardingRow> {
  const { data, error } = await supabase
    .from("profiles")
    .select(
      "first_name, dob, gender, country, referral_source, onboarding_completed, app_tutorial_completed",
    )
    .eq("id", userId)
    .single();

  if (error?.code === "PGRST116" || (!error && !data)) {
    throw new ProfileNotFoundError();
  }

  if (error) {
    throw error;
  }

  return data as ProfileOnboardingRow;
}

/**
 * Initial route after `/onboarding` is opened. Drives profile steps, then the tutorial
 * (with optional email reminder), resuming from AsyncStorage if the app was backgrounded.
 */
export function resolveOnboardingEntryPath(input: {
  profile: ProfileOnboardingRow;
  emailConfirmed: boolean;
  storedTutorialStep: StoredOnboardingTutorialStep | null;
}): string {
  const { profile, emailConfirmed, storedTutorialStep } = input;
  const nextProfile = getNextProfileOnboardingHref(profile);
  if (nextProfile) {
    return nextProfile;
  }

  if (profile.app_tutorial_completed) {
    return "/home";
  }

  if (!emailConfirmed) {
    return "/onboarding/tutorial-email-pending";
  }

  if (storedTutorialStep === "first_scan") {
    return "/onboarding/tutorial-how-it-works";
  }
  if (storedTutorialStep === "celebration") {
    return "/onboarding/tutorial-celebration";
  }

  return "/onboarding/tutorial-offer";
}

// ============================================================================
// Profile Completeness Check
// ============================================================================

/**
 * Check if all required profile fields are present for a user.
 * Uses an AND check — all fields must be non-null and non-empty.
 *
 * Required fields: first_name, dob, gender, country, referral_source
 *
 * @param userId - The Supabase user ID
 * @returns true if all required fields exist and are non-empty, false otherwise
 */
export async function checkProfileComplete(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select(REQUIRED_PROFILE_FIELDS.join(", "))
      .eq("id", userId)
      .single();

    if (error || !data) {
      return false;
    }

    // Check that every required field exists and is non-null/non-empty
    const row = data as Record<string, unknown>;
    return REQUIRED_PROFILE_FIELDS.every((field) => {
      const value = row[field];
      return value !== null && value !== undefined && String(value).trim() !== "";
    });
  } catch {
    // Default to incomplete if we can't check
    return false;
  }
}
