# RevenueCat + Paywall Documentation

## Overview

RevenueCat is used to manage Scamly subscriptions (products/packages, purchases, restores) and to present the in-app paywall UI. The integration is centralized in `utils/revenuecat.ts` and built on:

- `react-native-purchases` (RevenueCat SDK): offerings, packages, purchase + restore, customer info, promotional offers (iOS).
- `react-native-purchases-ui` (RevenueCat UI): paywall presentation and “Customer Center” subscription management.

**Key Principles:**
- RevenueCat SDK is configured once and then “logged in/out” as the authenticated user changes.
- Premium access is determined by a RevenueCat **entitlement** (`SCAMLY_PREMIUM_ENTITLEMENT_ID`).
- Paywalls are generally presented using `presentScamlyPaywallIfNeeded()` so paid users aren’t re-prompted.
- Promo / offer flows are **platform-specific** (iOS uses StoreKit promo offers; Android uses a separate offering + attributes).
- **PostHog:** Each paywall presentation records `paywall_flow_started` and `paywall_flow_finished` with `trigger`, `presentation` (`if_needed` | `always`), `result` (RevenueCat `PAYWALL_RESULT` string or `error`), `did_unlock_entitlement`, and `offering_key` (`default` or e.g. `early_interest`). These pair with RevenueCat’s server-side events in PostHog (`rc_trial_started_event`, `rc_initial_purchase_event`, etc.) for funnels. See `documentation/POSTHOG_ANALYTICS.md` and dashboard **Scamly — Product & monetization** in PostHog.

### Paywall analytics `trigger` values

| `trigger` | Where |
|-----------|--------|
| `onboarding` | `app/(auth)/onboarding.tsx` — after profile save |
| `profile_upgrade` | `app/(tabs)/home/profile.tsx` — Upgrade to Premium |
| `chat_locked` | `app/(tabs)/chat/index.tsx` — locked chat upsell |
| `contact_search_locked` | `app/(tabs)/contact-search.tsx` — locked search upsell |

## Where the Paywall Appears

The paywall can be shown from multiple user journeys:

- **Onboarding (post profile completion)**: `app/(auth)/onboarding.tsx`
  - Calls `presentScamlyPaywall()` after onboarding is successfully saved.
  - Failures are treated as non-blocking; the user is routed to `/home` even if the paywall fails to present.

- **Profile → Subscription section**
  - `app/(tabs)/home/profile.tsx`
  - “Upgrade to Premium” calls `presentScamlyPaywallIfNeeded()` (with an Android-only “early interest” offering override when applicable).
  - “Manage Subscription” calls `presentScamlyCustomerCenter()`.

- **AI Chat gating**
  - `app/(tabs)/chat/index.tsx`
  - Free-plan users see a locked state with “Upgrade to Premium” that calls `presentScamlyPaywallIfNeeded()`.

- **Contact Search gating**
  - `app/(tabs)/contact-search.tsx`
  - Free-plan users see a locked state with “Upgrade to Premium” that calls `presentScamlyPaywallIfNeeded()`.

## `utils/revenuecat.ts` API

**File:** `utils/revenuecat.ts`

### Constants

- **`SCAMLY_PREMIUM_ENTITLEMENT_ID`**: Entitlement identifier used to determine premium access (must match RevenueCat dashboard entitlement).
- **`SCAMLY_MONTHLY_PACKAGE_ID` / `SCAMLY_YEARLY_PACKAGE_ID`**: RevenueCat package identifiers used when selecting packages from an offering.
- **`EARLY_INTEREST_PROMO_OFFER_ID_YEARLY` / `EARLY_INTEREST_PROMO_OFFER_ID_MONTHLY`**: iOS discount identifiers used to locate the correct `StoreKit` discount on the product.
- **`EARLY_INTEREST_STORAGE_KEY`**: AsyncStorage flag to persist “early interest” status on-device (used because attributes alone are not relied on for read-back).

### Module State

- **`isConfigured`**: Ensures `Purchases.configure()` is executed once per app session.
- **`configuredUserId`**: Tracks which `appUserID` the SDK is currently associated with so we can call `Purchases.logIn()` / `Purchases.logOut()` when auth state changes.

### Function Overview

