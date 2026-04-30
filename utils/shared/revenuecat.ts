import {
  trackPaywallFlowFinished,
  trackPaywallFlowStarted,
  type PaywallTrigger,
} from "@/utils/shared/analytics";
import { getPromoOfferById, getSupportedPromoOffer, type PromoOfferId } from "@/utils/shared/promo";
import { captureError } from "@/utils/shared/sentry";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert, Platform } from "react-native";
import Purchases, { CustomerInfo, LOG_LEVEL, PromotionalOffer, PurchasesPackage } from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";


export const SCAMLY_PREMIUM_ENTITLEMENT_ID = "Scamly Premium";
export const SCAMLY_MONTHLY_PACKAGE_ID = "$rc_monthly";
export const SCAMLY_YEARLY_PACKAGE_ID = "$rc_yearly";
/**
 * Legacy storage key. Kept for backwards compatibility with existing installs.
 * New code should store the active offer in `PROMO_OFFER_STORAGE_KEY`.
 */
export const EARLY_INTEREST_STORAGE_KEY = "early_interest_user";
export const PROMO_OFFER_STORAGE_KEY = "promo_offer";

const REVENUECAT_API_KEY =
  Platform.OS === "ios"
    ? "appl_EElVohkhYSlZEQtkRyVobgwLfIt"
    : Platform.OS === "android"
    ? "goog_kpAKBeifirsalQZVyHGphyVeWId"
    : "";

let isConfigured = false;
let configuredUserId: string | null = null;

export type PaywallAnalyticsContext = {
  trigger: PaywallTrigger;
};

function paywallOfferingKey(offeringId?: string): string {
  return offeringId ?? "default";
}

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
  return tagDiscountUser("early_interest");
}

export async function tagDiscountUser(offer: string): Promise<void> {
  try {
    await Purchases.setAttributes({ [offer]: "true" });
  } catch (error) {
    trackRevenueCatError("tagDiscountUser", error);
  }
}

export async function isEarlyInterestUser(): Promise<boolean> {
  try {
    const legacy = await AsyncStorage.getItem(EARLY_INTEREST_STORAGE_KEY);
    if (legacy === "true") return true;

    const offerId = await getStoredPromoOfferId();
    return offerId === "early_interest";
  } catch (error) {
    trackRevenueCatError("isEarlyInterestUser", error);
    return false;
  }
}

export async function setStoredPromoOfferId(offerId: PromoOfferId): Promise<void> {
  await AsyncStorage.setItem(PROMO_OFFER_STORAGE_KEY, offerId);
  // Maintain legacy behavior for early interest installs.
  if (offerId === "early_interest") {
    await AsyncStorage.setItem(EARLY_INTEREST_STORAGE_KEY, "true");
  }
}

export async function clearStoredPromoOffer(): Promise<void> {
  await AsyncStorage.removeItem(PROMO_OFFER_STORAGE_KEY);
  await AsyncStorage.removeItem(EARLY_INTEREST_STORAGE_KEY);
  await AsyncStorage.removeItem("discount_user");
  await AsyncStorage.removeItem("promoCode");
}

export async function getStoredPromoOfferId(): Promise<PromoOfferId | null> {
  try {
    const raw = await AsyncStorage.getItem(PROMO_OFFER_STORAGE_KEY);
    if (!raw) return null;
    const supported = getSupportedPromoOffer(raw);
    return supported?.id ?? null;
  } catch (error) {
    trackRevenueCatError("getStoredPromoOfferId", error);
    return null;
  }
}

export function getAndroidOfferingIdForPromoOffer(offerId: PromoOfferId): string | undefined {
  return getPromoOfferById(offerId).androidOfferingId;
}

export async function getStoredAndroidOfferingId(): Promise<string | undefined> {
  const offerId = await getStoredPromoOfferId();
  if (!offerId) return undefined;
  return getAndroidOfferingIdForPromoOffer(offerId);
}

export async function getPromoOfferForPackage(
  pkg: PurchasesPackage,
  offerId: PromoOfferId
): Promise<PromotionalOffer | null> {
  if (Platform.OS !== "ios") return null;

  const offer = getPromoOfferById(offerId);
  const discountIdentifier =
    pkg.identifier === SCAMLY_MONTHLY_PACKAGE_ID
      ? offer.iosDiscountIdentifiers.monthly
      : offer.iosDiscountIdentifiers.yearly;

  const discount = pkg.product.discounts?.find(
    (d) => d.identifier === discountIdentifier
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
    trackRevenueCatError("getPromoOfferForPackage", error);
    return null;
  }
}

