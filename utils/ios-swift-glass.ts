import { Platform } from "react-native";

/**
 * Major iOS version from `Platform.Version`, or null when not iOS / unparsable.
 */
export function getIosMajorVersion(): number | null {
  if (Platform.OS !== "ios") return null;
  const v = Platform.Version as string | number;
  if (typeof v === "number" && Number.isFinite(v)) return Math.floor(v);
  if (typeof v === "string") {
    const major = parseInt(v.split(".")[0] ?? "", 10);
    return Number.isFinite(major) ? major : null;
  }
  return null;
}

/**
 * SwiftUI `buttonStyle('glass' | 'glassProminent')` and related Liquid Glass APIs
 * are documented for iOS 26+ (Xcode 26). Use this guard before rendering Expo UI glass controls.
 */
export function supportsIos26SwiftGlass(): boolean {
  const major = getIosMajorVersion();
  return major !== null && major >= 26;
}
