import type { SignUpData } from "@/contexts/SignUpContext";

/**
 * True when the user is filling profile before the single `auth.signUp` call (email/password in context, **no** session yet).
 * If `sessionUserId` is set (signed-in user), always false — stale email/password from an abandoned sign-up must not apply after OAuth or email login.
 */
export function isEmailPasswordProfileDraft(
  d: SignUpData,
  sessionUserId?: string | null,
): boolean {
  if (sessionUserId) {
    return false;
  }
  return Boolean(d.email?.trim() && d.password);
}

export function shouldRedirectMissingEmailDraftToSignup({
  userId,
  isDraft,
  accountCreated,
}: {
  userId: string | null;
  isDraft: boolean;
  accountCreated: boolean;
}): boolean {
  return !userId && !isDraft && !accountCreated;
}
