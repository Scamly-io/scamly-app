export interface ScanResult {
    is_scam: boolean;
    risk_level: "low" | "medium" | "high";
    confidence: number;
    detections: {
        category: string;
        description: string;
        severity: "low" | "medium" | "high";
    }[];
    scan_successful: boolean;
    scan_failure_reason: string | null;
}