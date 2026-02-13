/**
 * Sentry Error Reporting Module for Scamly
 *
 * Centralizes Sentry initialization, user context, and error capture logic.
 * Mirrors the structure of analytics.ts for consistency.
 *
 * Key principles:
 * - Critical errors: Block user progress (scan fails, chat fails)
 * - Warnings: Non-blocking issues (view count increment fails)
 * - Ignored: Expected user errors (wrong credentials), client wifi issues
 */

import * as Sentry from '@sentry/react-native';
import * as Application from 'expo-application';
import { Platform } from 'react-native';

// ============================================================================
// Types
// ============================================================================

export type ErrorSeverity = 'critical' | 'warning' | 'info';

export type FeatureName =
  | 'scan'
  | 'chat'
  | 'home'
  | 'contact_search'
  | 'learn'
  | 'login'
  | 'signup'
  | 'auth';

export type ErrorContext = {
  feature: FeatureName;
  action: string;
  severity?: ErrorSeverity;
  extra?: Record<string, unknown>;
};

export type NetworkErrorContext = ErrorContext & {
  statusCode?: number;
  url?: string;
};

// ============================================================================
// Configuration
// ============================================================================

const SENTRY_DSN = process.env.EXPO_PUBLIC_SENTRY_DSN || '';

// Client-side network error patterns to filter out
const CLIENT_NETWORK_ERROR_PATTERNS = [
  'network request failed',
  'network error',
  'failed to fetch',
  'load failed',
  'the internet connection appears to be offline',
  'a server with the specified hostname could not be found',
  'the network connection was lost',
  'could not connect to the server',
  'dns lookup failed',
  'err_internet_disconnected',
  'err_network_changed',
  'timeout',
  'aborted',
];

// Auth error messages that should be ignored (expected user behavior)
const IGNORED_AUTH_ERRORS = [
  'invalid login credentials',
  'invalid_credentials',
  'email not confirmed',
  'user not found',
  'wrong password',
  'invalid password',
];

// ============================================================================
// State Management
// ============================================================================

let isSentryEnabled = false;
let currentUserId: string | null = null;
let currentUserPlan: string | null = null;

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize Sentry SDK. Called once at app startup in _layout.tsx.
 * Configures error capturing, environment, and release info.
 */
export function initializeSentry(): void {
  if (!SENTRY_DSN) {
    console.warn('Sentry DSN not configured - error reporting disabled');
    return;
  }

  const appVersion = Application.nativeApplicationVersion || 'unknown';
  const buildNumber = Application.nativeBuildVersion || 'unknown';

  Sentry.init({
    dsn: SENTRY_DSN,
    environment: __DEV__ ? 'development' : 'production',
    release: `scamly-app@${appVersion}+${buildNumber}`,
    dist: buildNumber,
    debug: __DEV__,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    // Don't send events in development by default
    enabled: !__DEV__,
    // Filter out noisy errors
    beforeSend(event, hint) {
      const error = hint.originalException;
      if (error instanceof Error) {
        // Filter client network errors
        if (isClientNetworkError(error)) {
          return null;
        }
        // Filter ignored auth errors
        if (isIgnoredAuthError(error)) {
          return null;
        }
      }
      return event;
    },
    // Add default tags
    initialScope: {
      tags: {
        platform: Platform.OS,
        app_version: appVersion,
      },
    },
  });

  isSentryEnabled = true;
}

/**
 * Enable Sentry error reporting.
 * Called after user authentication if needed.
 */
export function enableSentry(): void {
  isSentryEnabled = true;
}

/**
 * Disable Sentry error reporting.
 * Called on logout if error reporting should stop.
 */
export function disableSentry(): void {
  isSentryEnabled = false;
}

/**
 * Check if Sentry is currently active.
 */
export function isSentryActive(): boolean {
  return isSentryEnabled && !!SENTRY_DSN;
}

// ============================================================================
// User Context
// ============================================================================

/**
 * Set user context for error tracking.
 * Called after successful authentication.
 * 
 * @param userId - Supabase user ID
 * @param plan - User's subscription plan (free, trial, paid)
 */
export function setUserContext(userId: string, plan: string): void {
  currentUserId = userId;
  currentUserPlan = plan;

  Sentry.setUser({
    id: userId,
  });

  Sentry.setTag('user_plan', plan);
}

/**
 * Clear user context on logout.
 */
export function clearUserContext(): void {
  currentUserId = null;
  currentUserPlan = null;
  Sentry.setUser(null);
}

// ============================================================================
// Error Classification Helpers
// ============================================================================

/**
 * Check if an error is a client-side network error (user's wifi/connectivity issue).
 * These errors should not be reported to Sentry.
 */
function isClientNetworkError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return CLIENT_NETWORK_ERROR_PATTERNS.some((pattern) =>
    message.includes(pattern)
  );
}

/**
 * Check if an error is an expected auth error (wrong credentials, etc.).
 * These are normal user behavior, not bugs.
 */
function isIgnoredAuthError(error: Error): boolean {
  const message = error.message.toLowerCase();
  return IGNORED_AUTH_ERRORS.some((pattern) => message.includes(pattern));
}

/**
 * Check if an HTTP status code indicates a server-side error worth reporting.
 * 5xx errors = server problem (report)
 * 4xx errors = usually client issue (don't report most)
 */
