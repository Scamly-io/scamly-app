import type { SignUpData } from "@/contexts/SignUpContext";

/**
 * True when the user is filling profile before the single `auth.signUp` call (email/password only in context, no session).
 */
export function isEmailPasswordProfileDraft(d: SignUpData): boolean {
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
