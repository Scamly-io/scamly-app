jest.mock("react-native", () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: "ios" },
}));

jest.mock("@react-native-async-storage/async-storage", () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  LOG_LEVEL: { DEBUG: "DEBUG" },
  default: {
    setLogLevel: jest.fn(),
    configure: jest.fn(),
    logIn: jest.fn(),
    logOut: jest.fn(),
    setAttributes: jest.fn(),
    getCustomerInfo: jest.fn(),
    getOfferings: jest.fn(),
    getPromotionalOffer: jest.fn(),
    purchaseDiscountedPackage: jest.fn(),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
  },
}));

jest.mock("react-native-purchases-ui", () => ({
  __esModule: true,
  PAYWALL_RESULT: {
    PURCHASED: "PURCHASED",
    RESTORED: "RESTORED",
    CANCELLED: "CANCELLED",
  },
  default: {
    presentPaywallIfNeeded: jest.fn(),
    presentPaywall: jest.fn(),
    presentCustomerCenter: jest.fn(),
  },
}));

jest.mock("@/utils/sentry", () => ({
  captureError: jest.fn(),
}));

import AsyncStorage from "@react-native-async-storage/async-storage";
import { Alert } from "react-native";
import Purchases from "react-native-purchases";
import {
  EARLY_INTEREST_STORAGE_KEY,
  SCAMLY_YEARLY_PACKAGE_ID,
  handleEarlyInterestPromoOffer,
} from "@/utils/revenuecat";

type AlertButton = { text?: string; onPress?: () => void | Promise<void> };

const mockedAlert = Alert.alert as jest.Mock;
const mockedPurchases = Purchases as unknown as {
  getCustomerInfo: jest.Mock;
  getOfferings: jest.Mock;
  getPromotionalOffer: jest.Mock;
  purchaseDiscountedPackage: jest.Mock;
};
const mockedStorage = AsyncStorage as unknown as {
  removeItem: jest.Mock;
};

function buildYearlyPackage(withDiscount = true) {
  return {
    identifier: SCAMLY_YEARLY_PACKAGE_ID,
    storeProduct: {
      discounts: withDiscount ? [{ offerIdentifier: "early_interest_yearly" }] : [],
    },
  };
}

describe("handleEarlyInterestPromoOffer", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedPurchases.getCustomerInfo.mockResolvedValue({
      activeSubscriptions: ["scamly_premium_yearly"],
      entitlements: { active: {} },
    });
    mockedPurchases.getOfferings.mockResolvedValue({
      current: {
        availablePackages: [buildYearlyPackage(true)],
      },
      all: {},
    });
    mockedPurchases.getPromotionalOffer.mockResolvedValue({ identifier: "promo_offer" });
    mockedPurchases.purchaseDiscountedPackage.mockResolvedValue({
      customerInfo: { entitlements: { active: {} } },
    });
  });

  it("clears early-interest flags when user selects no thanks", async () => {
    await handleEarlyInterestPromoOffer();

    const [, , buttons] = mockedAlert.mock.calls[0];
    const noThanks = (buttons as AlertButton[]).find((button) => button.text === "No thanks");

    await noThanks?.onPress?.();

    expect(mockedStorage.removeItem).toHaveBeenCalledWith(EARLY_INTEREST_STORAGE_KEY);
    expect(mockedStorage.removeItem).toHaveBeenCalledWith("promoCode");
  });

  it("applies promo purchase and clears flags on claim discount", async () => {
    await handleEarlyInterestPromoOffer();

    const [, , buttons] = mockedAlert.mock.calls[0];
    const claimDiscount = (buttons as AlertButton[]).find(
      (button) => button.text === "Claim Discount"
    );

    await claimDiscount?.onPress?.();

    expect(mockedPurchases.purchaseDiscountedPackage).toHaveBeenCalledTimes(1);
    expect(mockedStorage.removeItem).toHaveBeenCalledWith(EARLY_INTEREST_STORAGE_KEY);
    expect(mockedStorage.removeItem).toHaveBeenCalledWith("promoCode");
  });

  it("falls back to success alert when promo offer is unavailable", async () => {
    mockedPurchases.getOfferings.mockResolvedValue({
      current: {
        availablePackages: [buildYearlyPackage(false)],
      },
      all: {},
    });

    await expect(handleEarlyInterestPromoOffer()).resolves.toBeUndefined();
    expect(mockedAlert).toHaveBeenCalledWith(
      "Success",
      "Your premium subscription is now active."
    );
  });
});
