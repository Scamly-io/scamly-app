import Button from "@/components/Button";
import ThemedBackground from "@/components/ThemedBackground";
import { useTheme } from "@/theme";
import { identifyUser, trackUserVisibleError, type UserPlan } from "@/utils/analytics";
import { checkProfileComplete } from "@/utils/onboarding";
import { captureError, setUserContext } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import {
  GoogleSignin,
  isSuccessResponse,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import * as AppleAuthentication from "expo-apple-authentication";
import { useRouter } from "expo-router";
import { Lock, Mail } from "lucide-react-native";
import { useState } from "react";
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
import Svg, { Path } from "react-native-svg";

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
  const [appleLoading, setAppleLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const router = useRouter();

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

    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    });

    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();


      if (isSuccessResponse(response)) {

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: response.data.idToken,
        });

        if (error) {
          throw error;
        }

        const profileComplete = await checkProfileComplete(data.user.id);

        if (!profileComplete) {
          router.replace("/onboarding");
        } else {
          router.replace("/");
        }
      }
    } catch (error) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        Alert.alert(
          "Sign In Error",
          "Something went wrong signing in with Google. Please try again."
        );
        // Add error tracking
      } else {
        console.log(error.code);
        Alert.alert(
          "Sign In Error",
          "Something went wrong signing in with Google. Please try again."
        );
        captureError(error, {
          feature: "login",
          action: "google_sign_in",
          severity: "critical",
        });
        setGoogleLoading(false);
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const redirectAfterSocialAuth = async (userId: string) => {
    const profileComplete = await checkProfileComplete(userId);
    if (!profileComplete) {
      router.replace("/onboarding");
      return;
    }
    router.replace("/");
  };

  const handleAppleSignIn = async () => {
    setAppleLoading(true);
    try {
      if (Platform.OS === "ios") {
        const isAppleAuthAvailable = await AppleAuthentication.isAvailableAsync();
        if (!isAppleAuthAvailable) {
          Alert.alert("Apple Sign In Unavailable", "Apple Sign In is not available on this device.");
          return;
        }

        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });

        if (!credential.identityToken) {
          throw new Error("No identity token returned by Apple.");
        }

        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "apple",
          token: credential.identityToken,
        });

        if (error || !data.user) {
          throw error ?? new Error("Failed to authenticate with Apple.");
        }

        await redirectAfterSocialAuth(data.user.id);
        return;
      }

      if (Platform.OS === "android") {
        // Currently this is not supported on android
        // The code below does not work. It fails when redirecting back to the app.
        // A future update will fix this. MVP will not release with it.

        /*
        const redirectTo = "scamlyapp://auth/callback";
        console.log("redirectTo:", redirectTo);

        // Get the OAuth URL from Supabase (don't let it auto-redirect)
        const { data: oauthData, error: oauthError } =
          await supabase.auth.signInWithOAuth({
            provider: "apple",
            options: {
              redirectTo,
              skipBrowserRedirect: true,
            },
          });

        if (oauthError) {
          throw oauthError;
        }

        if (!oauthData?.url) {
          throw new Error("No OAuth URL returned from Supabase.");
        }

        // Open the URL in an in-app browser; it will close automatically
        // when Supabase redirects back to the scamlyapp:// scheme.
        console.log("oauthData.url:", oauthData.url);
        const browserResult = await WebBrowser.openAuthSessionAsync(
          oauthData.url,
          redirectTo
        );

        console.log("browserResult:", browserResult);

        // 3. User cancelled / dismissed the browser
        if (browserResult.type === "cancel" || browserResult.type === "dismiss") {
          return;
        }

        // 4. Extract tokens from the URL hash fragment
        //    Supabase redirects to: scamlyapp://auth/callback#access_token=...&refresh_token=...
        if (browserResult.type === "success" && browserResult.url) {
          const hashFragment = browserResult.url.split("#")[1];
          cosnole.log("hashFragment:", hashFragment);
          if (hashFragment) {
            const params = new URLSearchParams(hashFragment);
            const accessToken = params.get("access_token");
            const refreshToken = params.get("refresh_token");
            console.log("accessToken:", accessToken);
            console.log("refreshToken:", refreshToken);
            if (accessToken && refreshToken) {
              const { error: sessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });

              if (sessionError) {
                console.log("sessionError:", sessionError);
                throw sessionError;
              }

              // 5 & 6. Check profile and redirect
              const { data: userData } = await supabase.auth.getUser();
              if (userData.user) {
                console.log("userData:", userData);
                await redirectAfterSocialAuth(userData.user.id);
                return;
              }
            }
          }
        }

        // If we reach here, something went wrong extracting the session
        throw new Error("Failed to complete Apple sign in. No session was returned.");

        */
      }

      Alert.alert("Unavailable", "Apple Sign In is only available on iOS.");
    } catch (error: any) {
      if (error?.code === "ERR_REQUEST_CANCELED") {
        return;
      }

      console.log("error:", error.code);

      Alert.alert(
        "Sign In Error",
        "Something went wrong signing in with Apple. Please try again."
      );

      captureError(error, {
        feature: "login",
        action: "apple_sign_in",
        severity: "critical",
      });
    } finally {
      setAppleLoading(false);
    }
  };

  const getInputStyle = (focused: boolean) => ({
    backgroundColor: focused ? colors.surface : colors.backgroundSecondary,
    borderColor: focused ? colors.accent : colors.border,
  });

  const isAnyLoading = loading || googleLoading || appleLoading;
  const showAppleButton = Platform.OS === "ios";

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
                  <Svg width={20} height={20} viewBox="0 0 24 24">
                    <Path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                      fill="#4285F4"
                    />
                    <Path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <Path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <Path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </Svg>
                </View>
                <Text
                  style={[
                    styles.googleButtonText,
                    { color: colors.textPrimary },
                  ]}
                >
                  {googleLoading ? "Signing in..." : "Continue with Google"}
                </Text>
              </Pressable>

              {showAppleButton ? (
                <Pressable
                  onPress={handleAppleSignIn}
                  disabled={isAnyLoading}
                  style={[
                    styles.appleButton,
                    {
                      borderRadius: radius.lg,
                      borderColor: colors.border,
                      backgroundColor: colors.backgroundSecondary,
                      opacity: isAnyLoading ? 0.6 : 1,
                    },
                  ]}
                >
                  <View style={styles.appleIconContainer}>
                    <Svg width={20} height={20} viewBox="0 0 24 24">
                      <Path
                        d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
                        fill={isDark ? "#fff" : "#000"}
                      />
                    </Svg>
                  </View>
                  <Text
                    style={[
                      styles.appleButtonText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    {appleLoading ? "Signing in..." : "Continue with Apple"}
                  </Text>
                </Pressable>
              ) : null}

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
    alignItems: "center",
    justifyContent: "center",
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
  appleButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 52,
    borderWidth: 1.5,
    gap: 10,
    marginTop: 12,
  },
  appleIconContainer: {

    alignItems: "center",
    justifyContent: "center",
  },
  appleIconText: {
    fontSize: 13,
    fontFamily: "Poppins-Bold",
    color: "#fff",
    lineHeight: 18,
  },
  appleButtonText: {
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
