# Naming conventions & folder structure

This document describes the conventions used in this repo so it stays easy to navigate and onboard.

## Folder structure

### Routes (Expo Router)

- `app/`: All screens, layouts, and route-specific components.
- **Route-specific UI** lives next to the route under `_components/`.
  - Example: `app/(tabs)/chat/_components/*`
  - Example: `app/(auth)/onboarding/_components/*`

### Shared components

- `components/`: Shared UI used by multiple features/routes.
  - If a component is only used by one feature, it should live in that feature’s route `_components/` instead.

### Utilities

- `utils/`: Code that is not a React component (helpers, API wrappers, business logic).
- Utilities are grouped by **feature** or **scope**:
  - `utils/chat/*`: chat-specific helpers
  - `utils/onboarding/*`: onboarding-specific helpers
  - `utils/auth/*`: auth / signup helpers + schemas
  - `utils/ai/*`: AI edge-function helpers (chat/scan/search)
  - `utils/shared/*`: cross-cutting helpers used across multiple features (analytics, sentry, revenuecat, date, network, types, etc.)

### Tests

- `__test__/`: All Jest tests live here.
- Tests are **condensed by feature**: one file per feature.
  - Example: `__test__/chat.test.ts`
  - Example: `__test__/scan.test.ts`

## File naming

### General

- **Folders**: `kebab-case` (e.g. `utils/shared`, `_components`)
- **Non-component TS files**: `kebab-case.ts` (e.g. `chat-history-cache.ts`)
- **Test files**: `<feature>.test.ts` or `<feature>.test.tsx`

### Components

- **Shared components** in `components/`: `PascalCase.tsx` (e.g. `Button.tsx`, `PolicyDocumentRenderer.tsx`)
- **Feature-only components** in route `_components/`: prefer `kebab-case.tsx` for leaf UI pieces (e.g. `chat-glass-input-bar.tsx`).
  - If a route component is “screen-like” (exported as default screen component), keep the route file naming as Expo Router dictates.

## Code naming

### Variables & functions

- **Variables / functions**: `camelCase`
- **Booleans**: start with `is`, `has`, `should`, `can` (e.g. `isFreePlan`, `shouldRedirectMissingEmailDraftToSignup`)
- **Event handlers**: `onX` (e.g. `onSend`, `onOpenPaywall`)

### Types

- **Types / interfaces**: `PascalCase`
- **Type aliases**: prefer `type` unless `interface` is required for declaration merging.

### Constants

- **File-level constants**: `UPPER_SNAKE_CASE` when truly constant (e.g. IDs, stable keys)
- **Local constants**: `camelCase` if scoped to a single function/component

## Import conventions

- Prefer the root alias `@/` for cross-feature imports.
- Prefer **relative imports** within a route `_components/` folder (keeps feature modules self-contained).

