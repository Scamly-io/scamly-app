import { getIsPremium } from "@/utils/access";
import { supabase } from "@/utils/supabase";

jest.mock("@/utils/supabase", () => ({
  supabase: {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(),
  },
}));

describe("getIsPremium", () => {
  const getUser = supabase.auth.getUser as jest.Mock;
  const from = supabase.from as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockProfileRow(subscription_plan: string | null) {
    const single = jest.fn().mockResolvedValue({
      data: subscription_plan != null ? { subscription_plan } : null,
      error: null,
    });
    const eq = jest.fn(() => ({ single }));
    const select = jest.fn(() => ({ eq }));
    from.mockReturnValue({ select });
  }

  it("should return false when getUser fails", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: new Error("auth") });

    await expect(getIsPremium()).resolves.toBe(false);
    expect(from).not.toHaveBeenCalled();
  });

  it("should return false when profile missing", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    const single = jest.fn().mockResolvedValue({ data: null, error: { message: "x" } });
    const eq = jest.fn(() => ({ single }));
    const select = jest.fn(() => ({ eq }));
    from.mockReturnValue({ select });

    await expect(getIsPremium()).resolves.toBe(false);
  });

  it("should return false for free plan", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockProfileRow("free");

    await expect(getIsPremium()).resolves.toBe(false);
  });

  it("should return true for premium-monthly", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "u1" } }, error: null });
    mockProfileRow("premium-monthly");

    await expect(getIsPremium()).resolves.toBe(true);
  });
});
