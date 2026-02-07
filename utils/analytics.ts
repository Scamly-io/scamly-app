/**
 * Analytics Module for Scamly
 *
 * Centralizes PostHog initialization, user identification, session tracking,
 * and event capture logic. All analytics are disabled until user is authenticated.
 *
 * Event naming convention: snake_case
 * No PII is ever captured (no emails, names, image contents, or scan payloads)
 */

import * as Application from 'expo-application';
import { AppState, AppStateStatus, Platform } from 'react-native';
import { PostHog } from 'posthog-react-native';

// ============================================================================
// Types
// ============================================================================

export type UserPlan = 'free' | 'trial' | 'paid';

export type ScanType = 'image' | 'screenshot';
export type ScanSource = 'camera' | 'upload';
export type ResultCategory = 'scam' | 'likely_scam' | 'unsure' | 'safe';
export type ScanStage = 'upload' | 'processing' | 'response';

export type FeatureName =
  | 'home'
  | 'scan'
  | 'chat'
  | 'contact_search'
  | 'learning_center'
  | 'article'
  | 'settings'
  | 'history';

// ============================================================================
// Configuration
// ============================================================================

const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY || '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

// ============================================================================
// State Management
// ============================================================================

let posthogClient: PostHog | null = null;
let isAnalyticsEnabled = false;
let currentSessionId: string | null = null;
let sessionStartTime: number | null = null;
let appStateSubscription: { remove: () => void } | null = null;

// ============================================================================
// Initialization
// ============================================================================

/**
 * Get or create the PostHog client instance.
 * Analytics remain disabled until enableAnalytics() is called after auth.
 */
export function getPostHogClient(): PostHog | null {
  return posthogClient;
}

/**
 * Initialize PostHog client. Called once at app startup.
 * Does not enable analytics - that happens after authentication.
 */
export function initializePostHog(client: PostHog): void {
  posthogClient = client;
}

/**
 * Enable analytics after user authentication.
 * This must be called after successful login before any events are captured.
 */
export function enableAnalytics(): void {
  isAnalyticsEnabled = true;
}

/**
 * Disable analytics (e.g., on logout).
 * Clears session and prevents further event capture.
 */
export function disableAnalytics(): void {
  isAnalyticsEnabled = false;
  currentSessionId = null;
  sessionStartTime = null;
}

/**
 * Check if analytics are currently enabled.
 */
export function isAnalyticsActive(): boolean {
  return isAnalyticsEnabled && posthogClient !== null;
}

// ============================================================================
// User Identification
// ============================================================================

/**
 * Identify the authenticated user to PostHog.
 * Called after successful login with Supabase user data.
 *
 * Properties set:
 * - user_id: Stable internal identifier (Supabase user ID)
 * - plan: User's subscription tier (free, trial, paid)
 * - platform: Device platform (ios, android, web)
 * - app_version: Current app version
 */
export function identifyUser(
  userId: string,
  plan: UserPlan
): void {
  if (!posthogClient) return;

  const appVersion = Application.nativeApplicationVersion || 'unknown';
  const platform = Platform.OS;

  posthogClient.identify(userId, {
    user_id: userId,
    plan,
    platform,
    app_version: appVersion,
  });

  enableAnalytics();
}

/**
 * Reset user identity on logout.
 * Clears all user data and disables analytics.
 */
export function resetUser(): void {
  if (posthogClient) {
    posthogClient.reset();
  }
  disableAnalytics();
}

// ============================================================================
// Session Tracking
// ============================================================================

/**
 * Generate a unique session ID.
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/**
 * Start a new session. Called when app enters foreground.
 * Fires session_started event with generated session_id.
 */
export function startSession(): void {
  if (!isAnalyticsActive()) return;

  currentSessionId = generateSessionId();
  sessionStartTime = Date.now();

  captureEvent('session_started', {
    session_id: currentSessionId,
  });
}

/**
 * End the current session. Called when app moves to background.
 * Fires session_ended event with session_id and duration_seconds.
 */
export function endSession(): void {
  if (!isAnalyticsActive() || !currentSessionId || !sessionStartTime) return;

  const durationSeconds = Math.round((Date.now() - sessionStartTime) / 1000);

  captureEvent('session_ended', {
    session_id: currentSessionId,
    duration_seconds: durationSeconds,
  });

  currentSessionId = null;
  sessionStartTime = null;
}

