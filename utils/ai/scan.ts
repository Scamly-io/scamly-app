/**
 * Scan image Utility Module for Scamly
 *
 * Centralizes functions related to scanning images for scams.
 * Used within (tabs)/scan/
 *
 * Key principles:
 * - Handles uploading images to S3
 * - Handles Scanning images using Google GenAI
 * - Current model: Gemini 3 Flash Preview
 */

import type { ScanStage } from "@/utils/analytics";
import { trackScanFailed } from "@/utils/analytics";
import { ScanResult } from "@/utils/types";
import { captureScanError } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";

/** Edge function URL for image scan (used by tests for request contract assertions). */
export const SCAN_IMAGE_EDGE_URL =
  "https://rdrumcjwntyfnjhownbd.supabase.co/functions/v1/scan-image";

/**
 * Custom error class for scan-related errors.
 * Allows distinguishing between different failure stages (aligned with analytics `ScanStage`).
 */
export class ScanError extends Error {
  readonly stage: ScanStage;

  constructor(message: string, stage: ScanStage) {
    super(message);
    this.name = "ScanError";
    this.stage = stage;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function apiFailureStage(
  error: unknown,
): Extract<ScanStage, "quota_exceeded" | "response"> {
  if (!isRecord(error)) return "response";
  const code = typeof error.code === "string" ? error.code.toLowerCase() : "";
  const message =
    typeof error.message === "string" ? error.message.toLowerCase() : "";
  if (
    code === "quota_exceeded" ||
    code.includes("quota") ||
    message.includes("quota") ||
    message.includes("scan limit") ||
    message.includes("monthly scan limit")
  ) {
    return "quota_exceeded";
  }
  return "response";
}

export async function scanImage(imageB64: string): Promise<ScanResult> {
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  if (!session?.access_token) {
    trackScanFailed("scan_image_failed", "auth");
    throw new ScanError("Sign in required to scan images", "auth");
  }

  const accessToken = session.access_token;

  try {
    const result = await fetch(SCAN_IMAGE_EDGE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        imageB64,
      }),
    });

    let parsed: unknown;
    try {
      parsed = await result.json();
    } catch {
      trackScanFailed("scan_image_failed", "processing");
      throw new ScanError("Invalid scan response", "processing");
    }

    if (!isRecord(parsed)) {
      trackScanFailed("scan_image_failed", "processing");
      throw new ScanError("Invalid scan response", "processing");
    }

    if (parsed.success === true) {
      if (!("data" in parsed)) {
        trackScanFailed("scan_image_failed", "processing");
        throw new ScanError("Invalid scan response", "processing");
      }
      return parsed.data as ScanResult;
    }

    if (parsed.success === false) {
      const errObj = parsed.error;
      const message =
        isRecord(errObj) && typeof errObj.message === "string"
          ? errObj.message
          : "Scan failed";
      const details = isRecord(errObj) ? errObj.details : undefined;

      captureScanError(errObj, "scan_image_failed", { details });
      const stage = apiFailureStage(errObj);
      trackScanFailed("scan_image_failed", stage);
      throw new ScanError(message, stage);
    }

    trackScanFailed("scan_image_failed", "processing");
    throw new ScanError("Invalid scan response", "processing");
  } catch (error) {
    if (error instanceof ScanError) {
      throw error;
    }
    captureScanError(error, "scan_image_failed", { imageB64 });
    trackScanFailed("scan_image_failed", "processing");
    throw new ScanError("Failed to scan image", "processing");
  }
}
