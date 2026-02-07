# PostHog Analytics Documentation

## Overview

PostHog is used for product analytics and user behavior tracking in the Scamly app. The implementation is centralized in `utils/analytics.ts` and follows a privacy-first approach.

**Key Principles:**
- Analytics disabled until user authentication
- No PII (Personally Identifiable Information) ever captured
- Event naming convention: `snake_case`
- All events include session context when available

## Configuration

**File:** `utils/analytics.ts`

**Environment Variables:**
- `EXPO_PUBLIC_POSTHOG_API_KEY` - PostHog API key
- `EXPO_PUBLIC_POSTHOG_HOST` - PostHog host URL (default: `https://us.i.posthog.com`)

**Initialization:**
- PostHog client initialized in `app/_layout.tsx` with `PostHogProvider`
- Client registered with analytics module via `initializePostHog()`
- Session tracking initialized via `initializeSessionTracking()`
- **Autocapture enabled** for touch events with custom labeling

**Autocapture Settings:**
```typescript
autocapture={{
  captureTouches: true,
  ignoreLabels: [],
  customLabelProp: 'ph-label',
  noCaptureProp: 'ph-no-capture',
}}
```

## Privacy & PII

### Never Captured

The following information is **NEVER** captured to protect user privacy:

- ❌ Email addresses
- ❌ User names
- ❌ Image contents or payloads
- ❌ Scan results or content
- ❌ Chat messages or AI responses
- ❌ Any Personally Identifiable Information (PII)

### Safe to Capture

- ✅ User IDs (Supabase UUID - anonymous identifiers)
- ✅ Subscription plan (free, trial, paid)
- ✅ Platform (iOS, Android, Web)
- ✅ App version
- ✅ Feature usage patterns
- ✅ Event types and categories
- ✅ Technical metadata (timing, success/failure)

## User Identification

### Identify User

**Function:** `identifyUser(userId: string, plan: UserPlan)`

**Location:** Called in `contexts/AuthContext.tsx` and `app/(auth)/login.tsx`

**When:** After successful authentication

**Properties Set:**
- `user_id`: Supabase user ID (stable identifier)
- `plan`: Subscription tier (`free`, `trial`, `paid`)
- `platform`: Device platform (`ios`, `android`, `web`)
- `app_version`: Current app version

**Side Effect:** Automatically enables analytics

**Usage:**
```typescript
identifyUser(user.id, 'free');
```

### Reset User

**Function:** `resetUser()`

**Location:** Called in `contexts/AuthContext.tsx`

**When:** User logs out

**Effect:**
- Clears all user data from PostHog
- Disables analytics
- Resets session tracking

**Usage:**
```typescript
resetUser();
```

## Session Tracking

### Overview

Sessions track continuous periods of app usage. A session starts when the app enters foreground and ends when it moves to background.

### Session Started

**Event:** `session_started`

**When:** App enters foreground (active state)

**Properties:**
- `session_id`: Unique session identifier (`timestamp-randomstring`)

**Trigger:** Automatic via `AppState` listener

### Session Ended

**Event:** `session_ended`

**When:** App moves to background or becomes inactive

**Properties:**
- `session_id`: Session identifier
- `duration_seconds`: Total session duration in seconds

**Trigger:** Automatic via `AppState` listener

### Session Management Functions

**Functions:**
- `startSession()`: Start new session
- `endSession()`: End current session
- `initializeSessionTracking()`: Set up AppState listener
- `cleanupSessionTracking()`: Remove AppState listener

## Analytics Events

### Scan Events

#### 1. Scan Started

**Event:** `scan_started`

**Function:** `trackScanStarted(scanType: ScanType, source: ScanSource)`

**When:** User initiates a scam scan

**Location:** `app/(tabs)/scan.tsx` - at start of `handleScan()`

**Properties:**
- `scan_type`: `'image'` | `'screenshot'`
- `source`: `'camera'` | `'upload'`

**Usage:**
```typescript
trackScanStarted('screenshot', 'upload');
```

**Purpose:** Track scan feature usage and identify preferred scan methods

---

#### 2. Scan Completed

**Event:** `scan_completed`

**Function:** `trackScanCompleted(scanType: ScanType, resultCategory: ResultCategory, processingTimeMs: number)`

**When:** Scan API returns successful result

**Location:** `app/(tabs)/scan.tsx` - after successful API response

