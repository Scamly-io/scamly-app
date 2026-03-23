import Button from "@/components/Button";
import ProfileFormFields from "@/components/ProfileFormFields";
import ThemedBackground from "@/components/ThemedBackground";
import { useSignUp } from "@/contexts/SignUpContext";
import { useTheme } from "@/theme";
import {
  trackSignupAttempted,
  trackSignupCompleted,
  trackSignupFailed,
} from "@/utils/analytics";
import { parseDob, toISODate } from "@/utils/date";
import { getPublicIp } from "@/utils/network";
import { addActionBreadcrumb, captureError } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import { signUpSchema } from "@/utils/validation/auth";
import { useRouter } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignUpProfile() {
  const { colors, radius, shadows } = useTheme();
  const router = useRouter();
  const { signUpData, resetSignUpData } = useSignUp();

  const [firstName, setFirstName] = useState("");
  const [dobText, setDobText] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");
  const [referralSource, setReferralSource] = useState("");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const setError = (field: string, message: string) => {
    setErrors((prev) => ({ ...prev, [field]: message }));
  };

  const handleCreateAccount = async () => {
    let dobIso: string | undefined;
    const fieldErrors: Record<string, string> = {};

    if (dobText && dobText.length < 10) {
      fieldErrors.dob = "Please enter a complete date (DD/MM/YYYY)";
    } else if (dobText) {
      const parsed = parseDob(dobText);
      if (!parsed) {
        fieldErrors.dob = "Please enter a valid date";
      } else if (parsed > new Date()) {
        fieldErrors.dob = "Date of birth cannot be in the future";
      } else {
        dobIso = toISODate(parsed);
      }
    }

    const formData = {
      email: signUpData.email,
      password: signUpData.password,
      firstName,
      ...(dobIso ? { dob: dobIso } : {}),
      country,
      ...(gender ? { gender } : {}),
      referralSource,
    };

    const result = signUpSchema.safeParse(formData);

    if (!result.success) {
      for (const issue of result.error.issues) {
        const field = issue.path[0] as string;
        if (!fieldErrors[field]) {
          fieldErrors[field] = issue.message;
        }
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setLoading(true);
    trackSignupAttempted(referralSource, country);
    addActionBreadcrumb("signup_attempted", "signup");

    try {
      const ip = await getPublicIp();
      console.log("ip", ip);

      const profileData: {
        first_name: string;
        country: string;
        referral_source: string;
        onboarding_completed: boolean;
        dob?: string;
        gender?: string;
        ip_address?: string;
      } = {
        first_name: firstName,
        country,
        referral_source: referralSource,
        onboarding_completed: true,
      };

      if (dobIso) {
        profileData.dob = dobIso;
      }
      if (gender) {
        profileData.gender = gender;
      }
      if (ip) {
        profileData.ip_address = ip;
      }

      const { error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          emailRedirectTo: "https://scamly.io/portal",
          data: profileData,
        },
      });

      if (error) {
        Alert.alert("Error", error.message);
        trackSignupFailed(error.message);
        setLoading(false);
        return;
      }

      trackSignupCompleted(referralSource, country);
      addActionBreadcrumb("signup_completed", "signup");
      resetSignUpData();
      router.replace("/signup-confirm");
    } catch (error) {
      Alert.alert(
        "Error",
        "Something went wrong while creating your account. Please try again."
      );
      trackSignupFailed("unexpected_error");
      captureError(error, {
        feature: "signup",
        action: "signup_attempt",
        severity: "critical",
      });
      setLoading(false);
    }
  };

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
              <Pressable
                onPress={() => router.back()}
                style={styles.backButton}
                hitSlop={8}
              >
                <ArrowLeft size={22} color={colors.textSecondary} />
              </Pressable>

              <Text style={[styles.headerText, { color: colors.textPrimary }]}>
                You&apos;re almost there
              </Text>
              <Text style={[styles.subHeaderText, { color: colors.textSecondary }]}>
                Tell us a bit about yourself
              </Text>

              <ProfileFormFields
                showFirstName
                firstName={firstName}
                onFirstNameChange={setFirstName}
                dobText={dobText}
                onDobTextChange={setDobText}
                country={country}
                onCountryChange={setCountry}
                gender={gender}
                onGenderChange={setGender}
                referralSource={referralSource}
                onReferralSourceChange={setReferralSource}
                errors={errors}
                clearError={clearError}
                setError={setError}
                loading={loading}
              />

              <Button
                onPress={handleCreateAccount}
                loading={loading}
                disabled={loading}
                fullWidth
                size="lg"
              >
                Create Account
              </Button>
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
    paddingVertical: 20,
  },
  card: {
    width: "100%",
    maxWidth: 400,
    padding: 28,
    alignItems: "center",
  },
  backButton: {
    alignSelf: "flex-start",
    marginBottom: 16,
  },
  headerText: {
    fontSize: 26,
    fontFamily: "Poppins-Bold",
    marginBottom: 4,
  },
  subHeaderText: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    marginBottom: 10,
  },
});
