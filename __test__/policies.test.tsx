import { renderHook, waitFor } from "@testing-library/react-native";

import { useLatestPolicy } from "@/hooks/useLatestPolicy";
import { fetchLatestPolicy, parsePolicyContent } from "@/utils/shared/policies";
import { captureDataFetchError } from "@/utils/shared/sentry";
import { supabase } from "@/utils/shared/supabase";

jest.mock("@/utils/shared/supabase", () => ({
  supabase: {
    from: jest.fn(),
  },
}));

jest.mock("@/utils/shared/sentry", () => ({
  captureDataFetchError: jest.fn(),
}));

jest.mock("@/utils/shared/policies", () => {
  const actual = jest.requireActual("@/utils/shared/policies");
  return {
    ...actual,
    fetchLatestPolicy: jest.fn(),
  };
});

const fetchLatestPolicyMock = fetchLatestPolicy as jest.MockedFunction<typeof fetchLatestPolicy>;

function mockPoliciesQuery(result: { data: unknown; error: unknown }) {
  const maybeSingle = jest.fn().mockResolvedValue(result);
  const limit = jest.fn(() => ({ maybeSingle }));
  const order = jest.fn(() => ({ limit }));
  const eq = jest.fn(() => ({ order }));
  const select = jest.fn(() => ({ eq }));
  (supabase.from as jest.Mock).mockReturnValue({ select });
}

describe("parsePolicyContent", () => {
  it("should return null for non-array input", () => {
    expect(parsePolicyContent(null)).toBeNull();
    expect(parsePolicyContent({})).toBeNull();
  });

  it("should accept valid policy sections and floor levels", () => {
    const raw = [
      {
        title: "Intro",
        sections: [
          { level: 1.9, text: "A" },
          { level: -2, text: "B" },
        ],
      },
    ];
    const parsed = parsePolicyContent(raw);
    expect(parsed).toEqual([
      {
        title: "Intro",
        sections: [
          { level: 1, text: "A" },
          { level: 0, text: "B" },
        ],
      },
    ]);
  });

  it("should return null when a section row is malformed", () => {
    expect(parsePolicyContent([{ title: "T", sections: [{ level: "x", text: "a" }] }])).toBeNull();
    expect(parsePolicyContent([{ title: 1, sections: [] }])).toBeNull();
  });
});

describe("fetchLatestPolicy", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should return error from Supabase unchanged", async () => {
    const dbError = { message: "boom" };
    mockPoliciesQuery({ data: null, error: dbError });

    // Use the real implementation for this block.
    const actual = jest.requireActual<typeof import("@/utils/shared/policies")>("@/utils/shared/policies");
    const out = await actual.fetchLatestPolicy("privacy");

    expect(out.data).toBeNull();
    expect(out.error).toBe(dbError);
    expect(supabase.from).toHaveBeenCalledWith("policies");
  });
});

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
    expect(captureDataFetchError).toHaveBeenCalledWith(err, "home", "fetch_policy_terms", "warning");
  });

  it("should treat empty data as failure without Sentry when error is null", async () => {
    fetchLatestPolicyMock.mockResolvedValue({ data: null, error: null });

    const { result } = renderHook(() => useLatestPolicy("privacy"));

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.loadFailed).toBe(true);
    expect(captureDataFetchError).not.toHaveBeenCalled();
  });
});

