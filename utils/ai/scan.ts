import { ScanResult } from "@/types/scanResult";
import { trackScanFailed } from "@/utils/analytics";
import { captureDataFetchError, captureScanError } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import OpenAI from "openai";

const openai = new OpenAI({
    apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
});

/**
 * Custom error class for scan-related errors.
 * Allows us to distinguish between different failure stages.
 */
export class ScanError extends Error {
    stage: 'upload' | 'processing' | 'quota_exceeded';
    
    constructor(message: string, stage: 'upload' | 'processing' | 'quota_exceeded') {
        super(message);
        this.name = 'ScanError';
        this.stage = stage;
    }
}

const systemPrompt = `
  You are an AI scam detection tool. Your role is to analyze screenshots of text messages, emails, social media posts, advertisements, or other online media to determine if they are scams. Generate an output according to the provided schema.

  Your output must reflect careful reasoning and cautious judgment, as users may trust your assessment. You should analyze tone, urgency, language patterns, sender identity, formatting, links, and overall message structure to decide if the content is fraudulent, suspicious, or safe.

  Rules:
  1. Purpose: Identify potential scams and assess their likelihood and risk level based on scam indicators such as requests for money, urgency, impersonation, links, or poor grammar.
  2. Confidence: Provide a confidence score representing how certain you are in your judgment (in whole numbers 0 to 99). It must never be 100%. Base this on the strength of your evidence and clarity of the scam indicators, not randomness.
  3. Risk level:
    - "low" → content appears legitimate or no strong scam indicators.
    - "medium" → some suspicious traits or uncertain legitimacy.
    - "high" → clear or multiple strong scam indicators.
  4. isScam:
    - true for "medium" or "high" risk.
    - false for "low" risk.
    - never false for "high" risk.
  5. Detections (3–6 items):
    - Each detection highlights a specific clue or pattern that supports your assessment.
    - Include a "category" (e.g., Grammar, Tone, Sender, Link, Offer, Format, Credibility),
      a short descriptive "description" explaining what was noticed,
      and a "severity" of "low", "medium", or "high" showing how you believe it contributes to the legitmacy. Low risk detections are things that positively influence the legitimacy, and vice versa.
    - Example:
      { "category": "Urgency", "description": "Message pressures user to act immediately or lose access", "severity": "high" }
  6. Caution: When uncertain, lean toward treating the content as a potential scam, but explain your reasoning clearly through detections and confidence level.
  7. Success: If you are unable to properly assess the content (for example, due to poor image quality, unreadable text, or missing information), set "scan_successful" to false and include a short, user-readable explanation in "scan_failure_reason". If the scan is successful, set "scan_successful" to true and "scan_failure_reason" to null.
  8. Relevance: If a user provides an image that is not related to any form of online media communication (a selfie, a picture of a dog, explicit images). Set "scan_successful" to false and set "scan_failure_reason" to "You have provided an image that is not related to detecting a scam." 

  Output only valid data according to the provided schema. Do not include extra commentary, reasoning steps, or text outside the structured result.
`

// DO NOT ADJUST
const JSONSchema = {
  "type": "object",
  "properties": {
    "is_scam": {
      "type": "boolean",
      "description": "Whether the content is determined to be a scam or not."
    },
    "risk_level": {
      "type": "string",
      "enum": ["low", "medium", "high"],
      "description": "The assessed risk level based on the likelihood of a scam."
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 99,
      "description": "Confidence score (never 100) reflecting how certain the detection is."
    },
    "detections": {
      "type": "array",
      "minItems": 2,
      "maxItems": 6,
      "items": {
        "type": "object",
        "properties": {
          "category": {
            "type": "string",
            "description": "Category of the finding (e.g., grammar, link, tone, sender, urgency)."
          },
          "description": {
            "type": "string",
            "description": "Short explanation of what was detected."
          },
          "severity": {
            "type": "string",
            "enum": ["low", "medium", "high"],
            "description": "Severity of the detection based on its influence on the scam likelihood."
          }
        },
        "required": ["category", "description", "severity"],
        "additionalProperties": false
      }
    },
    "scan_successful": {
      "type": "boolean",
      "description": "True if the scan was performed successfully; false if not enough information was available."
    },
    "scan_failure_reason": {
      "type": ["string", "null"],
      "description": "If scan_successful is false, provide a short reason; otherwise null."
    }
  },
  "required": [
    "is_scam",
    "risk_level",
    "confidence",
    "detections",
    "scan_successful",
    "scan_failure_reason"
  ],
  "additionalProperties": false
}

const model = "gpt-5-mini" // Snapshot model that will not change behaviour. Can be updated if OpenAI release new models.

function getUserBillingPeriod(createdAt: string | Date): { periodStart: Date, nextPeriodStart: Date } {
    const created = new Date(createdAt);
    const now = new Date();
  
    // Build period start in UTC
    let periodStart = new Date(Date.UTC(
        now.getUTCFullYear(),
        created.getUTCMonth(),
        created.getUTCDate(),
        0, 0, 0, 0
    ));
  
    // Go back one month if the user has not reached the anniversary yet.
    if (periodStart > now) {
        periodStart = new Date(Date.UTC(
            now.getUTCFullYear(),
            created.getUTCMonth() - 1,
            created.getUTCDate(),
            0, 0, 0, 0
        ));
    }
  
    const nextPeriodStart = new Date(Date.UTC(
        periodStart.getUTCFullYear(),
        periodStart.getUTCMonth() + 1,
        periodStart.getUTCDate(),
        0, 0, 0, 0
    ));
  
    return { periodStart, nextPeriodStart };
}

