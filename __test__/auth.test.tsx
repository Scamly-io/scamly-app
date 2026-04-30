import ProtectedRoute from "@/components/ProtectedRoute";
import { render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

import {
  isEmailPasswordProfileDraft,
  shouldRedirectMissingEmailDraftToSignup,
} from "@/utils/auth/signup-profile-draft";
import {
  onboardingProfileSchema,
  signInSchema,
  signUpSchema,
  signUpStep1Schema,
} from "@/utils/auth/auth";

const mockReplace = jest.fn();

const authState: {
  user: { id: string } | null;
  loading: boolean;
  onboardingComplete: boolean | null;
} = {
  user: null,
  loading: false,
  onboardingComplete: null,
};

let mockSegments: string[] = ["(tabs)", "home"];

jest.mock("expo-router", () => ({
  useRouter: () => ({ replace: mockReplace }),
  useSegments: () => mockSegments,
}));

jest.mock("@/contexts/AuthContext", () => ({
  useAuth: () => authState,
}));

jest.mock("@/theme", () => ({
  useTheme: () => ({
    colors: { background: "#fff", accent: "#000" },
  }),
}));

describe("ProtectedRoute", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    authState.user = null;
    authState.loading = false;
    authState.onboardingComplete = null;
    mockSegments = ["(tabs)", "home"];
  });

  it("should navigate to login when unauthenticated outside auth group", async () => {
    authState.user = null;
    mockSegments = ["(tabs)", "home"];

    render(
      <ProtectedRoute>
        <Text>Secret</Text>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/login");
    });
  });

  it("should navigate to onboarding when authenticated but incomplete", async () => {
    authState.user = { id: "u1" };
    authState.onboardingComplete = false;
    mockSegments = ["(tabs)", "home"];

    render(
      <ProtectedRoute>
        <Text>Secret</Text>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/onboarding");
    });
  });

  it("should navigate home when authenticated user is on auth route and onboarding complete", async () => {
    authState.user = { id: "u1" };
    authState.onboardingComplete = true;
    mockSegments = ["(auth)", "login"];

    render(
      <ProtectedRoute>
        <Text>Secret</Text>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(mockReplace).toHaveBeenCalledWith("/home");
    });
  });

  it("should not redirect away from onboarding while in auth group", async () => {
    authState.user = { id: "u1" };
    authState.onboardingComplete = false;
    mockSegments = ["(auth)", "onboarding"];

    render(
      <ProtectedRoute>
        <Text>Onboarding</Text>
      </ProtectedRoute>
    );

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });
});

describe("auth schemas", () => {
  describe("signInSchema", () => {
    it("should accept valid credentials", () => {
      const r = signInSchema.safeParse({
        email: "a@b.co",
        password: "secret",
      });
      expect(r.success).toBe(true);
    });

    it("should reject invalid email and short password", () => {
      expect(signInSchema.safeParse({ email: "nope", password: "12345" }).success).toBe(false);
    });
  });

  describe("signUpStep1Schema", () => {
    it("should enforce signup password minimum length 8", () => {
      expect(signUpStep1Schema.safeParse({ email: "a@b.co", password: "1234567" }).success).toBe(false);
      expect(signUpStep1Schema.safeParse({ email: "a@b.co", password: "12345678" }).success).toBe(true);
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
        }).success
      ).toBe(true);
    });
  });
});

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
      })
    ).toBe(true);
  });

  it("does not redirect to signup after an account was created and the draft was cleared", () => {
    expect(
      shouldRedirectMissingEmailDraftToSignup({
        userId: null,
        isDraft: false,
        accountCreated: true,
      })
    ).toBe(false);
  });
});

