import { trackScanFailed } from "@/utils/analytics";
import { captureScanError } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import type { ScanResult } from "@/utils/types";
import { ScanError, SCAN_IMAGE_EDGE_URL, scanImage } from "@/utils/ai/scan";

jest.mock("@/utils/supabase", () => ({
  supabase: {
    auth: {
      getSession: jest.fn(),
    },
  },
}));

jest.mock("@/utils/analytics", () => ({
  trackScanFailed: jest.fn(),
}));

jest.mock("@/utils/sentry", () => ({
  captureScanError: jest.fn(),
}));

const getSession = supabase.auth.getSession as jest.MockedFunction<
  typeof supabase.auth.getSession
>;

describe("scanImage", () => {
  const sampleScan: ScanResult = {
    is_scam: false,
    risk_level: "low",
    confidence: 0.9,
    detections: [],
    scan_successful: true,
    scan_failure_reason: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  describe("session / request contract", () => {
    it("should not call fetch when there is no session", async () => {
      getSession.mockResolvedValue({ data: { session: null }, error: null });

      await expect(scanImage("b64")).rejects.toMatchObject({
        name: "ScanError",
        message: "Sign in required to scan images",
        stage: "auth",
      });

      expect(global.fetch).not.toHaveBeenCalled();
      expect(trackScanFailed).toHaveBeenCalledWith("scan_image_failed", "auth");
    });

    it("should not call fetch when access_token is missing", async () => {
      getSession.mockResolvedValue({
        data: { session: { access_token: "" } as { access_token: string } },
        error: null,
      });

      await expect(scanImage("b64")).rejects.toBeInstanceOf(ScanError);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it("should POST JSON with bearer token when session exists", async () => {
      getSession.mockResolvedValue({
        data: {
          session: { access_token: "token-abc" } as { access_token: string },
        },
        error: null,
      });

      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({ success: true, data: sampleScan }),
      });

      await scanImage("img-payload");

      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        SCAN_IMAGE_EDGE_URL,
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer token-abc",
          },
          body: JSON.stringify({ imageB64: "img-payload" }),
        }),
      );
    });
  });

  describe("response parsing", () => {
    beforeEach(() => {
      getSession.mockResolvedValue({
        data: {
          session: { access_token: "tok" } as { access_token: string },
        },
        error: null,
      });
    });

    it("should return data when success is true", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({ success: true, data: sampleScan }),
      });

      await expect(scanImage("x")).resolves.toEqual(sampleScan);
    });

    it("should reject when success is true but data is absent", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({ success: true }),
      });

      await expect(scanImage("x")).rejects.toMatchObject({
        stage: "processing",
      });
      expect(trackScanFailed).toHaveBeenCalledWith("scan_image_failed", "processing");
    });

    it("should map API error to response stage and capture details", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({
          success: false,
          error: { message: "Model error", details: { code: 500 } },
        }),
      });

      await expect(scanImage("x")).rejects.toMatchObject({
        name: "ScanError",
        message: "Model error",
        stage: "response",
      });

      expect(captureScanError).toHaveBeenCalledWith(
        { message: "Model error", details: { code: 500 } },
        "scan_image_failed",
        { details: { code: 500 } },
      );
      expect(trackScanFailed).toHaveBeenCalledWith("scan_image_failed", "response");
    });

    it("should use quota_exceeded stage when error code indicates quota", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => ({
          success: false,
          error: { message: "Too many scans", code: "quota_exceeded" },
        }),
      });

      await expect(scanImage("x")).rejects.toMatchObject({
        stage: "quota_exceeded",
        message: "Too many scans",
      });
      expect(trackScanFailed).toHaveBeenCalledWith("scan_image_failed", "quota_exceeded");
    });

    it("should treat invalid JSON body as processing failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => {
          throw new SyntaxError("bad json");
        },
      });

      await expect(scanImage("x")).rejects.toMatchObject({ stage: "processing" });
      expect(trackScanFailed).toHaveBeenCalledWith("scan_image_failed", "processing");
    });

    it("should treat non-object JSON as processing failure", async () => {
      (global.fetch as jest.Mock).mockResolvedValue({
        json: async () => null,
      });

      await expect(scanImage("x")).rejects.toMatchObject({ stage: "processing" });
    });

    it("should wrap network errors as processing ScanError", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new TypeError("Failed to fetch"));

      await expect(scanImage("x")).rejects.toMatchObject({
        name: "ScanError",
        stage: "processing",
        message: "Failed to scan image",
      });
      expect(captureScanError).toHaveBeenCalled();
      expect(trackScanFailed).toHaveBeenCalledWith("scan_image_failed", "processing");
    });
  });
});