function isServerError(statusCode?: number): boolean {
  if (!statusCode) return false;
  return statusCode >= 500 && statusCode < 600;
}

/**
 * Map our severity levels to Sentry severity levels.
 */
function getSeverityLevel(severity: ErrorSeverity): Sentry.SeverityLevel {
  switch (severity) {
    case 'critical':
      return 'error';
    case 'warning':
      return 'warning';
    case 'info':
      return 'info';
    default:
      return 'error';
  }
}

// ============================================================================
// Core Error Capture
// ============================================================================

/**
 * Capture an error with full context.
 * This is the main error capture function used throughout the app.
 * 
 * @param error - The error to capture
 * @param context - Context about where and how the error occurred
 */
export function captureError(
  error: Error | unknown,
  context: ErrorContext
): void {
  if (!isSentryActive()) return;

  const errorObj = error instanceof Error ? error : new Error(String(error));
  const severity = context.severity || 'critical';

  Sentry.withScope((scope) => {
    // Set severity
    scope.setLevel(getSeverityLevel(severity));

    // Set context tags
    scope.setTag('feature', context.feature);
    scope.setTag('action', context.action);
    scope.setTag('severity', severity);

    // Add extra data
    if (context.extra) {
      scope.setExtras(context.extra);
    }

    // Add user context if available
    if (currentUserId) {
      scope.setTag('user_id', currentUserId);
    }
    if (currentUserPlan) {
      scope.setTag('user_plan', currentUserPlan);
    }

    // Capture the error
    Sentry.captureException(errorObj);
  });
}

// ============================================================================
// Network Error Capture (with smart filtering)
// ============================================================================

/**
 * Capture a network error with smart filtering.
 * Filters out client-side connectivity issues and only reports server-side problems.
 * 
 * @param error - The network error
 * @param context - Context including optional status code
 */
export function captureNetworkError(
  error: Error | unknown,
  context: NetworkErrorContext
): void {
  if (!isSentryActive()) return;

  const errorObj = error instanceof Error ? error : new Error(String(error));

  // Filter out client network errors (user's wifi issue)
  if (isClientNetworkError(errorObj)) {
    return;
  }

  // For HTTP errors, only report 5xx server errors
  if (context.statusCode && !isServerError(context.statusCode)) {
    // 4xx errors are usually client issues, don't report
    return;
  }

  Sentry.withScope((scope) => {
    scope.setLevel(getSeverityLevel(context.severity || 'critical'));
    scope.setTag('feature', context.feature);
    scope.setTag('action', context.action);
    scope.setTag('error_type', 'network');

    if (context.statusCode) {
      scope.setTag('http_status', String(context.statusCode));
    }
    if (context.url) {
      scope.setExtra('url', context.url);
    }
    if (context.extra) {
      scope.setExtras(context.extra);
    }

    Sentry.captureException(errorObj);
  });
}

// ============================================================================
// Feature-Specific Error Capture
// ============================================================================

/**
 * Capture a scan-related error (always critical as it blocks user progress).
 */
export function captureScanError(
  error: Error | unknown,
  action: string,
  extra?: Record<string, unknown>
): void {
  captureError(error, {
    feature: 'scan',
    action,
    severity: 'critical',
    extra,
  });
}

/**
 * Capture a chat-related error (always critical as it blocks user progress).
 */
export function captureChatError(
  error: Error | unknown,
  action: string,
  extra?: Record<string, unknown>
): void {
  captureError(error, {
    feature: 'chat',
    action,
    severity: 'critical',
    extra,
  });
}

/**
 * Capture a data fetch error with configurable severity.
 * Use 'warning' for non-blocking errors (e.g., analytics, view counts).
 * Use 'critical' for blocking errors (e.g., profile fetch, content fetch).
 */
export function captureDataFetchError(
  error: Error | unknown,
  feature: FeatureName,
  action: string,
  severity: ErrorSeverity = 'critical',
  extra?: Record<string, unknown>
): void {
  captureError(error, {
    feature,
    action,
    severity,
    extra,
  });
}

/**
 * Capture a non-critical warning (doesn't block user progress).
 * Examples: failed to increment view count, failed to track analytics.
 */
export function captureWarning(
  error: Error | unknown,
  feature: FeatureName,
  action: string,
  extra?: Record<string, unknown>
): void {
  captureError(error, {
    feature,
    action,
    severity: 'warning',
    extra,
  });
}

// ============================================================================
// Breadcrumbs
// ============================================================================

/**
 * Add a navigation breadcrumb for better error context.
 */
export function addNavigationBreadcrumb(
  from: string,
  to: string
): void {
  if (!isSentryActive()) return;

  Sentry.addBreadcrumb({
    category: 'navigation',
    message: `Navigated from ${from} to ${to}`,
    level: 'info',
  });
}

/**
 * Add a user action breadcrumb for better error context.
 */
export function addActionBreadcrumb(
  action: string,
  feature: FeatureName,
  data?: Record<string, unknown>
): void {
  if (!isSentryActive()) return;

  Sentry.addBreadcrumb({
    category: 'user_action',
    message: `${feature}: ${action}`,
    level: 'info',
    data,
  });
}