**Properties:**
- `scan_type`: `'image'` | `'screenshot'`
- `result_category`: `'scam'` | `'likely_scam'` | `'unsure'` | `'safe'`
- `processing_time_ms`: Time taken to process scan (milliseconds)

**Usage:**
```typescript
trackScanCompleted('screenshot', 'scam', 3500);
```

**Purpose:** Measure scan success rate, performance, and result distribution

---

#### 3. Scan Failed

**Event:** `scan_failed`

**Function:** `trackScanFailed(errorType: string, stage: ScanStage)`

**When:** Scan fails at any stage (upload, processing, or response)

**Location:** 
- `app/(tabs)/scan.tsx` - error handling in `handleScan()`
- `utils/ai/scan.ts` - API error handling

**Properties:**
- `error_type`: Description of error
- `stage`: `'upload'` | `'processing'` | `'response'`

**Usage:**
```typescript
trackScanFailed('scan_image_failed', 'response');
```

**Purpose:** Identify failure patterns and improvement opportunities

---

#### 4. Result Viewed

**Event:** `result_viewed`

**Function:** `trackResultViewed(resultCategory: ResultCategory)`

**When:** Scan results are rendered on screen

**Location:** `app/(tabs)/scan.tsx` - after setting scan result state

**Properties:**
- `result_category`: `'scam'` | `'likely_scam'` | `'unsure'` | `'safe'`

**Usage:**
```typescript
trackResultViewed('scam');
```

**Purpose:** Understand which result types users see most often

---

#### 5. Result Rated

**Event:** `result_rated`

**Function:** `trackResultRated(rating: 'helpful' | 'not_helpful')`

**When:** User provides feedback on scan result

**Location:** Not currently implemented in UI

**Properties:**
- `rating`: `'helpful'` | `'not_helpful'`

**Usage:**
```typescript
trackResultRated('helpful');
```

**Purpose:** Measure result quality and user satisfaction

---

### Educational Content Events

#### 6. Article Viewed

**Event:** `article_viewed`

**Function:** `trackArticleViewed(articleId: string, category?: string)`

**When:** Article content is loaded and displayed

**Location:** `app/(tabs)/learn/[slug].tsx` - when article data fetched successfully

**Properties:**
- `article_id`: Unique article identifier
- `category`: Article category (defaults to 'unknown' if not provided)

**Usage:**
```typescript
trackArticleViewed('how-to-spot-phishing', 'email_scams');
```

**Purpose:** Track which educational content is most popular

---

#### 7. Article Engaged

**Event:** `article_engaged`

**Function:** `trackArticleEngaged(articleId: string, timeOnPageSeconds: number)`

**When:** User meaningfully engages with article

**Criteria:** 
- User scrolls **75% or more** through article
- **AND** spends **60+ seconds** on article

**Location:** `app/(tabs)/learn/[slug].tsx` - in scroll and time tracking logic

**Properties:**
- `article_id`: Unique article identifier
- `time_on_page_seconds`: Total time spent on article

**Usage:**
```typescript
trackArticleEngaged('how-to-spot-phishing', 125);
```

**Purpose:** Measure deep engagement vs. bounce rate, identify high-quality content

---

### Feature Discovery Events

#### 8. Feature Opened

**Event:** `feature_opened`

**Function:** `trackFeatureOpened(featureName: FeatureName)`

**When:** User navigates to a primary section/tab of the app

**Location:** Multiple locations on tab focus:
- `app/(tabs)/home.tsx`
- `app/(tabs)/scan.tsx`
- `app/(tabs)/chat/index.tsx`
- `app/(tabs)/contact-search.tsx`
- `app/(tabs)/learn/index.tsx`

**Properties:**
- `feature_name`: `'home'` | `'scan'` | `'chat'` | `'contact_search'` | `'learning_center'` | `'article'` | `'settings'` | `'history'`

**Usage:**
```typescript
trackFeatureOpened('scan');
```

**Purpose:** Understand feature usage patterns and navigation flows

---

### Error Events

#### 9. User Visible Error

**Event:** `user_visible_error`

**Function:** `trackUserVisibleError(feature: string, errorType: string, retryAvailable: boolean)`

**When:** User sees an error message or error state that impacts their experience

**Criteria:** 
- Error is visible to user (not silent/background)
- Error blocks or impacts user action

**Location:** Multiple locations across app (20+ usage points):
- Session validation failures
- Profile fetch failures
- Feature-specific errors
- Permission denials

