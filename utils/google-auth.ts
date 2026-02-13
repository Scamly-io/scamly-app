/**
 * Google Sign-In Utility for Scamly
 *
 * Handles Google OAuth authentication flow using @react-native-google-signin/google-signin
 * and Supabase's signInWithIdToken method.
 *
 * Requirements:
 * - EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID env var must be set (web client ID from Google Cloud Console)
 * - @react-native-google-signin/google-signin plugin configured in app.json
 * - Requires a development build (not Expo Go)
 */

import { supabase } from "@/utils/supabase";
import {
  GoogleSignin,
  isErrorWithCode,
  isNoActiveAccount,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";

// ============================================================================
// Configuration
// ============================================================================

/**
 * Configure Google Sign-In with the web client ID.
 * The web client ID is used as the audience for signInWithIdToken with Supabase.
 * Must be called before any sign-in attempts.
 */
export function configureGoogleSignIn(): void {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  });
}

// ============================================================================
// Sign-In
// ============================================================================

export type GoogleSignInResult = {
  session: {
    access_token: string;
    refresh_token: string;
  };
  userId: string;
};

/**
 * Perform the full Google Sign-In flow:
 * 1. Trigger Google Sign-In dialog
 * 2. Extract ID token
 * 3. Exchange with Supabase via signInWithIdToken
 *
 * @returns Session data including access_token and userId
 * @throws Error with descriptive message on failure
 */
export async function signInWithGoogle(): Promise<GoogleSignInResult> {
  // Check if Google Play Services are available (Android)
  await GoogleSignin.hasPlayServices();

  // Trigger the Google Sign-In dialog
  const response = await GoogleSignin.signIn();

  if (!isSuccessResponse(response)) {
    throw new Error("Google sign-in was cancelled");
  }

  const idToken = response.data?.idToken;
  if (!idToken) {
    throw new Error("No ID token received from Google");
  }

  // Exchange the Google ID token with Supabase
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: "google",
    token: idToken,
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.session || !data.user) {
    throw new Error("No session returned from Supabase");
  }

  return {
    session: {
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    },
    userId: data.user.id,
  };
}

// ============================================================================
// Error Helpers
// ============================================================================

/**
 * Determine if a Google Sign-In error is a user cancellation.
 * Used to avoid showing error alerts when the user simply dismisses the dialog.
 */
export function isGoogleSignInCancelled(error: unknown): boolean {
  if (isErrorWithCode(error)) {
    return (
      error.code === statusCodes.SIGN_IN_CANCELLED ||
      isNoActiveAccount(error)
    );
  }
  if (error instanceof Error && error.message === "Google sign-in was cancelled") {
    return true;
  }
  return false;
}
