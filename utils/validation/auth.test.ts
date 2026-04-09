import {
  onboardingProfileSchema,
  signInSchema,
  signUpSchema,
  signUpStep1Schema,
} from "@/utils/validation/auth";

describe("signInSchema", () => {
  it("should accept valid credentials", () => {
    const r = signInSchema.safeParse({
      email: "a@b.co",
      password: "secret",
    });
    expect(r.success).toBe(true);
  });

  it("should reject invalid email and short password", () => {
    expect(signInSchema.safeParse({ email: "nope", password: "12345" }).success).toBe(
      false,
    );
  });
});

describe("signUpStep1Schema", () => {
  it("should enforce signup password minimum length 8", () => {
    expect(
      signUpStep1Schema.safeParse({ email: "a@b.co", password: "1234567" }).success,
    ).toBe(false);
    expect(
      signUpStep1Schema.safeParse({ email: "a@b.co", password: "12345678" }).success,
    ).toBe(true);
  });
});

describe("signUpSchema", () => {
  it("should require referral source and country", () => {
    const bad = signUpSchema.safeParse({
      email: "a@b.co",
      password: "12345678",
      firstName: "Jo",
      country: "",
      referralSource: "",
    });
    expect(bad.success).toBe(false);
  });

  it("should allow optional dob and gender", () => {
    const ok = signUpSchema.safeParse({
      email: "a@b.co",
      password: "12345678",
      firstName: "Jo",
      country: "US",
      referralSource: "Google",
    });
    expect(ok.success).toBe(true);
  });
});

describe("onboardingProfileSchema", () => {
  it("should validate minimal required fields", () => {
    expect(
      onboardingProfileSchema.safeParse({
        country: "US",
        referralSource: "Other",
      }).success,
    ).toBe(true);
  });
});
