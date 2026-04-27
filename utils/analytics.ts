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
import { PostHog } from 'posthog-react-native';
import type { User } from '@supabase/supabase-js';
import { AppState, AppStateStatus, Platform } from 'react-native';

// ============================================================================
// Types
// ============================================================================

export type UserPlan = 'free' | 'trial' | 'paid';

export type ScanType = 'image' | 'screenshot';
export type ScanSource = 'camera' | 'upload';
export type ResultCategory = 'scam' | 'likely_scam' | 'unsure' | 'safe';
/** Stages reported when a scan fails (edge function, client, or quota). */
export type ScanStage =
  | 'upload'
  | 'processing'
  | 'validation'
  | 'quota_exceeded'
  | 'auth'
  | 'rate_limit';

export type FeatureName =
  | 'home'
  | 'scan'
  | 'chat'
  | 'contact_search'
  | 'learning_center'
  | 'article'
  | 'settings'
  | 'history'
  | 'feedback_wall';

/** Where the in-app paywall flow was started (upgrade button context). */
export type PaywallTrigger =
  | 'onboarding'
  | 'onboarding_tutorial'
  | 'profile_upgrade'
  | 'chat_locked'
  | 'contact_search_locked'
  | 'library_articles_locked'
  | 'library_quick_tips_locked'
  | 'scan_premium_upsell';

export type PaywallPresentationMode = 'always' | 'if_needed';

export type ShortcutSetupEntry = 'subscription_success' | 'scan_tab';

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
/**
 * Supabase auth provider for acquisition / signup method reporting (no PII).
 */
export function getAuthenticationMethodForAnalytics(
  user: User | null
): 'email' | 'google' | 'apple' | 'unknown' {
  if (!user) return 'unknown';
  const provider = user.identities?.[0]?.provider;
  if (provider === 'email' || provider === 'google' || provider === 'apple') {
    return provider;
  }
  return 'unknown';
}

