import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ThemeProvider, useTheme } from "@/theme";
import { initializePostHog, initializeSessionTracking } from "@/utils/analytics";
import { initializeRevenueCat, trackRevenueCatError } from "@/utils/revenuecat";
import { initializeSentry } from "@/utils/sentry";
import ThemedBackground from "@/components/ThemedBackground";
import * as Sentry from "@sentry/react-native";
import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { PostHogProvider, usePostHog } from "posthog-react-native";
import { useEffect } from "react";
import { ActivityIndicator, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

// Initialize Sentry as early as possible
initializeSentry();

SplashScreen.preventAutoHideAsync();

// PostHog configuration from environment variables
const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY || '';
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

/**
 * Analytics initializer component.
 * Registers PostHog client with our analytics module and sets up session tracking.
 */
function AnalyticsInitializer() {
  const posthog = usePostHog();

  useEffect(() => {
    if (posthog) {
      // Register PostHog client with our analytics module
      initializePostHog(posthog);
      // Set up AppState listener for session tracking
      initializeSessionTracking();
    }
  }, [posthog]);

  return null;
}

function AppContent() {
  const { isDark } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    initializeRevenueCat(user?.id ?? null).catch((error) => {
      trackRevenueCatError("configure_sdk", error);
    });
  }, [user?.id]);

  return (
    <ThemedBackground>
      <StatusBar style={isDark ? "light" : "dark"} />
      <AnalyticsInitializer />
      <Slot />
    </ThemedBackground>
  );
}

export default function Layout() {
  const [fontsLoaded] = useFonts({
    "Poppins-Regular": require("@/assets/fonts/Poppins-Regular.ttf"),
    "Poppins-Bold": require("@/assets/fonts/Poppins-Bold.ttf"),
    "Poppins-Medium": require("@/assets/fonts/Poppins-Medium.ttf"),
    "Poppins-Light": require("@/assets/fonts/Poppins-Light.ttf"),
    "Poppins-SemiBold": require("@/assets/fonts/Poppins-SemiBold.ttf"),
    "Poppins-LightItalic": require("@/assets/fonts/Poppins-LightItalic.ttf"),
    "Poppins-ExtraLightItalic": require("@/assets/fonts/Poppins-ExtraLightItalic.ttf"),
    "Poppins-Italic": require("@/assets/fonts/Poppins-Italic.ttf"),
  });

  useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) {
    return <ActivityIndicator size="large" />;
  }

  return (
    <Sentry.ErrorBoundary
      fallback={({ error }) => (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 20 }}>
          <Text style={{ fontSize: 18, fontWeight: "bold", marginBottom: 10 }}>
            Something went wrong
          </Text>
          <Text style={{ textAlign: "center", color: "#666" }}>
            We&apos;ve been notified and are working to fix the issue. Please restart the app.
          </Text>
        </View>
      )}
    >
      <PostHogProvider
        apiKey={POSTHOG_API_KEY}
        options={{ host: POSTHOG_HOST }}
        autocapture={{
          captureTouches: true,
          ignoreLabels: [],
          customLabelProp: 'ph-label',
          noCaptureProp: 'ph-no-capture',
        }}
      >
        <SafeAreaProvider>
          <ThemeProvider>
            <AuthProvider>
              <AppContent />
            </AuthProvider>
          </ThemeProvider>
        </SafeAreaProvider>
      </PostHogProvider>
    </Sentry.ErrorBoundary>
  );
}