| Function | Returns | Purpose | Used from / Notes |
|---|---:|---|---|
| `initializeRevenueCat(appUserId)` | `Promise<void>` | Configure RevenueCat SDK once; keep SDK user in sync with auth user. | Called in `app/_layout.tsx` when `user?.id` changes. Handles `configure`, `logIn`, `logOut`. |
| `tagEarlyInterestUser()` | `Promise<void>` | Set RevenueCat subscriber attribute `early_interest=true`. | Android early-interest flow; errors captured via `trackRevenueCatError`. |
| `isEarlyInterestUser()` | `Promise<boolean>` | Read local early-interest flag from `AsyncStorage`. | Local-only (doesn’t read attributes back); returns `false` on error. |
| `getEarlyInterestPromoOffer(pkg)` | `Promise<PromotionalOffer \| null>` | iOS: locate the correct StoreKit discount on a package and fetch a `PromotionalOffer`. | iOS-only; uses monthly/yearly discount identifiers; returns `null` if unavailable. |
| `purchaseWithEarlyInterestPromo(packageIdentifier, promoOffer)` | `Promise<CustomerInfo>` | iOS: perform a discounted purchase using a `PromotionalOffer`. | Uses `Purchases.purchaseDiscountedPackage`. Throws if package not found. |
| `handleEarlyInterestPromoOffer()` | `Promise<void>` | iOS: prompt user to apply early-interest discount and execute discounted purchase. | Clears `EARLY_INTEREST_STORAGE_KEY` and `promoCode` on claim/no-thanks. |
| `getRevenueCatCustomerInfo()` | `Promise<CustomerInfo>` | Fetch latest RevenueCat customer info. | Used for entitlement checks, promo flows, and profile subscription refresh. |
| `hasScamlyPremiumEntitlement(customerInfo)` | `boolean` | Check whether `SCAMLY_PREMIUM_ENTITLEMENT_ID` is active. | Source of truth for RevenueCat entitlement state. |
| `getScamlyPackages(offeringId?)` | `Promise<{ monthly: PurchasesPackage \| null; yearly: PurchasesPackage \| null }>` | Load monthly/yearly packages from current (or specified) offering. | Uses `Purchases.getOfferings()` and matches by package identifiers. |
| `purchaseScamlyPackage(packageIdentifier, offeringId?)` | `Promise<CustomerInfo>` | Purchase monthly/yearly package from offering. | Uses `Purchases.purchasePackage`. Throws if package not found. |
| `restoreScamlyPurchases()` | `Promise<CustomerInfo>` | Restore purchases. | Wraps `Purchases.restorePurchases()`. |
| `presentScamlyPaywallIfNeeded(offeringId?, analytics?)` | `Promise<{ result: PAYWALL_RESULT; didUnlockEntitlement: boolean }>` | Present paywall only if entitlement is missing. | Main “Upgrade” entry point. Android early-interest can pass `offeringId="early_interest"`. Optional `analytics: { trigger }` emits PostHog `paywall_flow_started` / `paywall_flow_finished` (see below). |
| `presentScamlyPaywall(offeringId?, analytics?)` | `Promise<PAYWALL_RESULT>` | Present paywall unconditionally. | Used during onboarding upsell (`app/(auth)/onboarding.tsx`). Resolves `offeringId` to a real `PurchasesOffering` before calling RevenueCat UI (do not pass a raw string as `offering`). Optional analytics context as above. |
| `presentScamlyCustomerCenter()` | `Promise<void>` | Present RevenueCat Customer Center UI. | Used by Profile → “Manage Subscription”. |
| `trackRevenueCatError(action, error)` | `string` | Report to Sentry (warning) and return user-friendly message. | Used to safely surface purchase/paywall errors via alerts. |

### Function Details

### `initializeRevenueCat(appUserId: string | null): Promise<void>`

Configures the RevenueCat SDK and keeps the SDK user in sync with the app’s auth user.

- **First call (not configured yet)**:
  - Sets `Purchases.setLogLevel(LOG_LEVEL.DEBUG)` in dev builds.
  - Calls `Purchases.configure({ apiKey, appUserID })`.
  - Records `isConfigured = true` and sets `configuredUserId`.
- **Subsequent calls**:
  - If `appUserId` changes: calls `Purchases.logIn(appUserId)`.
  - If user logs out (appUserId becomes null): calls `Purchases.logOut()`.

**Used from:** `app/_layout.tsx` (runs whenever `user?.id` changes).

### `tagEarlyInterestUser(): Promise<void>`

Sets a RevenueCat subscriber attribute:

- `early_interest: "true"`

This is used primarily for the Android promo flow (see “Offer Redemption” below). Errors are captured via `trackRevenueCatError("tagEarlyInterestUser", ...)`.

### `isEarlyInterestUser(): Promise<boolean>`

Reads `AsyncStorage.getItem(EARLY_INTEREST_STORAGE_KEY)` and returns whether it is `"true"`.

Notes:
- This is intentionally local-state driven. The code does not attempt to read the RevenueCat attribute back.
- On read errors, it reports via `trackRevenueCatError("isEarlyInterestUser", ...)` and returns `false`.

