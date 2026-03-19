import { z } from "zod";

export const signInSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const signUpSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  firstName: z
    .string()
    .min(1, "First name is required")
    .max(50, "First name is too long"),
  dob: z.string().optional(),
  country: z.string().min(1, "Country is required"),
  gender: z.string().optional(),
  referralSource: z.string().min(1, "Please select how you heard about us"),
});

/** Schema for Step 1 only (email + password) */
export const signUpStep1Schema = signUpSchema.pick({
  email: true,
  password: true,
});

export const referralSourceOptions = [
  "Facebook",
  "Instagram",
  "X (Twitter)",
  "Youtube",
  "Other Social Media",
  "Google",
  "Word of Mouth",
] as const;

export const genderOptions = [
  "Male",
  "Female",
  "Non-binary",
  "Prefer not to say",
] as const;

/** Schema for onboarding profile fields (no email/password/firstName) */
export const onboardingProfileSchema = z.object({
  country: z.string().min(1, "Country is required"),
  referralSource: z.string().min(1, "Please select how you heard about us"),
  dob: z.string().optional(),
  gender: z.string().optional(),
});

export type SignInFormData = z.infer<typeof signInSchema>;
export type SignUpFormData = z.infer<typeof signUpSchema>;
export type OnboardingProfileFormData = z.infer<typeof onboardingProfileSchema>;