export async function purchaseWithPromoOffer(
  packageIdentifier: typeof SCAMLY_MONTHLY_PACKAGE_ID | typeof SCAMLY_YEARLY_PACKAGE_ID,
  promoOffer: PromotionalOffer,
  offeringId?: string
): Promise<CustomerInfo> {
  const { monthly, yearly } = await getScamlyPackages(offeringId);

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

export async function handlePromoOffer(offerId: PromoOfferId): Promise<void> {
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
      Alert.alert("Error", "We weren't able to apply that promotion. Your premium subscription is still active.");
      return;
    }

    const promoOffer = await getPromoOfferForPackage(pkg, offerId);
    if (!promoOffer) {
      // Offer not available — just show the normal success alert
      Alert.alert("Error", "We weren't able to apply that promotion. Your premium subscription is still active.");
      return;
    }

    const offer = getPromoOfferById(offerId);
    const copy = offer.claimCopy ?? {
      title: "🎉 Promotion Available",
      body: "Your discount is ready to apply. Claim it now.",
      cta: "Claim Discount",
      success: "Your discount has been applied!",
    };

    Alert.alert(
      copy.title,
      copy.body,
      [
        {
          text: copy.cta,
          onPress: async () => {
            try {
              await purchaseWithPromoOffer(packageIdentifier, promoOffer);
              await clearStoredPromoOffer();
              Alert.alert("Success", copy.success);
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
            await clearStoredPromoOffer();
            Alert.alert("Success", "Your premium subscription is now active.");
          },
        },
      ]
    );
  } catch (error) {
    // If anything goes wrong fetching the promo, fall back gracefully
    trackRevenueCatError("handlePromoOffer", error);
    Alert.alert("Error", "We weren't able to apply that promotion. Your premium subscription is still active.");
  }
};

// Backwards-compatible exports (older call sites).
export async function getEarlyInterestPromoOffer(pkg: PurchasesPackage): Promise<PromotionalOffer | null> {
  return getPromoOfferForPackage(pkg, "early_interest");
}

export async function purchaseWithEarlyInterestPromo(
  packageIdentifier: typeof SCAMLY_MONTHLY_PACKAGE_ID | typeof SCAMLY_YEARLY_PACKAGE_ID,
  promoOffer: PromotionalOffer
): Promise<CustomerInfo> {
  return purchaseWithPromoOffer(packageIdentifier, promoOffer);
}

export async function handleEarlyInterestPromoOffer(): Promise<void> {
  return handlePromoOffer("early_interest");
}

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

export async function presentScamlyPaywallIfNeeded(
  offeringId?: string,
  analytics?: PaywallAnalyticsContext
): Promise<{
  result: PAYWALL_RESULT;
  didUnlockEntitlement: boolean;
}> {
  let offering = undefined;

  if (offeringId) {
    const offerings = await Purchases.getOfferings();
    offering = offerings.all[offeringId] ?? undefined;
  }

  const offeringKey = paywallOfferingKey(offeringId);
  if (analytics) {
    trackPaywallFlowStarted(analytics.trigger, "if_needed", offeringKey);
  }

  try {
    const result = await RevenueCatUI.presentPaywallIfNeeded({
      requiredEntitlementIdentifier: SCAMLY_PREMIUM_ENTITLEMENT_ID,
      offering,
    });

    const didUnlockEntitlement =
      result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;

    if (analytics) {
      trackPaywallFlowFinished(
        analytics.trigger,
        "if_needed",
        String(result),
        didUnlockEntitlement,
        offeringKey
      );
    }

    return { result, didUnlockEntitlement };
  } catch (error) {
    if (analytics) {
      trackPaywallFlowFinished(
        analytics.trigger,
        "if_needed",
        "error",
        false,
        offeringKey
      );
    }
    throw error;
  }
}

export async function presentScamlyPaywall(
  offeringId?: string,
  analytics?: PaywallAnalyticsContext
): Promise<PAYWALL_RESULT> {
  let offering = undefined;
  if (offeringId) {
    const offerings = await Purchases.getOfferings();
    offering = offerings.all[offeringId] ?? undefined;
  }

  const offeringKey = paywallOfferingKey(offeringId);
  if (analytics) {
    trackPaywallFlowStarted(analytics.trigger, "always", offeringKey);
  }

  try {
    const result = await RevenueCatUI.presentPaywall({ offering });
    const didUnlockEntitlement =
      result === PAYWALL_RESULT.PURCHASED || result === PAYWALL_RESULT.RESTORED;
    if (analytics) {
      trackPaywallFlowFinished(
        analytics.trigger,
        "always",
        String(result),
        didUnlockEntitlement,
        offeringKey
      );
    }
    return result;
  } catch (error) {
    if (analytics) {
      trackPaywallFlowFinished(
        analytics.trigger,
        "always",
        "error",
        false,
        offeringKey
      );
    }
    throw error;
  }
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