export function identifyUser(
  userId: string,
  plan: UserPlan,
  authMethod: 'email' | 'google' | 'apple' | 'unknown' = 'unknown',
): void {
  if (!posthogClient) return;

  const appVersion = Application.nativeApplicationVersion || 'unknown';
  const platform = Platform.OS;

  posthogClient.identify(userId, {
    user_id: userId,
    plan,
    platform,
    app_version: appVersion,
    auth_provider: authMethod,
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
// Pre-Auth Event Capture
// ============================================================================

/**
 * Capture an event that occurs before authentication (e.g., signup flow).
 * Bypasses the isAnalyticsEnabled check since the user isn't logged in yet.
 * Requires PostHog client to be initialized.
 */
export function capturePreAuthEvent(
  eventName: string,
  properties?: Record<string, unknown>
): void {
  if (!posthogClient) return;

  posthogClient.capture(eventName, properties);
}

// ============================================================================
// Onboarding funnel (profile + in-app tutorial + paywall)
// ============================================================================

export type OnboardingFunnelStep =
  | 'profile_name'
  | 'profile_oauth_welcome'
  | 'profile_dob'
  | 'profile_gender'
  | 'profile_country'
  | 'profile_referral'
  | 'tutorial_email_reminder'
  | 'tutorial_offer'
  | 'tutorial_how_it_works'
  | 'tutorial_screenshot'
  | 'first_scan'
  | 'tutorial_celebration';

/**
 * Funnel position for finding drop-off points. Includes auth method for signup method reports.
 */
export function trackOnboardingStepViewed(
  step: OnboardingFunnelStep,
  properties?: { auth_method?: 'email' | 'google' | 'apple' | 'unknown' }
): void {
  captureEvent('onboarding_step_viewed', { step, ...properties });
}

/**
 * User left the in-app tutorial without finishing the guided flow.
 */
export function trackOnboardingTutorialDismissed(
  atStep:
    | 'tutorial_offer'
    | 'tutorial_how_it_works'
    | 'tutorial_screenshot'
    | 'tutorial_email_reminder'
    | 'first_scan',
  properties?: { auth_method?: 'email' | 'google' | 'apple' | 'unknown' }
): void {
  captureEvent('onboarding_tutorial_dismissed', { at_step: atStep, ...properties });
}

/**
 * Outcome of the post-tutorial paywall (dismissed vs purchase).
 */
export function trackOnboardingTutorialPaywallResult(
  result: 'dismissed' | 'purchased' | 'restored' | 'error',
  properties?: { auth_method?: 'email' | 'google' | 'apple' | 'unknown' }
): void {
  captureEvent('onboarding_tutorial_paywall_result', { result, ...properties });
}

// ============================================================================
// Signup Funnel Events
// ============================================================================

/**
 * Track when a user opens the signup page (step 1).
 * Marks the top of the signup funnel.
 */
export function trackSignupStarted(): void {
  capturePreAuthEvent('signup_started');
}

/**
 * Email + password account created in-app; profile is completed in the onboarding flow.
 */
export function trackEmailPasswordSignupAccountCreated(): void {
  capturePreAuthEvent('email_password_signup_account_created', { signup_method: 'email' });
}

/**
 * oAuth sign-in from the login screen (used with Supabase `signInWithIdToken`).
 */
export function trackOAuthSignInCompleted(provider: 'google' | 'apple'): void {
  capturePreAuthEvent('oauth_sign_in_completed', { provider });
}

/**
 * Track when the Supabase signUp API call is initiated.
 * Includes referral source and country for acquisition insights.
 * No PII (no email, name, or DOB).
 */
export function trackSignupAttempted(referralSource: string, country: string): void {
  capturePreAuthEvent('signup_attempted', {
    referral_source: referralSource,
    country,
  });
}

/**
 * Track when signup completes successfully (Supabase returns no error).
 * Includes referral source and country for acquisition dashboards.
 */
export function trackSignupCompleted(referralSource: string, country: string): void {
  capturePreAuthEvent('signup_completed', {
    referral_source: referralSource,
    country,
  });
}

/**
 * Track when signup fails due to a Supabase auth error.
 * Includes error type (e.g., "User already registered") but no PII.
 */
export function trackSignupFailed(errorType: string): void {
  capturePreAuthEvent('signup_failed', {
    error_type: errorType,
  });
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
 * Fired on auth, upload, processing, response, or quota errors.
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
// Paywall (in-app RevenueCat UI) — complements RevenueCat → PostHog subscription events
// ============================================================================

/**
 * User initiated a paywall presentation (tapped Upgrade, etc.).
 * Pair with `paywall_flow_finished` for conversion funnels.
 */
export function trackPaywallFlowStarted(
  trigger: PaywallTrigger,
  presentation: PaywallPresentationMode,
  offeringKey?: string
): void {
  captureEvent('paywall_flow_started', {
    trigger,
    presentation,
    offering_key: offeringKey ?? 'default',
  });
}

/**
 * RevenueCat paywall UI finished with a result (including NOT_PRESENTED when already entitled).
 */
export function trackPaywallFlowFinished(
  trigger: PaywallTrigger,
  presentation: PaywallPresentationMode,
  result: string,
  didUnlockEntitlement: boolean,
  offeringKey?: string
): void {
  captureEvent('paywall_flow_finished', {
    trigger,
    presentation,
    result,
    did_unlock_entitlement: didUnlockEntitlement,
    offering_key: offeringKey ?? 'default',
  });
}

// ============================================================================
// Feedback wall
// ============================================================================

export function trackFeedbackWallOpened(entryPoint: string): void {
  captureEvent('feedback_wall_opened', { entry_point: entryPoint });
  trackFeatureOpened('feedback_wall');
}

export function trackFeedbackWallComposerOpened(): void {
  captureEvent('feedback_wall_composer_opened', {});
}

export function trackFeedbackPostSubmitted(): void {
  captureEvent('feedback_post_submitted', {});
}

export function trackFeedbackItemOpened(feedbackId: string): void {
  captureEvent('feedback_item_opened', { feedback_id: feedbackId });
}

export function trackFeedbackVote(feedbackId: string, action: 'like' | 'unlike'): void {
  captureEvent('feedback_vote', { feedback_id: feedbackId, action });
}

export function trackFeedbackCommentPosted(feedbackId: string): void {
  captureEvent('feedback_comment_posted', { feedback_id: feedbackId });
}

export function trackFeedbackReportSubmitted(feedbackId: string, reasonKey: string): void {
  captureEvent('feedback_report_submitted', {
    feedback_id: feedbackId,
    reason_key: reasonKey,
  });
}

// ============================================================================
// iOS Quick Scan shortcut setup
// ============================================================================

export function trackShortcutSetupModalOpened(entry: ShortcutSetupEntry): void {
  captureEvent('shortcut_setup_modal_opened', { entry });
}

export function trackShortcutInstallLinkOpened(entry: ShortcutSetupEntry): void {
  captureEvent('shortcut_install_link_opened', { entry });
}

// ============================================================================
// Account management
// ============================================================================

export function trackAccountDeletionConfirmed(): void {
  captureEvent('account_deletion_confirmed', {});
}

export function trackAccountDeletionSucceeded(): void {
  captureEvent('account_deletion_succeeded', {});
}

export function trackAccountDeletionFailed(errorStage: 'edge_function' | 'unexpected'): void {
  captureEvent('account_deletion_failed', { error_stage: errorStage });
}

// ============================================================================
// Library articles — scroll depth (once per depth band per view)
// ============================================================================

export type ArticleScrollDepthBand = 25 | 50 | 75 | 100;

export function trackArticleScrollDepthReached(
  articleId: string,
  depthPercent: ArticleScrollDepthBand,
  timeOnPageSeconds: number
): void {
  captureEvent('article_scroll_depth_reached', {
    article_id: articleId,
    depth_percent: depthPercent,
    time_on_page_seconds: timeOnPageSeconds,
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