**Properties:**
- `feature`: Feature where error occurred
- `error_type`: Type/description of error
- `retry_available`: Whether user can retry the action

**Usage:**
```typescript
trackUserVisibleError('scan', 'photo_permission_denied', true);
trackUserVisibleError('chat', 'session_invalid', false);
```

**Purpose:** Track user experience issues and identify UX improvements

---

## Event Tracking by Feature

### Home Screen

**File:** `app/(tabs)/home.tsx`

| Event                  | Trigger                           | Properties                                           |
|------------------------|-----------------------------------|------------------------------------------------------|
| `feature_opened`       | Tab focused                       | `feature_name: 'home'`                               |
| `user_visible_error`   | Session invalid                   | `feature: 'home'`, `error_type: 'session_invalid'`   |
| `user_visible_error`   | Profile fetch failed              | `feature: 'home'`, `error_type: 'profile_fetch_failed'` |
| `user_visible_error`   | Sign out failed                   | `feature: 'home'`, `error_type: 'signout_failed'`    |

**Usage Pattern:**
- Tracks feature discovery (tab opens)
- Tracks critical errors that impact home screen functionality

---

### Scan Feature

**File:** `app/(tabs)/scan.tsx`, `utils/ai/scan.ts`

| Event                  | Trigger                           | Properties                                           |
|------------------------|-----------------------------------|------------------------------------------------------|
| `feature_opened`       | Tab focused                       | `feature_name: 'scan'`                               |
| `scan_started`         | User initiates scan               | `scan_type`, `source`                                |
| `scan_completed`       | Scan succeeds                     | `scan_type`, `result_category`, `processing_time_ms` |
| `scan_failed`          | Scan fails                        | `error_type`, `stage`                                |
| `result_viewed`        | Results rendered                  | `result_category`                                    |
| `user_visible_error`   | Session invalid                   | `feature: 'scan'`, `error_type: 'session_invalid'`   |
| `user_visible_error`   | Profile fetch failed              | `feature: 'scan'`, `error_type: 'profile_fetch_failed'` |
| `user_visible_error`   | Quota check failed                | `feature: 'scan'`, `error_type: 'quota_check_failed'` |
| `user_visible_error`   | Photo permission denied           | `feature: 'scan'`, `error_type: 'photo_permission_denied'` |

**Usage Pattern:**
- Full scan funnel tracking (start → complete/fail → view)
- Performance monitoring (processing time)
- Error tracking at each stage
- Permission tracking

---

### Chat Feature

**File:** `app/(tabs)/chat/index.tsx`, `app/(tabs)/chat/[id].tsx`, `utils/ai/chat.ts`

| Event                  | Trigger                           | Properties                                           |
|------------------------|-----------------------------------|------------------------------------------------------|
| `feature_opened`       | Tab focused                       | `feature_name: 'chat'`                               |
| `user_visible_error`   | Session invalid                   | `feature: 'chat'`, `error_type: 'session_invalid'`   |
| `user_visible_error`   | Profile fetch failed              | `feature: 'chat'`, `error_type: 'profile_fetch_failed'` |
| `user_visible_error`   | Chat create failed                | `feature: 'chat'`, `error_type: 'chat_create_failed'` |
| `user_visible_error`   | Conversation ID create failed     | `feature: 'chat'`, `error_type: 'cid_create_failed'` |
| `user_visible_error`   | Chat delete failed                | `feature: 'chat'`, `error_type: 'chat_delete_failed'` |
| `user_visible_error`   | Generate response failed          | `feature: 'chat'`, `error_type: 'generate_response_failed'` |
| `user_visible_error`   | Fetch chats failed                | Multiple related error types                         |

**Usage Pattern:**
- Feature discovery (tab opens)
- Comprehensive error tracking for all chat operations
- Retry availability tracked for all errors

---

### Contact Search Feature

**File:** `app/(tabs)/contact-search.tsx`, `utils/ai/search.ts`

| Event                  | Trigger                           | Properties                                           |
|------------------------|-----------------------------------|------------------------------------------------------|
| `feature_opened`       | Tab focused                       | `feature_name: 'contact_search'`                        |
| `user_visible_error`   | Session invalid                   | `feature: 'contact_search'`, `error_type: 'session_invalid'` |
| `user_visible_error`   | Profile fetch failed              | `feature: 'contact_search'`, `error_type: 'profile_fetch_failed'` |
| `user_visible_error`   | Search failed                     | `feature: 'search'`, `error_type: 'search_failed'`   |

