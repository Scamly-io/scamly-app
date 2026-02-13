import Button from "@/components/Button";
import ThemedBackground from "@/components/ThemedBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { identifyUser, trackUserVisibleError, type UserPlan } from "@/utils/analytics";
import { configureGoogleSignIn, isGoogleSignInCancelled, signInWithGoogle } from "@/utils/google-auth";
import { checkProfileComplete } from "@/utils/onboarding";
import { captureError, setUserContext } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { Lock, Mail } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeInDown
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Determine the user plan category from subscription_plan string.
 * Maps Supabase subscription_plan values to analytics plan types.
 */
function getPlanCategory(subscriptionPlan: string): UserPlan {
  if (subscriptionPlan === "free") return "free";
  if (subscriptionPlan.includes("trial")) return "trial";
  return "paid";
}

export default function Login() {
  const { colors, radius, shadows, isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const router = useRouter();
  const { checkOnboarding } = useAuth();

  // Configure Google Sign-In on mount
  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter an email and password");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert("Error", error.message);
        trackUserVisibleError("login", "auth_error", true);
        // Auth errors (wrong credentials) are expected user behavior, not logged to Sentry
        setLoading(false);
        return;
      }

      // Identify user for analytics and Sentry after successful login
      if (data.user) {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("subscription_plan")
            .eq("id", data.user.id)
            .single();

          if (profile) {
            const planCategory = getPlanCategory(profile.subscription_plan);
            // Identify user with PostHog using Supabase user ID and plan
            identifyUser(data.user.id, planCategory);
            // Set Sentry user context for error tracking
            setUserContext(data.user.id, planCategory);
          }
        } catch (profileError) {
          // Continue login even if identification fails - non-blocking
        }
      }

      // The AuthContext SIGNED_IN handler will check onboarding status
      // and update onboardingComplete, which drives routing in app/index.tsx
      router.replace("/");
    } catch (error) {
      Alert.alert("Error", "Something went wrong while logging in. Please try again.");
      trackUserVisibleError("login", "unexpected_error", true);
      // Only capture truly unexpected errors
      captureError(error, {
        feature: "login",
        action: "login_attempt",
        severity: "critical",
      });
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);

    try {
      const result = await signInWithGoogle();

      // Check if required profile data exists
      const profileComplete = await checkProfileComplete(result.userId);

      if (!profileComplete) {
        // Profile is incomplete - redirect to onboarding webview
        // The session is already established by signInWithIdToken,
        // so AuthContext will have the session. Navigate to onboarding.
        router.replace("/onboarding");
      } else {
        // Profile is complete - let AuthContext handle the routing
        // The SIGNED_IN event will fire and check onboarding_completed
        router.replace("/");
      }
    } catch (error) {
      // Don't show error for user cancellation
      if (!isGoogleSignInCancelled(error)) {
        Alert.alert(
          "Sign In Error",
          "Something went wrong signing in with Google. Please try again."
        );
        trackUserVisibleError("login", "google_auth_error", true);
        captureError(error, {
          feature: "login",
          action: "google_sign_in",
          severity: "critical",
        });
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const getInputStyle = (focused: boolean) => ({
    backgroundColor: focused ? colors.surface : colors.backgroundSecondary,
    borderColor: focused ? colors.accent : colors.border,
  });

  const isAnyLoading = loading || googleLoading;

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              entering={FadeInDown.duration(600).delay(100)}
              style={[
                styles.card,
                {
                  backgroundColor: colors.surface,
                  borderRadius: radius["2xl"],
                  ...shadows.xl,
                },
              ]}
            >
              <View style={[styles.logoContainer, { backgroundColor: colors.accentMuted }]}>
                <Image
                  source={
                    isDark
                      ? require("@/assets/images/page-images/logo_square_dark.png")
                      : require("@/assets/images/page-images/logo_square_light.png")
                  }
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>

              <Text style={[styles.headerText, { color: colors.textPrimary }]}>
                Welcome Back
              </Text>
              <Text style={[styles.subHeaderText, { color: colors.textSecondary }]}>
                Sign in to continue
              </Text>

              <View style={styles.inputContainer}>
                <View
                  style={[
                    styles.inputWrapper,
                    { borderRadius: radius.lg },
                    getInputStyle(emailFocused),
                  ]}
                >
                  <Mail size={20} color={emailFocused ? colors.accent : colors.textTertiary} />
                  <TextInput
                    placeholder="Email"
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.input, { color: colors.textPrimary }]}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    editable={!isAnyLoading}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </View>
                <View
                  style={[
                    styles.inputWrapper,
                    { borderRadius: radius.lg },
                    getInputStyle(passwordFocused),
                  ]}
                >
                  <Lock size={20} color={passwordFocused ? colors.accent : colors.textTertiary} />
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.input, { color: colors.textPrimary }]}
                    secureTextEntry={true}
                    value={password}
                    onChangeText={setPassword}
                    autoCapitalize="none"
                    editable={!isAnyLoading}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                </View>
              </View>

              <Button
                onPress={handleLogin}
                loading={loading}
                disabled={isAnyLoading}
                fullWidth
                size="lg"
              >
                Sign in
              </Button>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
                <Text style={[styles.dividerText, { color: colors.textTertiary }]}>or</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.divider }]} />
              </View>

              {/* Google Sign-In Button */}
              <Pressable
                onPress={handleGoogleSignIn}
                disabled={isAnyLoading}
                style={[
                  styles.googleButton,
                  {
                    borderRadius: radius.lg,
                    borderColor: colors.border,
                    backgroundColor: colors.backgroundSecondary,
                    opacity: isAnyLoading ? 0.6 : 1,
                  },
                ]}
              >
                <View style={styles.googleIconContainer}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text
                  style={[
                    styles.googleButtonText,
                    { color: colors.textPrimary },
                  ]}
                >
                  {googleLoading ? "Signing in..." : "Sign in with Google"}
                </Text>
              </Pressable>

              <View style={[styles.disclaimer, { borderTopColor: colors.divider }]}>
                <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
                  New here?{" "}
                </Text>
                <Pressable onPress={() => router.push("/signup")} disabled={isAnyLoading}>
                  <Text style={[styles.disclaimerLink, { color: colors.accent }]}>
                    Create an account
                  </Text>
                </Pressable>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    padding: 28,
    alignItems: "center",
  },
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  logo: {
    width: 48,
    height: 48,
  },
  headerText: {
    fontSize: 26,
    fontFamily: "Poppins-Bold",
    marginBottom: 4,
  },
  subHeaderText: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    marginBottom: 28,
  },
  inputContainer: {
    width: "100%",
    gap: 14,
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1.5,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    height: "100%",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    marginVertical: 20,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
  },
  googleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 52,
    borderWidth: 1.5,
    gap: 10,
  },
  googleIconContainer: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 0.5,
    borderColor: "#ddd",
  },
  googleIconText: {
    fontSize: 14,
    fontFamily: "Poppins-Bold",
    color: "#4285F4",
    lineHeight: 18,
  },
  googleButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
  },
  disclaimer: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  disclaimerText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
  disclaimerLink: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
  },
});
