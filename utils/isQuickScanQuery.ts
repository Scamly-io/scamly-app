/**
 * True when the `quickscan` search param enables Quick Scan (deeplink `scamlyapp://scan?quickscan=true`).
 * Handles Expo Router shapes: string, repeated keys as string[], or absent.
 */
export function isQuickScanQuery(value: string | string[] | undefined): boolean {
  if (value === undefined) return false;
  const v = Array.isArray(value) ? value[0] : value;
  return typeof v === "string" && v.toLowerCase() === "true";
}
