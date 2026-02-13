/**
 * Onboarding WebView Screen
 *
 * Renders a full-screen WebView pointed at the Scamly onboarding portal.
 * Passes the user's access token as a URL parameter so the web app can
 * authenticate API calls on behalf of the user.
 *
 * Automatically detects when the web app navigates to the onboarding-complete
 * URL, re-checks the onboarding status, and navigates to the home screen.
 */

import ThemedBackground from "@/components/ThemedBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import { useRef, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WebView, type WebViewNavigation } from "react-native-webview";

const ONBOARDING_BASE_URL = "https://test.scamly.io/portal/onboarding";
const ONBOARDING_COMPLETE_URL = "https://test.scamly.io/portal/onboarding-complete";

export default function Onboarding() {
  const { colors } = useTheme();
  const router = useRouter();
  const { session, checkOnboarding } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const hasDetectedCompletion = useRef(false);

  const accessToken = session?.access_token ?? "";
  const onboardingUrl = `${ONBOARDING_BASE_URL}?token=${accessToken}`;

  /**
   * Monitor URL changes in the WebView.
   * When the onboarding-complete URL is detected, re-check onboarding
   * status and navigate to the home screen.
   */
  const handleNavigationStateChange = async (navState: WebViewNavigation) => {
    // Prevent duplicate handling
    if (hasDetectedCompletion.current) return;

    const currentUrl = navState.url;

    if (currentUrl.startsWith(ONBOARDING_COMPLETE_URL)) {
      hasDetectedCompletion.current = true;

      // Re-check onboarding status in AuthContext
      await checkOnboarding();

      // Navigate to home
      router.replace("/home");
    }
  };

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safeArea} edges={["top"]}>
        <View style={styles.container}>
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          )}
          <WebView
            source={{ uri: onboardingUrl }}
            style={styles.webview}
            onNavigationStateChange={handleNavigationStateChange}
            onLoadStart={() => setIsLoading(true)}
            onLoadEnd={() => setIsLoading(false)}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={false}
            sharedCookiesEnabled={true}
          />
        </View>
      </SafeAreaView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
});
