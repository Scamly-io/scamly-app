import {
  checkOnboardingStatus,
  checkProfileComplete,
  getInitialCollectProfileUiStep,
  getNextProfileOnboardingHref,
  ProfileNotFoundError,
  resolveOnboardingEntryPath,
} from "@/utils/onboarding";
import { supabase } from "@/utils/supabase";

jest.mock("@/utils/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

function mockProfileSingle(result: { data: unknown; error: unknown }) {
  const single = jest.fn().mockResolvedValue(result);
  const eq = jest.fn(() => ({ single }));
  const select = jest.fn(() => ({ eq }));
  (supabase.from as jest.Mock).mockReturnValue({ select });
}

describe("checkOnboardingStatus", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return true when both onboarding and app tutorial are complete", async () => {
    mockProfileSingle({
      data: { onboarding_completed: true, app_tutorial_completed: true },
      error: null,
    });

    await expect(checkOnboardingStatus("user-1")).resolves.toBe(true);
  });

  it("should return false when profile onboarding is not complete", async () => {
    mockProfileSingle({
      data: { onboarding_completed: false, app_tutorial_completed: true },
      error: null,
    });

    await expect(checkOnboardingStatus("user-1")).resolves.toBe(false);
  });

  it("should return false when app tutorial is not complete", async () => {
    mockProfileSingle({
      data: { onboarding_completed: true, app_tutorial_completed: false },
      error: null,
    });

    await expect(checkOnboardingStatus("user-1")).resolves.toBe(false);
  });

  it("should return false when app_tutorial_completed is null", async () => {
    mockProfileSingle({
      data: { onboarding_completed: true, app_tutorial_completed: null },
      error: null,
    });

    await expect(checkOnboardingStatus("user-1")).resolves.toBe(false);
  });

  it("should throw ProfileNotFoundError for PGRST116", async () => {
    mockProfileSingle({
      data: null,
      error: { code: "PGRST116", message: "No rows" },
    });

    await expect(checkOnboardingStatus("missing")).rejects.toBeInstanceOf(
      ProfileNotFoundError,
    );
  });

  it("should throw ProfileNotFoundError when no error and no data", async () => {
    mockProfileSingle({ data: null, error: null });

    await expect(checkOnboardingStatus("missing")).rejects.toBeInstanceOf(
      ProfileNotFoundError,
    );
  });

  it("should rethrow other Supabase errors", async () => {
    const err = { code: "OTHER", message: "fail" };
    mockProfileSingle({ data: null, error: err });

    await expect(checkOnboardingStatus("user-1")).rejects.toBe(err);
  });
});

describe("checkProfileComplete", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return false when any required field is empty", async () => {
    mockProfileSingle({
      data: {
        first_name: "A",
        dob: "2000-01-01",
        gender: "Male",
        country: "US",
        referral_source: "",
      },
      error: null,
    });

    await expect(checkProfileComplete("u1")).resolves.toBe(false);
  });

  it("should return true when all required fields are non-empty", async () => {
    mockProfileSingle({
      data: {
        first_name: "A",
        dob: "2000-01-01",
        gender: "Male",
        country: "US",
        referral_source: "Google",
      },
      error: null,
    });

    await expect(checkProfileComplete("u1")).resolves.toBe(true);
  });

  it("should return false on error or missing row", async () => {
    mockProfileSingle({ data: null, error: { message: "x" } });

    await expect(checkProfileComplete("u1")).resolves.toBe(false);
  });
});

describe("getInitialCollectProfileUiStep", () => {
  it("non-oAuth mirrors data step from profile", () => {
    expect(
      getInitialCollectProfileUiStep({
        dataStep: 2,
        oauth: false,
        firstNameTrim: "Ada",
        oauthWelcomeSeen: false,
      }),
    ).toBe(2);
  });

  it("oAuth with no name stays on data step 0 (name field)", () => {
    expect(
      getInitialCollectProfileUiStep({
        dataStep: 0,
        oauth: true,
        firstNameTrim: "",
        oauthWelcomeSeen: false,
      }),
    ).toBe(0);
  });

  it("oAuth at DOB step shows welcome (UI 0) until device flag is set", () => {
    expect(
      getInitialCollectProfileUiStep({
        dataStep: 1,
        oauth: true,
        firstNameTrim: "Sam",
        oauthWelcomeSeen: false,
      }),
    ).toBe(0);
  });

  it("oAuth resumes at DOB after welcome was completed", () => {
    expect(
      getInitialCollectProfileUiStep({
        dataStep: 1,
        oauth: true,
        firstNameTrim: "Sam",
        oauthWelcomeSeen: true,
      }),
    ).toBe(1);
  });

  it("oAuth never inserts welcome when profile is past DOB", () => {
    expect(
      getInitialCollectProfileUiStep({
        dataStep: 3,
        oauth: true,
        firstNameTrim: "Sam",
        oauthWelcomeSeen: false,
      }),
    ).toBe(3);
  });
});

describe("getNextProfileOnboardingHref", () => {
  it("returns collect-profile when first name missing", () => {
    expect(
      getNextProfileOnboardingHref({
        first_name: "",
        dob: "2000-01-01",
        gender: "Male",
        country: "US",
        referral_source: "Google",
      }),
    ).toBe("/onboarding/collect-profile");
  });

  it("returns null when first name, country, and referral are set (dob and gender optional)", () => {
    expect(
      getNextProfileOnboardingHref({
        first_name: "Ada",
        dob: null,
        gender: null,
        country: "US",
        referral_source: "Google",
      }),
    ).toBe(null);
  });

  it("returns collect-profile when country missing", () => {
    expect(
      getNextProfileOnboardingHref({
        first_name: "Ada",
        dob: "2000-01-01",
        gender: "Male",
        country: "",
        referral_source: "Google",
      }),
    ).toBe("/onboarding/collect-profile");
  });
});

const tutorialReadyProfile = {
  first_name: "Ada",
  dob: "2000-01-01",
  gender: "F",
  country: "US",
  referral_source: "Google",
  onboarding_completed: true,
  app_tutorial_completed: false,
} as const;

describe("resolveOnboardingEntryPath", () => {
  it("returns tutorial-offer when profile is done, email confirmed, and no stored tutorial step", () => {
    expect(
      resolveOnboardingEntryPath({
        profile: { ...tutorialReadyProfile },
        emailConfirmed: true,
        storedTutorialStep: null,
      }),
    ).toBe("/onboarding/tutorial-offer");
  });

  it("returns tutorial-how-it-works when resuming first_scan", () => {
    expect(
      resolveOnboardingEntryPath({
        profile: { ...tutorialReadyProfile },
        emailConfirmed: true,
        storedTutorialStep: "first_scan",
      }),
    ).toBe("/onboarding/tutorial-how-it-works");
  });
});
