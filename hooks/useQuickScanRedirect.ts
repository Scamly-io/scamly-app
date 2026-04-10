import { isQuickScanQuery } from "@/utils/isQuickScanQuery";
import { router } from "expo-router";
import { useEffect } from "react";

const CLIPBOARD_SCAN_HREF = "/scan/clipboard";

/**
 * When the scan index route is opened with `?quickscan=true`, navigate to the clipboard quick-scan screen.
 */
export function useQuickScanRedirect(quickscan: string | string[] | undefined): void {
  useEffect(() => {
    if (!isQuickScanQuery(quickscan)) return;
    router.replace(CLIPBOARD_SCAN_HREF);
  }, [quickscan]);
}