### `getEarlyInterestPromoOffer(pkg: PurchasesPackage): Promise<PromotionalOffer | null>`

iOS-only helper to fetch a `PromotionalOffer` for a given RevenueCat package.

- **Platform gating**: returns `null` unless `Platform.OS === "ios"`.
- Selects the correct discount identifier based on package:
  - monthly → `EARLY_INTEREST_PROMO_OFFER_ID_MONTHLY`
  - yearly → `EARLY_INTEREST_PROMO_OFFER_ID_YEARLY`
- Locates that discount in `pkg.product.discounts`.
- Calls `Purchases.getPromotionalOffer(pkg.product, discount)` and returns the resulting promo offer (or `null`).
- On error, reports via `trackRevenueCatError("getEarlyInterestPromoOffer", ...)` and returns `null`.

### `purchaseWithEarlyInterestPromo(packageIdentifier, promoOffer): Promise<CustomerInfo>`

Executes an iOS promotional purchase using the provided `PromotionalOffer`.

- Fetches packages via `getScamlyPackages()`.
- Selects the monthly/yearly package matching `packageIdentifier`.
- Calls `Purchases.purchaseDiscountedPackage(selectedPackage, promoOffer)`.
- Returns `customerInfo`.

Throws if the package is not found.

### `handleEarlyInterestPromoOffer(): Promise<void>`

iOS-only *“apply early interest discount”* UI + purchase flow. This is invoked after the app validates a promo code and decides the offer type is `early_interest`.

Flow:

- Calls `getRevenueCatCustomerInfo()` and inspects `customerInfo.activeSubscriptions[0]` to infer whether the user is on a “yearly” or “monthly” subscription.
- Fetches the matching package via `getScamlyPackages()` so it can retrieve the correct promo offer.
- Calls `getEarlyInterestPromoOffer(pkg)`:
  - If missing/unavailable: shows an error alert, but clarifies the subscription is still active.
- If promo offer is available:
  - Shows an alert with:
    - **Claim Discount**: calls `purchaseWithEarlyInterestPromo(...)`, then clears:
      - `AsyncStorage.removeItem(EARLY_INTEREST_STORAGE_KEY)`
      - `AsyncStorage.removeItem("promoCode")`
    - **No thanks**: clears the same flags and shows a success alert.

Any error in the overall flow is captured with `trackRevenueCatError("handleEarlyInterestPromoOffer", ...)` and falls back to an error alert indicating the premium subscription remains active.

### `getRevenueCatCustomerInfo(): Promise<CustomerInfo>`

Thin wrapper around `Purchases.getCustomerInfo()`.

Used to:
- Check entitlements (`hasScamlyPremiumEntitlement`)
- Support promo-offer flows (`handleEarlyInterestPromoOffer`)
- Refresh subscription UI state (`app/(tabs)/home/profile.tsx`)

### `hasScamlyPremiumEntitlement(customerInfo: CustomerInfo): boolean`

Returns whether the `SCAMLY_PREMIUM_ENTITLEMENT_ID` entitlement is currently active:

- `Boolean(customerInfo.entitlements.active[SCAMLY_PREMIUM_ENTITLEMENT_ID])`

### `getScamlyPackages(offeringId?: string): Promise<{ monthly; yearly }>`

Fetches the RevenueCat offerings via `Purchases.getOfferings()` and returns the monthly/yearly packages from:

- `offerings.all[offeringId]` (if `offeringId` provided and exists), else
- `offerings.current`

If no offering is available, returns `{ monthly: null, yearly: null }`.

### `purchaseScamlyPackage(packageIdentifier, offeringId?): Promise<CustomerInfo>`

Purchases the selected monthly/yearly package from the chosen offering:

- Loads packages with `getScamlyPackages(offeringId)`.
- Picks the package matching `packageIdentifier`.
- Calls `Purchases.purchasePackage(selectedPackage)` and returns `customerInfo`.

Throws if the package is not found in the offering.

### `restoreScamlyPurchases(): Promise<CustomerInfo>`

Wrapper for `Purchases.restorePurchases()`.

### `presentScamlyPaywallIfNeeded(offeringId?: string): Promise<{ result; didUnlockEntitlement }>`

Presents the RevenueCat UI paywall *only if the user does not already have* the required entitlement:

- If `offeringId` is provided, it resolves the offering from `Purchases.getOfferings().all[offeringId]`.
- Calls `RevenueCatUI.presentPaywallIfNeeded({ requiredEntitlementIdentifier, offering })`.
- Returns:
  - `result`: the `PAYWALL_RESULT` returned by the RevenueCat UI SDK
  - `didUnlockEntitlement`: `true` iff `result` is `PURCHASED` or `RESTORED`

