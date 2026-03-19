import { captureError } from "@/utils/sentry";
import Purchases, { CustomerInfo, LOG_LEVEL, PurchasesPackage } from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";

export const SCAMLY_PREMIUM_ENTITLEMENT_ID = "Scamly Premium";
export const SCAMLY_MONTHLY_PACKAGE_ID = "scamly_premium_monthly";
export const SCAMLY_YEARLY_PACKAGE_ID = "scamly_premium_yearly";

const REVENUECAT_API_KEY =
  process.env.EXPO_PUBLIC_REVENUECAT_API_KEY || "appl_EElVohkhYSlZEQtkRyVobgwLfIt";

let isConfigured = false;
let configuredUserId: string | null = null;

function getReadableErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return "An unexpected subscription error occurred.";
}

export async function initializeRevenueCat(appUserId: string | null): Promise<void> {
  if (!REVENUECAT_API_KEY) {
    throw new Error("RevenueCat API key is missing.");
  }

  if (!isConfigured) {
    if (__DEV__) {
      Purchases.setLogLevel(LOG_LEVEL.DEBUG);
    }
    Purchases.configure({
      apiKey: REVENUECAT_API_KEY,
      appUserID: appUserId ?? undefined,
    });
    isConfigured = true;
    configuredUserId = appUserId;
    return;
  }

  if (appUserId && configuredUserId !== appUserId) {
    await Purchases.logIn(appUserId);
    configuredUserId = appUserId;
    return;
  }

  if (!appUserId && configuredUserId) {
    await Purchases.logOut();
    configuredUserId = null;
  }
}

export async function getRevenueCatCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

export function hasScamlyPremiumEntitlement(customerInfo: CustomerInfo): boolean {
  return Boolean(customerInfo.entitlements.active[SCAMLY_PREMIUM_ENTITLEMENT_ID]);
}

export async function getScamlyPackages(): Promise<{
  monthly: PurchasesPackage | null;
  yearly: PurchasesPackage | null;
}> {
  const offerings = await Purchases.getOfferings();
  const currentOffering = offerings.current;

  if (!currentOffering) {
    return { monthly: null, yearly: null };
  }

  return {
    monthly:
      currentOffering.availablePackages.find(
        (pkg) => pkg.identifier === SCAMLY_MONTHLY_PACKAGE_ID
      ) ?? null,
    yearly:
      currentOffering.availablePackages.find((pkg) => pkg.identifier === SCAMLY_YEARLY_PACKAGE_ID) ??
      null,
  };
}

export async function purchaseScamlyPackage(
  packageIdentifier: typeof SCAMLY_MONTHLY_PACKAGE_ID | typeof SCAMLY_YEARLY_PACKAGE_ID
): Promise<CustomerInfo> {
  const { monthly, yearly } = await getScamlyPackages();
  const selectedPackage = packageIdentifier === SCAMLY_MONTHLY_PACKAGE_ID ? monthly : yearly;

  if (!selectedPackage) {
    throw new Error(`RevenueCat package '${packageIdentifier}' was not found in current offering.`);
  }

  const { customerInfo } = await Purchases.purchasePackage(selectedPackage);
  return customerInfo;
}

export async function restoreScamlyPurchases(): Promise<CustomerInfo> {
  return Purchases.restorePurchases();
}

export async function presentScamlyPaywallIfNeeded(): Promise<{
  result: PAYWALL_RESULT;
  didUnlockEntitlement: boolean;
}> {
  const result = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: SCAMLY_PREMIUM_ENTITLEMENT_ID,
  });

  const didUnlockEntitlement =
    result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;

  return { result, didUnlockEntitlement };
}

export async function presentScamlyPaywall(): Promise<PAYWALL_RESULT> {
  return RevenueCatUI.presentPaywall();
}

export async function presentScamlyCustomerCenter(): Promise<void> {
  await RevenueCatUI.presentCustomerCenter();
}

export function trackRevenueCatError(action: string, error: unknown): string {
  captureError(error, {
    feature: "purchase",
    action,
    severity: "warning",
  });
  return getReadableErrorMessage(error);
}
