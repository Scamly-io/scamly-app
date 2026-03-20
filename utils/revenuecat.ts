import { captureError } from "@/utils/sentry";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Platform } from "react-native";
import Purchases, { CustomerInfo, LOG_LEVEL, PromotionalOffer, PurchasesPackage } from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";


export const SCAMLY_PREMIUM_ENTITLEMENT_ID = "Scamly Premium";
export const SCAMLY_MONTHLY_PACKAGE_ID = "$rc_monthly";
export const SCAMLY_YEARLY_PACKAGE_ID = "$rc_yearly";
export const EARLY_INTEREST_PROMO_OFFER_ID_YEARLY = "early_interest_yearly";
export const EARLY_INTEREST_PROMO_OFFER_ID_MONTHLY = "early_interest_monthly";

export const EARLY_INTEREST_STORAGE_KEY = "early_interest_user";

const REVENUECAT_API_KEY =
  Platform.OS === "ios"
    ? "appl_EElVohkhYSlZEQtkRyVobgwLfIt"
    : Platform.OS === "android"
    ? "goog_kpAKBeifirsalQZVyHGphyVeWId"
    : "";

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

// Must also set an async storage attribute as revenuecat will never return this tag.
export async function tagEarlyInterestUser(): Promise<void> {
  try {
    await Purchases.setAttributes({ early_interest: "true" });
  } catch (error) {
    trackRevenueCatError("tagEarlyInterestUser", error);
  }
}

// Must set AsyncStorage.setItem(EARLY_INTEREST_STORAGE_KEY, "true"); when a user enters the early interest code.
export async function isEarlyInterestUser(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(EARLY_INTEREST_STORAGE_KEY);
    return value === "true";
  } catch (error) {
    trackRevenueCatError("isEarlyInterestUser", error);
    return false;
  }
}

export async function getEarlyInterestPromoOffer(
  pkg: PurchasesPackage
): Promise<PromotionalOffer | null> {
  if (Platform.OS !== "ios") return null;

  // Pick the right offer ID based on which package we're looking at
  const offerIdentifier =
    pkg.identifier === SCAMLY_MONTHLY_PACKAGE_ID
      ? EARLY_INTEREST_PROMO_OFFER_ID_MONTHLY
      : EARLY_INTEREST_PROMO_OFFER_ID_YEARLY;

  const discount = pkg.product.discounts?.find(
    (d) => d.identifier === offerIdentifier
  );

  if (!discount) {
    return null;
  }

  try {
    const promoOffer = await Purchases.getPromotionalOffer(
      pkg.product,
      discount
    );
    return promoOffer ?? null;
  } catch (error) {
    trackRevenueCatError("getEarlyInterestPromoOffer", error);
    return null;
  }
}

export async function purchaseWithEarlyInterestPromo(
  packageIdentifier: typeof SCAMLY_MONTHLY_PACKAGE_ID | typeof SCAMLY_YEARLY_PACKAGE_ID,
  promoOffer: PromotionalOffer
): Promise<CustomerInfo> {
  const { monthly, yearly } = await getScamlyPackages();

  const selectedPackage =
    packageIdentifier === SCAMLY_MONTHLY_PACKAGE_ID ? monthly : yearly;

  if (!selectedPackage) {
    throw new Error(`Package '${packageIdentifier}' not found.`);
  }

  const { customerInfo } = await Purchases.purchaseDiscountedPackage(
    selectedPackage,
    promoOffer
  );
  return customerInfo;
}

