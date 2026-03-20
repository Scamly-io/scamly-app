export type SupportedPromoOffer = "early_interest";

export function getSupportedPromoOffer(offer: unknown): SupportedPromoOffer | null {
  if (offer === "early_interest") {
    return offer;
  }

  return null;
}
