// ===============================
// Schema types
// ===============================

/**
 * Scan result schema
 * Uses: utils/ai/scan.ts, (tabs)/scan.tsx
 */
export interface ScanResult {
    is_scam: boolean;
    risk_level: "low" | "medium" | "high";
    confidence: number;
    detections: {
        description: string;
        details: string;
        severity: "low" | "medium" | "high";
    }[];
    scan_successful: boolean;
    scan_failure_reason: string | null;
}

/**
 * Search result schema
 * Uses: (tabs)/info-search.tsx, utils/ai/search.ts
 */ 
export interface SearchResult {
    company_name: string;
    local_phone_number: string;
    international_phone_number: string;
    website_domain: string;
    contact_us_page: string;
    found_all_fields: boolean;
    missing_fields: string[];
}