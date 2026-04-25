import { onboardingHref } from "./onboarding-href";

describe("onboardingHref", () => {
  it("returns a href value for known route strings", () => {
    const h = onboardingHref("/onboarding/name");
    expect(typeof h).toBe("string");
    expect(h).toBe("/onboarding/name");
  });
});
