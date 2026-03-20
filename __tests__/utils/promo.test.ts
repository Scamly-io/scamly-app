import { getSupportedPromoOffer } from "@/utils/promo";

describe("getSupportedPromoOffer", () => {
  it("returns early_interest for supported offers", () => {
    expect(getSupportedPromoOffer("early_interest")).toBe("early_interest");
  });

  it("returns null for unsupported offers", () => {
    expect(getSupportedPromoOffer("social_discount")).toBeNull();
    expect(getSupportedPromoOffer("")).toBeNull();
    expect(getSupportedPromoOffer(undefined)).toBeNull();
  });
});
