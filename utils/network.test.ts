import { getPublicIp } from "@/utils/network";

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
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
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
