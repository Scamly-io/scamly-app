# Sentry Error Logging Documentation

## Overview

Sentry is used for error tracking and monitoring in the Scamly app. The implementation is centralized in `utils/sentry.ts` and follows a severity-based approach to error reporting.

**Key Principles:**
- **Critical errors**: Block user progress (scan fails, chat fails)
- **Warnings**: Non-blocking issues (view count increment fails)
- **Ignored**: Expected user errors (wrong credentials), client wifi issues

## Configuration

**File:** `utils/sentry.ts`

**Environment Variables:**
- `EXPO_PUBLIC_SENTRY_DSN` - Sentry Data Source Name

**Initialization:**
- Called in `app/_layout.tsx` at app startup
- Environment: `development` in DEV mode, `production` in production
- Release tracking: `scamly-app@{version}+{buildNumber}`
- Session tracking: 30-second intervals
- **Disabled by default in development** (enabled in production)

## Error Filtering

Sentry automatically filters out noise to reduce alert fatigue and focus on actionable errors.

### Filtered Client Network Errors

These errors are **NOT reported** as they indicate user connectivity issues, not app bugs:

- `network request failed`
- `network error`
- `failed to fetch`
- `load failed`
- `the internet connection appears to be offline`
- `a server with the specified hostname could not be found`
- `the network connection was lost`
- `could not connect to the server`
- `dns lookup failed`
- `err_internet_disconnected`
- `err_network_changed`
- `timeout`
- `aborted`

### Filtered Auth Errors

These errors are **NOT reported** as they represent expected user behavior:

- `invalid login credentials`
- `invalid_credentials`
- `email not confirmed`
- `user not found`
- `wrong password`
- `invalid password`

### Network Error Filtering Rules

- **5xx errors** (500-599): Always reported (server-side issues)
- **4xx errors** (400-499): Not reported (client-side issues)

## Severity Levels

| Severity   | Sentry Level | Usage                                    |
|------------|--------------|------------------------------------------|
| `critical` | `error`      | Blocks user progress or core features    |
| `warning`  | `warning`    | Non-blocking issues, degraded experience |
| `info`     | `info`       | Informational, non-urgent issues         |

## User Context

### Setting User Context

**Function:** `setUserContext(userId: string, plan: string)`

**Location:** Called in `contexts/AuthContext.tsx`

**When:** After successful authentication

**Properties Set:**
- `id`: Supabase user ID
- `user_plan`: User's subscription tier (free, trial, paid)

**Usage Example:**

```typescript
setUserContext(user.id, 'free');
```

### Clearing User Context

**Function:** `clearUserContext()`

**Location:** Called in `contexts/AuthContext.tsx`

**When:** On user logout

## Error Capture Functions

### 1. Generic Error Capture

**Function:** `captureError(error: Error | unknown, context: ErrorContext)`

**Purpose:** Main error capture function with full context

**Parameters:**
- `error`: The error object or unknown value
- `context`: Object with:
  - `feature`: Feature name (see feature list below)
  - `action`: Specific action that failed
  - `severity`: Error severity (optional, defaults to 'critical')
  - `extra`: Additional data (optional)

**Tags Set:**
- `feature`
- `action`
- `severity`
- `user_id` (if authenticated)
- `user_plan` (if authenticated)

**Usage:**
```typescript
captureError(error, {
  feature: 'home',
  action: 'signout',
  severity: 'critical',
  extra: { userId: user.id }
});
```

### 2. Network Error Capture

**Function:** `captureNetworkError(error: Error | unknown, context: NetworkErrorContext)`

**Purpose:** Capture network errors with smart filtering (filters client issues, reports server issues)

**Parameters:**
- `error`: Network error
- `context`: Object with:
  - `feature`: Feature name
  - `action`: Specific action
  - `severity`: Optional severity
  - `statusCode`: HTTP status code (optional)
  - `url`: Request URL (optional)
  - `extra`: Additional data (optional)

**Filtering:**
- Automatically filters client network errors
- Only reports 5xx server errors
- Ignores 4xx client errors

**Tags Set:**
- `feature`
- `action`
- `error_type`: Always set to 'network'
- `http_status`: If statusCode provided

