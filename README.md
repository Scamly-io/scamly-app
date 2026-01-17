# Scamly

A mobile application for scam detection and prevention, helping users identify and learn about scams through AI-powered scanning, chat assistance, and educational content.

## Key Features

- **Scanner**: Upload images or screenshots to detect potential scams using AI analysis
- **AI Chat**: Interactive chat interface to ask questions and get advice about scams
- **Info Search**: Search for information about specific scams and threats
- **Learning Center**: Browse educational articles and quick tips about scam prevention
- **User Authentication**: Secure login and user profile management
- **Scan History**: Track and review past scan results

## Tech Stack

- **Framework**: React Native with Expo (~54.0.2)
- **Routing**: Expo Router (file-based routing)
- **Language**: TypeScript
- **Backend**: Supabase (authentication, database, storage)
- **Analytics**: PostHog
- **Error Tracking**: Sentry
- **UI/UX**: 
  - React Native Reanimated for animations
  - Custom theme system with dark mode support
  - Lucide React Native for icons
- **State Management**: React hooks and context
- **Storage**: AsyncStorage for local data persistence

## Getting Started

### Prerequisites

- Node.js (v18 or higher recommended)
- npm or yarn
- Expo CLI (installed globally or via npx)
- iOS Simulator (for macOS) or Android Emulator (for development)
- Expo Go app (optional, for testing on physical devices)

### Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd scamly-app
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables (see Environment Variables section below)

4. Start the development server:
   ```bash
   npx expo start
   ```

5. Run on your preferred platform:
   - Press `i` for iOS simulator
   - Press `a` for Android emulator
   - Scan QR code with Expo Go app for physical device
   - Press `w` for web browser

### Development Commands

- `npm start` - Start Expo development server
- `npm run android` - Start on Android
- `npm run ios` - Start on iOS
- `npm run web` - Start on web
- `npm run lint` - Run ESLint

## Environment Variables

The following environment variables need to be configured in a `.env` file or your environment:

- `EXPO_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `EXPO_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous/public key
- `EXPO_PUBLIC_POSTHOG_API_KEY` - PostHog API key for analytics
- `EXPO_PUBLIC_POSTHOG_HOST` - PostHog host URL (optional, defaults to `https://us.i.posthog.com`)
- `EXPO_PUBLIC_SENTRY_DSN` - Sentry DSN for error tracking

**Note**: Do not commit actual values to version control. Use `.env.local` or similar for local development, and configure these in your deployment environment.

## Architecture Overview

Scamly follows a file-based routing architecture using Expo Router, which maps the file structure in the `app` directory to navigation routes.

### Routing Structure

- **Root Layout** (`app/_layout.tsx`): Initializes Sentry, PostHog, fonts, and theme providers. Sets up global error boundaries.
- **Index** (`app/index.tsx`): Entry point that checks authentication status and redirects to home or login accordingly.
- **Auth Routes** (`app/(auth)/`): Authentication screens (login, etc.)
- **Tab Routes** (`app/(tabs)/`): Main application screens with bottom tab navigation:
  - `home.tsx` - Home dashboard
  - `scan.tsx` - Scam scanner
  - `chat/` - AI chat interface (with nested routes for individual chats)
  - `info-search.tsx` - Information search
  - `learn/` - Learning center with articles and quick tips

### Data Flow

1. **Authentication**: Users authenticate through Supabase Auth. Session is checked on app startup and stored in AsyncStorage.
2. **Backend Communication**: All backend operations (database queries, file uploads, AI chat) go through Supabase client configured in `utils/supabase.ts`.
3. **Analytics**: PostHog tracks user events and sessions. Analytics are only enabled after authentication.
4. **Error Tracking**: Sentry captures and reports errors with context about the feature and user state.
5. **State Management**: React hooks and context API manage local state. Supabase handles server state through real-time subscriptions where needed.

### Key Utilities

- `utils/supabase.ts` - Supabase client configuration
- `utils/analytics.ts` - PostHog analytics wrapper with session tracking
- `utils/sentry.ts` - Sentry error tracking with smart filtering
- `theme/` - Theme system with colors, typography, and dark mode support

## Testing

Currently, there are no automated tests in the codebase. Testing infrastructure and test suites are planned for future development.
