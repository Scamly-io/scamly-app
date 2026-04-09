import {
  checkOnboardingStatus,
  checkProfileComplete,
  ProfileNotFoundError,
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

  it("should return true when onboarding_completed is true", async () => {
    mockProfileSingle({
      data: { onboarding_completed: true },
      error: null,
    });

    await expect(checkOnboardingStatus("user-1")).resolves.toBe(true);
  });

  it("should return false when onboarding_completed is false", async () => {
    mockProfileSingle({
      data: { onboarding_completed: false },
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