**Usage:**
```typescript
captureNetworkError(error, {
  feature: 'scan',
  action: 'upload_image',
  statusCode: 503,
  url: 'https://api.scamly.com/scan'
});
```

### 3. Scan Error Capture

**Function:** `captureScanError(error: Error | unknown, action: string, extra?: Record<string, unknown>)`

**Purpose:** Capture scan-related errors (always critical)

**Parameters:**
- `error`: The error
- `action`: Specific scan action
- `extra`: Optional additional data

**Severity:** Always `critical` (scanning is a core feature)

**Usage:**
```typescript
captureScanError(error, 'scan_image_failed', { imageB64 });
```

### 4. Chat Error Capture

**Function:** `captureChatError(error: Error | unknown, action: string, extra?: Record<string, unknown>)`

**Purpose:** Capture chat-related errors (always critical)

**Parameters:**
- `error`: The error
- `action`: Specific chat action
- `extra`: Optional additional data

**Severity:** Always `critical` (chat is a core feature)

**Usage:**
```typescript
captureChatError(error, 'create_conversation_id');
```

### 5. Data Fetch Error Capture

**Function:** `captureDataFetchError(error: Error | unknown, feature: FeatureName, action: string, severity: ErrorSeverity = 'critical', extra?: Record<string, unknown>)`

**Purpose:** Capture data fetching errors with configurable severity

**Parameters:**
- `error`: The error
- `feature`: Feature name
- `action`: Specific action
- `severity`: Error severity (defaults to 'critical')
- `extra`: Optional additional data

**Severity Guidelines:**
- Use `'critical'` for blocking errors (profile fetch, content fetch)
- Use `'warning'` for non-blocking errors (analytics, view counts)

**Usage:**
```typescript
// Critical data fetch (blocks UI)
captureDataFetchError(error, 'home', 'fetch_profile', 'critical');

// Warning data fetch (non-blocking)
captureDataFetchError(error, 'home', 'fetch_trending_articles', 'warning');
```

### 6. Warning Capture

**Function:** `captureWarning(error: Error | unknown, feature: FeatureName, action: string, extra?: Record<string, unknown>)`

**Purpose:** Capture non-critical warnings that don't block user progress

**Parameters:**
- `error`: The error
- `feature`: Feature name
- `action`: Specific action
- `extra`: Optional additional data

**Severity:** Always `warning`

**Examples:**
- Failed to increment view count
- Failed to track analytics
- Failed to fetch trending content

**Usage:**
```typescript
captureWarning(error, 'home', 'fetch_trending_articles');
```

## Breadcrumbs

Breadcrumbs provide additional context for errors by tracking user actions and navigation.

### Navigation Breadcrumb

**Function:** `addNavigationBreadcrumb(from: string, to: string)`

**Purpose:** Track screen navigation

**Usage:**
```typescript
addNavigationBreadcrumb('/home', '/scan');
```

**Note:** Currently defined but not used in the codebase.

### Action Breadcrumb

**Function:** `addActionBreadcrumb(action: string, feature: FeatureName, data?: Record<string, unknown>)`

**Purpose:** Track user actions for error context

**Usage:**
```typescript
addActionBreadcrumb('scan_started', 'scan', { scanType: 'image' });
addActionBreadcrumb('signup_started', 'signup');
```

**Used in:** Signup flow (`app/(auth)/signup.tsx`, `app/(auth)/signup-profile.tsx`) to trace the user journey through the multi-step signup process.

## Feature Names

Valid feature names used throughout error tracking:

| Feature Name   | Description                           |
|----------------|---------------------------------------|
| `scan`         | Scam scanning functionality           |
| `chat`         | AI chat conversations                 |
| `home`         | Home screen/dashboard                 |
| `contact_search`  | Contact search feature            |
| `learn`        | Learning center/educational content   |
| `login`        | Authentication/login flow             |
| `signup`       | Account creation/signup flow          |
| `auth`         | General authentication                |

## Error Tracking by Feature

### Home Screen (`app/(tabs)/home.tsx`)

| Action                      | Function Used               | Severity   | Description                           |
|-----------------------------|-----------------------------|------------|---------------------------------------|
| `fetch_profile`             | `captureDataFetchError`     | `critical` | Failed to fetch user profile          |
| `fetch_trending_articles`   | `captureWarning`            | `warning`  | Failed to load trending articles      |
| `fetch_quick_tips`          | `captureWarning`            | `warning`  | Failed to load quick tips             |
| `signout`                   | `captureError`              | `critical` | Sign out operation failed             |