export async function handleEarlyInterestPromoOffer(): Promise<void> {
  try {
    // We need to know which package they just bought to fetch the right promo offer.
    // Get the active subscription period from customerInfo.
    const customerInfo = await getRevenueCatCustomerInfo();

    const activeSub = customerInfo.activeSubscriptions[0];

    const packageIdentifier = activeSub?.includes("yearly")
      ? SCAMLY_YEARLY_PACKAGE_ID
      : SCAMLY_MONTHLY_PACKAGE_ID;

    const { monthly, yearly } = await getScamlyPackages();
    const pkg = packageIdentifier === SCAMLY_YEARLY_PACKAGE_ID ? yearly : monthly;

    if (!pkg) {
      Alert.alert("Success", "Your premium subscription is now active.");
      return;
    }

    const promoOffer = await getEarlyInterestPromoOffer(pkg);
    if (!promoOffer) {
      // Offer not available — just show the normal success alert
      Alert.alert("Success", "Your premium subscription is now active.");
      return;
    }

    // Show the early interest offer UI
    Alert.alert(
      "🎉 Early Supporter Offer",
      "Thanks for being an early supporter! Claim your exclusive discount now.",
      [
        {
          text: "Claim Discount",
          onPress: async () => {
            try {
              await purchaseWithEarlyInterestPromo(packageIdentifier, promoOffer);
              await AsyncStorage.removeItem(EARLY_INTEREST_STORAGE_KEY);
              await AsyncStorage.removeItem("promoCode");
              Alert.alert("Success", "Your early supporter discount has been applied!");
            } catch (error) {
              const message = trackRevenueCatError("purchase_promo_offer", error);
              Alert.alert("Error", message);
            }
          },
        },
        {
          text: "No thanks",
          style: "cancel",
          onPress: async () => {
            await AsyncStorage.removeItem(EARLY_INTEREST_STORAGE_KEY);
            await AsyncStorage.removeItem("promoCode");
            Alert.alert("Success", "Your premium subscription is now active.");
          },
        },
      ]
    );
  } catch (error) {
    // If anything goes wrong fetching the promo, fall back gracefully
    trackRevenueCatError("handleEarlyInterestPromoOffer", error);
    Alert.alert("Success", "Your premium subscription is now active.");
  }
};

export async function getRevenueCatCustomerInfo(): Promise<CustomerInfo> {
  return Purchases.getCustomerInfo();
}

export function hasScamlyPremiumEntitlement(customerInfo: CustomerInfo): boolean {
  return Boolean(customerInfo.entitlements.active[SCAMLY_PREMIUM_ENTITLEMENT_ID]);
}

export async function getScamlyPackages(offeringId?: string): Promise<{
  monthly: PurchasesPackage | null;
  yearly: PurchasesPackage | null;
}> {
  const offerings = await Purchases.getOfferings();

  const selectedOffering = (offeringId && offerings.all[offeringId]) || offerings.current;

  if (!selectedOffering) {
    return { monthly: null, yearly: null };
  }

  return {
    monthly:
      selectedOffering.availablePackages.find(
        (pkg) => pkg.identifier === SCAMLY_MONTHLY_PACKAGE_ID
      ) ?? null,
    yearly:
      selectedOffering.availablePackages.find(
        (pkg) => pkg.identifier === SCAMLY_YEARLY_PACKAGE_ID) ??
      null,
  };
}

export async function purchaseScamlyPackage(
  packageIdentifier: typeof SCAMLY_MONTHLY_PACKAGE_ID | typeof SCAMLY_YEARLY_PACKAGE_ID,
  offeringId?: string | null
): Promise<CustomerInfo> {
  const { monthly, yearly } = await getScamlyPackages(offeringId ?? undefined);

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

export async function presentScamlyPaywallIfNeeded(offeringId?: string): Promise<{
  result: PAYWALL_RESULT;
  didUnlockEntitlement: boolean;
}> {
  let offering = undefined;

  if (offeringId) {
    const offerings = await Purchases.getOfferings();
    offering = offerings.all[offeringId] ?? undefined;
  }

  const result = await RevenueCatUI.presentPaywallIfNeeded({
    requiredEntitlementIdentifier: SCAMLY_PREMIUM_ENTITLEMENT_ID,
    offering,
  });

  const didUnlockEntitlement =
    result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;

  return { result, didUnlockEntitlement };
}

export async function presentScamlyPaywall(offeringId?: string): Promise<PAYWALL_RESULT> {
  return RevenueCatUI.presentPaywall({ offering: offeringId })
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