export async function scanImage(
    imageUrl: string, 
    userId: string, 
    imageBlob: Blob, 
    fileName: string,
    freeTierScanLimit: number
): Promise<ScanResult> {

    // ===============================
    // Upload image to S3 temp and main buckets
    // ===============================
    try {
        let mainUploadUrl = "";
        let tempUploadUrl = "";

        const response = await fetch(
            "https://0i3wpw1lxk.execute-api.ap-southeast-2.amazonaws.com/dev/upload",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fileName }),
            }
        );

        if (!response.ok) {
            captureDataFetchError(
                new Error("Non 200 response from S3 upload URLs lambda function"), 
                "scan", 
                "get_upload_urls", 
                "critical", 
                { response_status: response.status }
            );
            throw new ScanError("Failed to get upload URLs from Lambda function", "upload");
        }

        const data = await response.json();
        mainUploadUrl = data.upload_url_main;
        tempUploadUrl = data.upload_url_temp;

        const [uploadMainResponse, uploadTempResponse] = await Promise.all([
            fetch(mainUploadUrl, {
                method: "PUT",
                headers: { "Content-Type": "image/jpeg" },
                body: imageBlob,
            }),
            fetch(tempUploadUrl, {
                method: "PUT",
                headers: { "Content-Type": "image/jpeg" },
                body: imageBlob,
            }),
        ]);

        if (!uploadMainResponse.ok || !uploadTempResponse.ok) {
            captureDataFetchError(
                new Error("Non 200 response from S3 upload images lambda function"), 
                "scan", 
                "upload_image", 
                "critical", 
                { response_status: uploadMainResponse.status, response_status_temp: uploadTempResponse.status }
            );
            throw new ScanError(`Failed to upload images to S3: main=${uploadMainResponse.status}, temp=${uploadTempResponse.status}`, "upload");
        }
    } catch (error) {
        // Re-throw ScanError as-is, wrap other errors
        if (error instanceof ScanError) {
            captureScanError(error, "upload_image", { fileName });
            trackScanFailed("upload_failed", "upload");
            throw error;
        }
        // Wrap unexpected errors
        captureScanError(error, "upload_image", { fileName });
        trackScanFailed("upload_failed", "upload");
        throw new ScanError("Failed to upload image", "upload");
    }

    // ===============================
    // Check user quota
    // ===============================
    try {
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("subscription_plan, created_at")
            .eq("id", userId)
            .single();
        
        if (profileError || !profile) {
            throw new ScanError(`Failed to get user profile for scan: ${profileError?.message || "No profile found"}`, "processing");
        }

        if (profile.subscription_plan === "free") {
            const { periodStart, nextPeriodStart } = getUserBillingPeriod(profile.created_at);
        
            const { count } = await supabase
                .from("scans")
                .select("*", { count: "exact", head: true })
                .eq("user_id", userId)
                .gte("created_at", periodStart.toISOString())
                .lt("created_at", nextPeriodStart.toISOString());
        
            if (count !== null && count >= freeTierScanLimit) {
                throw new ScanError("Free user scan limit reached", "quota_exceeded");
            }
        }
    } catch (error) {
        if (error instanceof ScanError) {
            captureScanError(error, "check_quota", { userId });
            trackScanFailed(error.stage === "quota_exceeded" ? "quota_exceeded" : "quota_check_failed", "processing");
            throw error;
        }
        captureScanError(error, "check_quota", { userId });
        trackScanFailed("quota_check_failed", "processing");
        throw new ScanError("Failed to check scan quota", "processing");
    }

    // ===============================
    // Scan image with OpenAI
    // ===============================
    try {
        const response = await openai.responses.create({
            model: model,
            instructions: systemPrompt,
            input: [
                {
                    role: "user",
                    content: [
                        {
                            type: "input_image",
                            image_url: imageUrl
                        }
                    ]
                }
            ],
            text: {
                format: {
                    type: "json_schema",
                    name: "ScanResults",
                    schema: JSONSchema,
                    strict: true
                }
            }
        });
        
        if (!response || !response.output_text) {
            throw new ScanError("OpenAI returned no data", "processing");
        }

        // Store scan result in database (non-blocking - errors are logged but don't fail the scan)
        const { error: scanInsertError } = await supabase
            .from("scans")
            .insert({
                user_id: userId,
                output: response.output_text,
                response_id: response.id
            });
    
        if (scanInsertError) {
            captureDataFetchError(scanInsertError, "scan", "insert_scan", "warning", { user_id: userId, response_id: response.id });
        }
        
        // Parse the response - output_text is already a JSON string
        const scanResults: ScanResult = JSON.parse(response.output_text);

        return scanResults;

    } catch (error) {
        if (error instanceof ScanError) {
            captureScanError(error, "scan_image", { imageUrl, userId, fileName });
            trackScanFailed("scan_api_error", "processing");
            throw error;
        }
        // Handle JSON parse errors or other unexpected errors
        captureScanError(error, "scan_image", { imageUrl, userId, fileName });
        trackScanFailed("scan_api_error", "processing");
        throw new ScanError("Failed to process scan results", "processing");
    }
}