**Additional Context:**
- Session validation errors tracked
- Profile fetch failures prevent proper app functionality

### Scan Feature (`app/(tabs)/scan.tsx`, `utils/ai/scan.ts`)

| Action                 | Function Used            | Severity   | Description                              |
|------------------------|--------------------------|------------|------------------------------------------|
| `fetch_profile`        | `captureDataFetchError`  | `critical` | Failed to fetch user profile             |
| `fetch_quota`          | `captureDataFetchError`  | `critical` | Failed to check scan quota               |
| `scan_image_failed`    | `captureScanError`       | `critical` | Image scan processing failed             |

**Additional Context:**
- All scan errors are critical (blocks core functionality)
- Includes details like `imageB64` or error details in extra data

### Chat Feature (`app/(tabs)/chat/`, `utils/ai/chat.ts`)

| Action                      | Function Used            | Severity   | Description                           |
|-----------------------------|--------------------------|------------|---------------------------------------|
| `fetch_profile`             | `captureDataFetchError`  | `critical` | Failed to fetch user profile          |
| `fetch_chats`               | `captureDataFetchError`  | `critical` | Failed to load chat history           |
| `create_chat`               | `captureChatError`       | `critical` | Failed to create new chat             |
| `create_conversation_id`    | `captureChatError`       | `critical` | Failed to create conversation ID      |
| `delete_chat`               | `captureChatError`       | `critical` | Failed to delete chat                 |
| `delete_conversation_id`    | `captureChatError`       | `critical` | Failed to delete conversation ID      |
| `generate_response`         | `captureChatError`       | `critical` | Failed to generate AI response        |
| `get_user`                  | `captureDataFetchError`  | `critical` | Failed to get current user            |

**Additional Context:**
- All chat errors are critical (chat is a core feature)
- Session validation tracked separately

### Contact Search Feature (`app/(tabs)/contact-search.tsx`)

| Action           | Function Used            | Severity   | Description                      |
|------------------|--------------------------|------------|----------------------------------|
| `get_user`       | `captureDataFetchError`  | `critical` | Failed to get current user       |
| `fetch_profile`  | `captureDataFetchError`  | `critical` | Failed to fetch user profile     |

**Additional Context:**
- Session validation errors tracked
- Profile fetch required for feature access

### Learning Center (`app/(tabs)/learn/`)

| Action                      | Function Used         | Severity   | Description                          |
|-----------------------------|-----------------------|------------|--------------------------------------|
| `fetch_featured_article`    | `captureWarning`      | `warning`  | Failed to load featured article      |
| `fetch_trending_articles`   | `captureWarning`      | `warning`  | Failed to load trending articles     |
| `fetch_quick_tips`          | `captureWarning`      | `warning`  | Failed to load quick tips            |
| `fetch_article`             | `captureDataFetchError` | `critical` | Failed to load specific article    |
| `increment_views`           | `captureWarning`      | `warning`  | Failed to increment article views    |
| `search_failed`             | `captureError`        | `critical` | Search operation failed              |

**Additional Context:**
- Listing failures are warnings (non-blocking)
- Specific article fetch is critical (blocks content view)
- View count increment is warning (non-blocking)
- Includes article metadata in extra data

### Login/Auth (`app/(auth)/login.tsx`)

| Action        | Function Used    | Severity   | Description                    |
|---------------|------------------|------------|--------------------------------|
| `login`       | `captureError`   | `critical` | Login operation failed         |

**Additional Context:**
- Auth errors (invalid credentials) are filtered automatically
- Only unexpected errors are captured

### Signup Flow (`app/(auth)/signup.tsx`, `app/(auth)/signup-profile.tsx`)

| Action              | Function Used    | Severity   | Description                                  |
|---------------------|------------------|------------|----------------------------------------------|
| `signup_attempt`    | `captureError`   | `critical` | Unexpected error during account creation     |