/**
 * Handle app state changes for session tracking.
 * Starts session on foreground, ends on background.
 */
function handleAppStateChange(nextAppState: AppStateStatus): void {
  if (nextAppState === 'active') {
    // App came to foreground
    startSession();
  } else if (nextAppState === 'background' || nextAppState === 'inactive') {
    // App went to background
    endSession();
  }
}

/**
 * Initialize session tracking with AppState listener.
 * Should be called once after PostHog is initialized.
 */
export function initializeSessionTracking(): void {
  // Remove existing subscription if any
  if (appStateSubscription) {
    appStateSubscription.remove();
  }

  // Subscribe to app state changes
  appStateSubscription = AppState.addEventListener('change', handleAppStateChange);

  // Start initial session if app is active
  if (AppState.currentState === 'active' && isAnalyticsActive()) {
    startSession();
  }
}

/**
 * Clean up session tracking listener.
 */
export function cleanupSessionTracking(): void {
  if (appStateSubscription) {
    appStateSubscription.remove();
    appStateSubscription = null;
  }
}

// ============================================================================
// Generic Event Capture
// ============================================================================

/**
 * Capture a generic event. Used internally and can be used for custom events.
 * Only captures if analytics are enabled.
 */
export function captureEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  if (!isAnalyticsActive()) return;

  posthogClient?.capture(eventName, properties);
}

// ============================================================================
// Scan Events
// ============================================================================

/**
 * Track when a user initiates a scam scan.
 * Fired at the start of handleScan() in scan.tsx.
 */
export function trackScanStarted(scanType: ScanType, source: ScanSource): void {
  captureEvent('scan_started', {
    scan_type: scanType,
    source,
  });
}

/**
 * Track when a scan completes successfully.
 * Fired when the scan API returns a successful result.
 */
export function trackScanCompleted(
  scanType: ScanType,
  resultCategory: ResultCategory,
  processingTimeMs: number
): void {
  captureEvent('scan_completed', {
    scan_type: scanType,
    result_category: resultCategory,
    processing_time_ms: processingTimeMs,
  });
}

/**
 * Track when a scan fails at any stage.
 * Fired on upload, processing, or response errors.
 */
export function trackScanFailed(errorType: string, stage: ScanStage): void {
  captureEvent('scan_failed', {
    error_type: errorType,
    stage,
  });
}

/**
 * Track when a user views a completed scan result.
 * Fired when results are rendered on screen.
 */
export function trackResultViewed(resultCategory: ResultCategory): void {
  captureEvent('result_viewed', {
    result_category: resultCategory,
  });
}

/**
 * Track when a user provides feedback on a scan result.
 * Fired when user rates the result as helpful or not helpful.
 */
export function trackResultRated(rating: 'helpful' | 'not_helpful'): void {
  captureEvent('result_rated', {
    rating,
  });
}

// ============================================================================
// Educational Content Events
// ============================================================================

/**
 * Track when an article is opened/viewed.
 * Fired when article content is loaded.
 */
export function trackArticleViewed(articleId: string, category?: string): void {
  captureEvent('article_viewed', {
    article_id: articleId,
    category: category || 'unknown',
  });
}

/**
 * Track meaningful engagement with an article.
 * Only fired if user scrolls 75%+ AND spends 60+ seconds on the article.
 */
export function trackArticleEngaged(
  articleId: string,
  timeOnPageSeconds: number
): void {
  captureEvent('article_engaged', {
    article_id: articleId,
    time_on_page_seconds: timeOnPageSeconds,
  });
}

// ============================================================================
// Feature Discovery Events
// ============================================================================

/**
 * Track when a user opens a primary section of the app.
 * Fired on tab focus to understand feature usage patterns.
 */
export function trackFeatureOpened(featureName: FeatureName): void {
  captureEvent('feature_opened', {
    feature_name: featureName,
  });
}

// ============================================================================
// Error Events
// ============================================================================

/**
 * Track user-visible errors that impact the user experience.
 * Only for errors the user can see or that block progress.
 * Do not use for silent/background errors.
 */
export function trackUserVisibleError(
  feature: string,
  errorType: string,
  retryAvailable: boolean
): void {
  captureEvent('user_visible_error', {
    feature,
    error_type: errorType,
    retry_available: retryAvailable,
  });
}