**Usage Pattern:**
- Feature discovery tracking
- Search operation error tracking

---

### Learning Center

**File:** `app/(tabs)/learn/index.tsx`, `app/(tabs)/learn/[slug].tsx`

| Event                  | Trigger                           | Properties                                           |
|------------------------|-----------------------------------|------------------------------------------------------|
| `feature_opened`       | Tab focused                       | `feature_name: 'learning_center'`                    |
| `article_viewed`       | Article loaded                    | `article_id`, `category`                             |
| `article_engaged`      | Deep engagement criteria met      | `article_id`, `time_on_page_seconds`                 |
| `user_visible_error`   | Article not found                 | `feature: 'learn'`, `error_type: 'article_not_found'` |
| `user_visible_error`   | Search failed                     | `feature: 'learn'`, `error_type: 'search_failed'`    |

**Usage Pattern:**
- Feature discovery
- Content performance tracking (views vs. engagement)
- Content quality measurement (deep engagement metrics)

---

### Login/Auth

**File:** `app/(auth)/login.tsx`, `contexts/AuthContext.tsx`

| Event                  | Trigger                           | Properties                                           |
|------------------------|-----------------------------------|------------------------------------------------------|
| `user_visible_error`   | Auth error                        | `feature: 'login'`, `error_type: 'auth_error'`       |
| `user_visible_error`   | Unexpected error                  | `feature: 'login'`, `error_type: 'unexpected_error'` |

**Note:** User identification happens automatically after successful login

**Usage Pattern:**
- Error tracking only
- Success tracked via user identification

---

## Control Functions

### Enable/Disable Analytics

**Functions:**
- `enableAnalytics()`: Enable event capture (called automatically by `identifyUser()`)
- `disableAnalytics()`: Disable event capture (called by `resetUser()`)
- `isAnalyticsActive()`: Check if analytics are enabled

**Usage:**
```typescript
// Check if analytics are active
if (isAnalyticsActive()) {
  // Safe to track events
}
```

### Generic Event Capture

**Function:** `captureEvent(eventName: string, properties?: Record<string, unknown>)`

**Purpose:** Low-level event capture function (used internally by all tracking functions)

**Usage:**
```typescript
captureEvent('custom_event', {
  custom_property: 'value'
});
```

**Note:** Only captures if analytics are enabled

---

## Event Summary

### Total Events: 9 event types

**By Category:**

**Scan Events (5):**
1. `scan_started`
2. `scan_completed`
3. `scan_failed`
4. `result_viewed`
5. `result_rated` (not yet implemented in UI)

**Content Events (2):**
6. `article_viewed`
7. `article_engaged`

**Discovery Events (1):**
8. `feature_opened`

**Error Events (1):**
9. `user_visible_error`

**Session Events (2):**
- `session_started` (automatic)
- `session_ended` (automatic)

### Event Frequency Estimates

Based on typical user journey:

**High Frequency:**
- `feature_opened` - Every tab switch
- `user_visible_error` - Varies by errors
- `session_started` / `session_ended` - Every app open/close

**Medium Frequency:**
- `scan_started` / `scan_completed` - Per scan (core feature)
- `article_viewed` - Per article read

**Low Frequency:**
- `article_engaged` - Only deep engagement (75%+ scroll + 60s+)
- `scan_failed` - Only on errors
- `result_rated` - When implemented

---

## Type Definitions

### UserPlan
```typescript
type UserPlan = 'free' | 'trial' | 'paid';
```

### ScanType
```typescript
type ScanType = 'image' | 'screenshot';
```

### ScanSource
```typescript
type ScanSource = 'camera' | 'upload';
```

### ResultCategory
```typescript
type ResultCategory = 'scam' | 'likely_scam' | 'unsure' | 'safe';
```

### ScanStage
```typescript
type ScanStage = 'upload' | 'processing' | 'response';
```

### FeatureName
```typescript
type FeatureName =
  | 'home'
  | 'scan'
  | 'chat'
  | 'contact_search'
  | 'learning_center'
  | 'article'
  | 'settings'
  | 'history';
```

---

## Best Practices

### When to Track Events

✅ **DO track:**
- User actions with clear intent (scan, read article, navigate)
- Successful completions of key actions
- Meaningful errors that impact user experience
- Deep engagement signals (time, scroll depth)

