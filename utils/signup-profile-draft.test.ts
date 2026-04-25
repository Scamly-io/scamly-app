import {
  isEmailPasswordProfileDraft,
  shouldRedirectMissingEmailDraftToSignup,
} from "@/utils/signup-profile-draft";

describe("signup profile draft helpers", () => {
  it("identifies an email/password profile draft", () => {
    expect(
      isEmailPasswordProfileDraft({
        email: "user@example.com",
        password: "password123",
        firstName: "",
        dob: "",
        country: "",
        gender: "",
        referralSource: "",
      }),
    ).toBe(true);
  });

  it("does not redirect to signup after an account was created and the draft was cleared", () => {
    expect(
      shouldRedirectMissingEmailDraftToSignup({
        userId: null,
        isDraft: false,
        accountCreated: true,
      }),
    ).toBe(false);
  });
});
