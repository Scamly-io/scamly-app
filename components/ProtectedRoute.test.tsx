import ProtectedRoute from "@/components/ProtectedRoute";
import { render, waitFor } from "@testing-library/react-native";
import { Text } from "react-native";

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
      </ProtectedRoute>,
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
      </ProtectedRoute>,
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
      </ProtectedRoute>,
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
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(mockReplace).not.toHaveBeenCalled();
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
