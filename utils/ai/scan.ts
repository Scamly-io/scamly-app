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

import { ScanResult } from "@/utils/types";
import { trackScanFailed } from "@/utils/analytics";
import { captureScanError } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";

/**
 * Custom error class for scan-related errors.
 * Allows distinguishing between different failure stages.
 */
export class ScanError extends Error {
    stage: 'upload' | 'processing' | 'quota_exceeded';
    
    constructor(message: string, stage: 'upload' | 'processing' | 'quota_exceeded') {
        super(message);
        this.name = 'ScanError';
        this.stage = stage;
    }
}

export async function scanImage(
    imageB64: string,
): Promise<ScanResult> {

    // ================================================
    // Fetch scan from Suapabase Edge Function
    // ================================================

    const { data: { session } } = await supabase.auth.getSession();
    const accessToken = session.access_token;

    try {
        const result = await fetch('https://rdrumcjwntyfnjhownbd.supabase.co/functions/v1/scan-image', {
            method: "POST", 
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                imageB64,
            })
        })

        const response = await result.json();

        if (!response.success) {
            captureScanError(response.error, "scan_image_failed", { details: response.error.details });
            trackScanFailed("scan_image_failed", "response")
            throw new ScanError(response.error.message, "response");
        }
        
        // This is of type ScanResult at this stage
        return response.data as ScanResult;
    } catch (error) {
        if (error instanceof ScanError) {
            captureScanError(error, "scan_image_failed", { imageB64 });
            trackScanFailed("scan_image_failed", error.stage);
            throw error;
        }
        captureScanError(error, "scan_image_failed", { imageB64 });
        trackScanFailed("scan_image_failed", "processing");
        throw new ScanError("Failed to scan image", "processing");
    }
}