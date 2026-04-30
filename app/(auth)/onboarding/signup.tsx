import Button from "@/components/Button";
import ThemedBackground from "@/components/ThemedBackground";
import { useSignUp } from "@/contexts/SignUpContext";
import { useTheme } from "@/theme";
import { trackSignupStarted } from "@/utils/shared/analytics";
import { addActionBreadcrumb } from "@/utils/shared/sentry";
import { onboardingHref } from "@/utils/onboarding/onboarding-href";
import { signUpStep1Schema } from "@/utils/auth/auth";
import { useRouter } from "expo-router";
import { Lock, Mail } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

/**
 * Email/password step 1 — lives under the onboarding stack so back navigation does not
 * stack duplicate `(auth)/signup` routes above `/onboarding/*`.
 */
export default function OnboardingSignUp() {
  const { colors, radius, shadows } = useTheme();
  const router = useRouter();
  const { updateSignUpData } = useSignUp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    trackSignupStarted();
    addActionBreadcrumb("signup_started", "signup");
  }, []);

  const handleNext = () => {
    const result = signUpStep1Schema.safeParse({ email, password });

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
      setErrors(fieldErrors);
      return;
    }

    Keyboard.dismiss();
    setErrors({});
    updateSignUpData({ email, password });
    addActionBreadcrumb("signup_step1_to_profile", "signup");
    router.push(onboardingHref("/onboarding/collect-profile"));
  };

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const getInputStyle = (focused: boolean) => ({
    backgroundColor: focused ? colors.surface : colors.backgroundSecondary,
    borderColor: focused ? colors.accent : colors.border,
  });

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
              <Text style={[styles.headerText, { color: colors.textPrimary }]}>Create Account</Text>
              <Text style={[styles.subHeaderText, { color: colors.textSecondary }]}>
                Enter your email and password
              </Text>

              <View style={styles.inputContainer}>
                <View>
                  <View
                    style={[
                      styles.inputWrapper,
                      { borderRadius: radius.lg },
                      getInputStyle(emailFocused),
                      errors.email ? { borderColor: colors.error } : {},
                    ]}
                  >
                    <Mail
                      size={20}
                      color={
                        errors.email
                          ? colors.error
                          : emailFocused
                            ? colors.accent
                            : colors.textTertiary
                      }
                    />
                    <TextInput
                      placeholder="Email"
                      placeholderTextColor={colors.textTertiary}
                      style={[styles.input, { color: colors.textPrimary }]}
                      value={email}
                      onChangeText={(text) => {
                        setEmail(text);
                        clearError("email");
                      }}
                      autoCapitalize="none"
                      keyboardType="email-address"
                      onFocus={() => setEmailFocused(true)}
                      onBlur={() => setEmailFocused(false)}
                    />
                  </View>
                  {errors.email && (
                    <Text style={[styles.errorText, { color: colors.error }]}>{errors.email}</Text>
                  )}
                </View>

                <View>
                  <View
                    style={[
                      styles.inputWrapper,
                      { borderRadius: radius.lg },
                      getInputStyle(passwordFocused),
                      errors.password ? { borderColor: colors.error } : {},
                    ]}
                  >
                    <Lock
                      size={20}
                      color={
                        errors.password
                          ? colors.error
                          : passwordFocused
                            ? colors.accent
                            : colors.textTertiary
                      }
                    />
                    <TextInput
                      placeholder="Password"
                      placeholderTextColor={colors.textTertiary}
                      style={[styles.input, { color: colors.textPrimary }]}
                      secureTextEntry={true}
                      value={password}
                      onChangeText={(text) => {
                        setPassword(text);
                        clearError("password");
                      }}
                      autoCapitalize="none"
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                    />
                  </View>
                  {errors.password && (
                    <Text style={[styles.errorText, { color: colors.error }]}>{errors.password}</Text>
                  )}
                </View>
              </View>

              <Button onPress={handleNext} fullWidth size="lg">
                Continue
              </Button>

              <View style={[styles.footer, { borderTopColor: colors.divider }]}>
                <Text style={[styles.footerText, { color: colors.textSecondary }]}>
                  Already have an account?{" "}
                </Text>
                <Pressable onPress={() => router.back()}>
                  <Text style={[styles.footerLink, { color: colors.accent }]}>Sign in</Text>
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
  errorText: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    marginTop: 4,
    marginLeft: 4,
  },
  footer: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  footerText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
  footerLink: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
  },
});
