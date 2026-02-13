/**
 * Onboarding Utilities for Scamly
 *
 * Provides helper functions to check onboarding status and profile completeness.
 * Used by AuthContext for the global onboarding gate and by the Google OAuth
 * sign-in flow to determine if a new user needs onboarding.
 */

import { supabase } from "@/utils/supabase";

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

// ============================================================================
// Onboarding Status Check
// ============================================================================

/**
 * Check if a user has completed the onboarding process.
 * Queries the `profiles` table for the `onboarding_completed` boolean column.
 *
 * @param userId - The Supabase user ID
 * @returns true if onboarding is complete, false otherwise
 */
export async function checkOnboardingStatus(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("onboarding_completed")
      .eq("id", userId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.onboarding_completed === true;
  } catch {
    // Default to incomplete if we can't check
    return false;
  }
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
    return REQUIRED_PROFILE_FIELDS.every((field) => {
      const value = data[field];
      return value !== null && value !== undefined && String(value).trim() !== "";
    });
  } catch {
    // Default to incomplete if we can't check
    return false;
  }
}
