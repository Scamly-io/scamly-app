import { useLatestPolicy } from "@/hooks/useLatestPolicy";
import { fetchLatestPolicy } from "@/utils/policies";
import { captureDataFetchError } from "@/utils/sentry";
import { renderHook, waitFor } from "@testing-library/react-native";

jest.mock("@/utils/policies", () => ({
  fetchLatestPolicy: jest.fn(),
}));

jest.mock("@/utils/sentry", () => ({
  captureDataFetchError: jest.fn(),
}));

const fetchLatestPolicyMock = fetchLatestPolicy as jest.MockedFunction<
  typeof fetchLatestPolicy
>;

describe("useLatestPolicy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should expose policy and clear failure when fetch succeeds", async () => {
    const payload = {
      content: [{ title: "T", sections: [{ level: 0, text: "x" }] }],
      version: "1.0.0",
    };
    fetchLatestPolicyMock.mockResolvedValue({ data: payload, error: null });

    const { result } = renderHook(() => useLatestPolicy("privacy"));

    expect(result.current.loading).toBe(true);

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.policy).toEqual(payload);
    expect(result.current.loadFailed).toBe(false);
    expect(captureDataFetchError).not.toHaveBeenCalled();
  });

  it("should set loadFailed and report to Sentry when fetch returns error", async () => {
    const err = new Error("db");
    fetchLatestPolicyMock.mockResolvedValue({ data: null, error: err });

    const { result } = renderHook(() => useLatestPolicy("terms"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.policy).toBeNull();
    expect(result.current.loadFailed).toBe(true);
    expect(captureDataFetchError).toHaveBeenCalledWith(
      err,
      "home",
      "fetch_policy_terms",
      "warning",
    );
  });

  it("should treat empty data as failure without Sentry when error is null", async () => {
    fetchLatestPolicyMock.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useLatestPolicy("privacy"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.loadFailed).toBe(true);
    expect(captureDataFetchError).not.toHaveBeenCalled();
  });
});