**Breadcrumbs Added:**
- `signup_started` (action breadcrumb) - User opens signup page
- `signup_step1_completed` (action breadcrumb) - Email/password validated, navigating to step 2
- `signup_attempted` (action breadcrumb) - Create Account button pressed, API call started
- `signup_completed` (action breadcrumb) - Supabase signUp returned success

**Additional Context:**
- Supabase auth errors (e.g., "User already registered") are **not** reported to Sentry — these are expected user behavior, matching the login pattern
- Only truly unexpected errors (catch block) are captured as critical
- Breadcrumbs provide full signup journey context if an error does occur

## Control Functions

### Enable/Disable Sentry

**Functions:**
- `enableSentry()`: Enable error reporting
- `disableSentry()`: Disable error reporting
- `isSentryActive()`: Check if Sentry is active

**Usage:**
```typescript
// Enable error reporting
enableSentry();

// Disable on logout
disableSentry();

// Check status
if (isSentryActive()) {
  // Sentry is ready
}
```

## Error Boundary

**Location:** `app/_layout.tsx`

**Component:** `<Sentry.ErrorBoundary>`

**Purpose:** Catches unhandled React errors and displays fallback UI

**Fallback UI:**
- "Something went wrong" message
- User-friendly error explanation
- Suggestion to restart app

**Usage:**
```typescript
<Sentry.ErrorBoundary
  fallback={({ error }) => (
    <View>
      <Text>Something went wrong</Text>
      <Text>We've been notified and are working to fix the issue.</Text>
    </View>
  )}
>
  {/* App content */}
</Sentry.ErrorBoundary>
```

## Best Practices

### When to Report Errors

✅ **DO report:**
- Unexpected API failures (5xx errors)
- Critical feature failures (scan, chat)
- Data fetch failures that block UI
- Unexpected application errors

❌ **DON'T report:**
- Expected user errors (wrong password)
- Client connectivity issues (user's wifi down)
- 4xx HTTP errors (client-side issues)
- Successfully handled errors that don't impact UX

### Choosing Severity Levels

**Critical:**
- User cannot continue their task
- Core feature is broken
- Data fetch prevents UI from rendering

**Warning:**
- Feature degraded but functional
- Non-critical data missing (trending articles, tips)
- Background operations failed (analytics, view counts)

**Info:**
- Informational logging
- Non-urgent issues

### Adding Context

Always include relevant context in the `extra` parameter:

```typescript
captureScanError(error, 'scan_image_failed', {
  imageSize: image.size,
  scanType: 'screenshot',
  userId: user.id
});
```

### Privacy Considerations

**Never include in error reports:**
- User emails
- User names
- Image contents or payloads
- Scan results or content
- Chat messages
- Any Personally Identifiable Information (PII)

**Safe to include:**
- User IDs (Supabase UUID)
- Feature names
- Action types
- Technical metadata (file sizes, status codes)
- Error messages and stack traces

## Testing

**Development Mode:**
- Sentry is disabled by default (`enabled: !__DEV__`)
- Set environment variable to enable in development
- Errors logged to console only

**Production Mode:**
- Sentry fully enabled
- All errors filtered and reported
- User context attached automatically

## Troubleshooting

### Sentry Not Capturing Errors

1. Check if DSN is configured: `process.env.EXPO_PUBLIC_SENTRY_DSN`
2. Check if Sentry is enabled: `isSentryActive()`
3. Verify error is not filtered (check filter patterns)
4. Check if running in development mode (disabled by default)

### Too Many Errors Reported

1. Review severity levels (use `warning` for non-critical issues)
2. Add filtering for expected errors
3. Check if client network errors are being reported (should be filtered)

### Missing Context

1. Ensure `setUserContext()` called after auth
2. Add breadcrumbs for navigation and actions
3. Include relevant `extra` data in capture calls

## Summary Statistics

**Total Error Capture Locations:** 34+ across codebase

**Features with Error Tracking:**
- Home (4 locations)
- Scan (3 locations)
- Chat (8 locations)
- Info Search (2 locations)
- Learning Center (6 locations)
- Login (1 location)
- Signup (1 location + 4 breadcrumbs)
- AI Utilities (9 locations)

**Most Common Error Types:**
1. Data fetch errors (profile, content)
2. Chat operation errors (create, delete, generate)
3. Scan errors (processing, API)
4. Session validation errors