This is the primary API used by in-app “Upgrade” buttons so paid users aren’t repeatedly paywalled.

### `presentScamlyPaywall(offeringId?: string): Promise<PAYWALL_RESULT>`

Always presents the paywall (no entitlement check).

Used from onboarding as a post-setup upsell (`app/(auth)/onboarding.tsx`).

### `presentScamlyCustomerCenter(): Promise<void>`

Presents the RevenueCat “Customer Center” UI for subscription management.

Used from Profile → “Manage Subscription”.

### `trackRevenueCatError(action: string, error: unknown): string`

Captures a RevenueCat-related error to Sentry and returns a user-friendly message.

- Calls `captureError(error, { feature: "purchase", action, severity: "warning" })`
- Returns a readable message via the internal helper `getReadableErrorMessage()`

This is typically used to:
- Log unexpected SDK/UI errors
- Show a safe fallback error message in an `Alert`

## Offer Redemption System (Android vs iOS)

Promo / discount redemption is **not** implemented identically across platforms.

### Shared: Promo code validation

Promo code entry happens in Profile (`app/(tabs)/home/profile.tsx`) and is validated via:

- Supabase Edge Function: `validate-promo-code`
- The app maps the server response to a supported offer type via `getSupportedPromoOffer()`

If the supported offer is `early_interest`, the platform determines what happens next.

### iOS: “Promotional Offer” (StoreKit discount)

**User experience:**
- On iOS, discount codes are only applicable once the user already has Premium access in-app.
  - The UI enforces this via `canInteractWithPromoCode = !isIosPromoFlow || hasPremiumAccess`.
- When the user applies an `early_interest` code, the app immediately runs the iOS promo offer application flow:
  - `handleEarlyInterestPromoOffer()`

**How it works:**
- RevenueCat customer info is used to determine whether the subscription is monthly vs yearly.
- A StoreKit discount is located by identifier (`EARLY_INTEREST_PROMO_OFFER_ID_MONTHLY/YEARLY`).
- The user is prompted to “Claim Discount” and the app performs a discounted purchase via:
  - `Purchases.getPromotionalOffer(...)`
  - `Purchases.purchaseDiscountedPackage(...)`

**State cleanup:**
- Regardless of claim/no-thanks, the app clears:
  - `EARLY_INTEREST_STORAGE_KEY`
  - `"promoCode"`

### Android: Dedicated “early_interest” offering

**User experience:**
- On Android, applying an `early_interest` code sets local + subscriber state, and then the discount is realized when presenting the paywall.

**How it works:**
- When a valid `early_interest` code is applied:
  - `AsyncStorage.setItem(EARLY_INTEREST_STORAGE_KEY, "true")`
  - `AsyncStorage.setItem("promoCode", <code>)`
  - `tagEarlyInterestUser()` sets RevenueCat subscriber attribute `early_interest: "true"`
- When the user taps “Upgrade to Premium”:
  - Profile checks `isEarlyInterestUser()`
  - If true, it passes `offeringId = "early_interest"` into `presentScamlyPaywallIfNeeded(offeringId)`
  - This causes the paywall to use the special `offerings.all["early_interest"]` offering (configured in RevenueCat dashboard) so the user sees the discounted products/packages.

**State cleanup:**
- After a successful unlock (`PURCHASED` or `RESTORED`), Profile clears:
  - `EARLY_INTEREST_STORAGE_KEY`
  - `"promoCode"`

## Troubleshooting

### Paywall doesn’t appear

- Confirm `initializeRevenueCat(user?.id)` is running (wired in `app/_layout.tsx`).
- If using `presentScamlyPaywallIfNeeded()`, confirm the user truly lacks the entitlement `SCAMLY_PREMIUM_ENTITLEMENT_ID`.
- If passing an `offeringId` (Android early-interest), confirm that offering exists in RevenueCat and has packages with the correct identifiers.

### Promo code validated but discount not shown (Android)

- Confirm `EARLY_INTEREST_STORAGE_KEY` is set to `"true"` on device.
- Confirm Profile is passing `offeringId = "early_interest"` when presenting the paywall.
- Confirm the RevenueCat offering named `early_interest` is configured and active for Android.

### iOS promo offer can’t be applied

- Confirm the package’s underlying product has `discounts` and that the discount identifiers match:
  - `EARLY_INTEREST_PROMO_OFFER_ID_MONTHLY`
  - `EARLY_INTEREST_PROMO_OFFER_ID_YEARLY`
- Confirm the user already has Premium access before applying the code (expected in the current UI/flow).