❌ **DON'T track:**
- PII or sensitive user data
- Content of user inputs or outputs
- Silent/background operations
- Overly granular micro-interactions

### Privacy Guidelines

**Always:**
- Use anonymous identifiers (UUIDs)
- Track behavior, not identity
- Use aggregate categories, not specific content
- Consider GDPR and privacy regulations

**Never:**
- Capture email addresses or names
- Track message or image contents
- Store sensitive personal data
- Track without user consent (via authentication)

### Event Naming

**Convention:** `snake_case`

**Structure:** `noun_verb` or `verb_noun`

**Examples:**
- ✅ `scan_started` (clear, consistent)
- ✅ `article_viewed` (clear, consistent)
- ❌ `scanStart` (wrong case)
- ❌ `start_scan` (inconsistent verb position)

### Property Naming

**Convention:** `snake_case`

**Be Specific:**
- ✅ `processing_time_ms` (clear units)
- ❌ `time` (ambiguous)

**Use Type-Safe Values:**
- ✅ Use enums/types for categorical data
- ✅ Include units in property names when applicable

---

## Testing

**Development Mode:**
- Analytics enabled after authentication (same as production)
- Events visible in PostHog dashboard
- Test with real PostHog instance

**Debugging:**
```typescript
// Check if analytics are active
console.log('Analytics active:', isAnalyticsActive());

// Check client availability
console.log('PostHog client:', getPostHogClient());
```

---

## Troubleshooting

### Events Not Appearing

1. **Check authentication:** Analytics only work after `identifyUser()` is called
2. **Check client initialization:** Ensure PostHog provider is mounted
3. **Check API key:** Verify `EXPO_PUBLIC_POSTHOG_API_KEY` is set
4. **Check network:** PostHog requires network access

### Duplicate Events

1. Check for multiple `trackFeatureOpened()` calls
2. Review React component re-renders
3. Use `useEffect` dependencies correctly

### Missing User Context

1. Ensure `identifyUser()` called after login
2. Check that user plan is correctly determined
3. Verify authentication state is stable

---

## Analytics Dashboard Recommendations

### Key Metrics to Track

**Scan Feature:**
- Scan completion rate: `scan_completed` / `scan_started`
- Average processing time: `processing_time_ms` mean
- Result distribution: Group by `result_category`
- Failure rate by stage: Group by `stage` in `scan_failed`

**Content Engagement:**
- View-to-engagement rate: `article_engaged` / `article_viewed`
- Top articles: Count `article_viewed` by `article_id`
- Average engagement time: `time_on_page_seconds` mean

**Feature Adoption:**
- Feature usage: Count `feature_opened` by `feature_name`
- User retention: Track `session_started` over time
- Session duration: `duration_seconds` mean from `session_ended`

**Error Rates:**
- Error frequency: Count `user_visible_error` by `feature`
- Error types: Group by `error_type`
- Retry success: Track retry-available vs. non-retry errors

### Funnels to Build

**Scan Funnel:**
1. `feature_opened` (feature_name: 'scan')
2. `scan_started`
3. `scan_completed` OR `scan_failed`
4. `result_viewed`

**Content Funnel:**
1. `feature_opened` (feature_name: 'learning_center')
2. `article_viewed`
3. `article_engaged`

**User Onboarding:**
1. User identified (identifyUser)
2. `session_started`
3. First `feature_opened`

---

## Future Enhancements

### Potential New Events

**Currently Missing:**
- Result rating UI (`result_rated` event exists but not used)
- Search query tracking (without capturing queries)
- Settings changes
- History/scan result revisits
- Share functionality (if added)

### Enhanced Tracking

- Add scan type distribution analysis
- Track time-to-first-scan
- Add user cohort analysis (by plan)
- Track feature discovery patterns
- Add A/B testing capabilities

---

## Summary Statistics

**Total Event Types:** 9 (+ 2 automatic session events)

**Event Tracking Locations:** 30+ across codebase

**Features with Analytics:**
- Home (4 tracking points)
- Scan (9 tracking points)
- Chat (8 tracking points)
- Contact Search (3 tracking points)
- Learning Center (5 tracking points)
- Login (2 tracking points)

**Most Tracked Feature:** Scan (comprehensive funnel tracking)

**Privacy Compliance:** Zero PII captured, user consent via authentication
