import { getIsPremium } from "@/utils/shared/access";
import { formatDobInput, isoToDobDisplay, parseDob, toISODate } from "@/utils/shared/date";
import { getPublicIp } from "@/utils/shared/network";
import { supabase } from "@/utils/shared/supabase";

jest.mock("@/utils/shared/supabase", () => ({
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

describe("getPublicIp", () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it("should return ip string from JSON body", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ ip: "203.0.113.1" }),
    }) as unknown as typeof fetch;

    await expect(getPublicIp()).resolves.toBe("203.0.113.1");
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.ipify.org?format=json",
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("should return null when ip is not a string", async () => {
    global.fetch = jest.fn().mockResolvedValue({
      json: async () => ({ ip: 123 }),
    }) as unknown as typeof fetch;

    await expect(getPublicIp()).resolves.toBeNull();
  });

  it("should return null when fetch rejects", async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error("network")) as unknown as typeof fetch;

    await expect(getPublicIp()).resolves.toBeNull();
  });
});

describe("date utils", () => {
  describe("formatDobInput", () => {
    it("should strip non-digits and cap at 8 digits with slashes", () => {
      expect(formatDobInput("12ab34cd1990", "")).toBe("12/34/1990");
    });

    it("should return empty string when no digits", () => {
      expect(formatDobInput("abc", "")).toBe("");
    });

    it("should cap formatted output at eight digits (DD/MM/YYYY)", () => {
      expect(formatDobInput("123456789012", "")).toBe("12/34/5678");
    });
  });

  describe("parseDob", () => {
    it("should parse a valid calendar date", () => {
      const d = parseDob("15/03/1990");
      expect(d).not.toBeNull();
      expect(d!.getFullYear()).toBe(1990);
      expect(d!.getMonth()).toBe(2);
      expect(d!.getDate()).toBe(15);
    });

    it("should return null for invalid format", () => {
      expect(parseDob("1990-03-15")).toBeNull();
      expect(parseDob("1/03/1990")).toBeNull();
      expect(parseDob("")).toBeNull();
    });

    it("should return null for impossible dates", () => {
      expect(parseDob("31/02/2020")).toBeNull();
      expect(parseDob("00/01/2020")).toBeNull();
      expect(parseDob("01/13/2020")).toBeNull();
    });
  });

  describe("toISODate", () => {
    it("should format local date as YYYY-MM-DD", () => {
      const d = new Date(2024, 0, 5);
      expect(toISODate(d)).toBe("2024-01-05");
    });
  });

  describe("isoToDobDisplay", () => {
    it("should convert ISO date to DD/MM/YYYY", () => {
      expect(isoToDobDisplay("2024-01-05")).toBe("05/01/2024");
    });

    it("should return empty string for non-ISO input", () => {
      expect(isoToDobDisplay("05/01/2024")).toBe("");
      expect(isoToDobDisplay("")).toBe("");
    });
  });
});

