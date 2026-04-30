export type PromoOfferDefinition = {
  /** Stable offer key returned by `validate-promo-code` edge function. */
  id: string;
  /**
   * RevenueCat iOS product discount identifiers (as configured in App Store Connect / RC).
   * These are matched against `pkg.product.discounts[].identifier`.
   */
  iosDiscountIdentifiers: {
    monthly: string;
    yearly: string;
  };
  /**
   * RevenueCat offering identifier to present on Android. If omitted, the offer
   * will not change the offering.
   */
  androidOfferingId?: string;
  /** Optional UI copy for the claim dialog (iOS discounted repurchase flow). */
  claimCopy?: {
    title: string;
    body: string;
    cta: string;
    success: string;
  };
};

/**
 * Add new offers here and they will automatically work across validation + purchase flows.
 * Keep `id` in sync with what your `validate-promo-code` function returns.
 */
export const PROMO_OFFERS = [
  {
    id: "early_interest",
    iosDiscountIdentifiers: {
      monthly: "early_interest_monthly",
      yearly: "early_interest_yearly",
    },
    androidOfferingId: "early_interest",
    claimCopy: {
      title: "🎉 Early Supporter Offer",
      body: "Thanks for being an early supporter! Claim your exclusive discount now.",
      cta: "Claim Discount",
      success: "Your early supporter discount has been applied!",
    },
  },
  {
    id: "sm_20",
    iosDiscountIdentifiers: {
      monthly: "sm_20_monthly",
      yearly: "sm_20_yearly",
    },
    androidOfferingId: "sm_20",
    claimCopy: {
      title: "🎉 Promotion Available",
      body: "Your discount is ready to apply. Claim it now.",
      cta: "Claim Discount",
      success: "Your discount has been applied!",
    },
  },
] as const;

export type PromoOfferId = (typeof PROMO_OFFERS)[number]["id"];
export type PromoOffer = (typeof PROMO_OFFERS)[number];

export function getSupportedPromoOffer(offer: string): PromoOffer | null {
  const normalized = offer.trim().toLowerCase();
  return PROMO_OFFERS.find((o) => o.id === normalized) ?? null;
}

export function getPromoOfferById(offerId: PromoOfferId): PromoOffer {
  const offer = PROMO_OFFERS.find((o) => o.id === offerId);
  if (!offer) {
    // Should never happen if PromoOfferId is kept in sync with PROMO_OFFERS.
    throw new Error(`Promo offer '${offerId}' not found in PROMO_OFFERS`);
  }
  return offer;
}
