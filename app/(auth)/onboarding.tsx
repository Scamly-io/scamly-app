import Button from "@/components/Button";
import ProfileFormFields from "@/components/ProfileFormFields";
import ThemedBackground from "@/components/ThemedBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { parseDob, toISODate } from "@/utils/date";
import { presentScamlyPaywall } from "@/utils/revenuecat";
import { captureError } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import { onboardingProfileSchema } from "@/utils/validation/auth";
import type { User } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

function signedInWithOAuth(user: User): boolean {
  return (
    user.identities?.some(
      ({ provider }) => provider === "google" || provider === "apple"
    ) ?? false
  );
}

export default function Onboarding() {
  const { colors, radius, shadows } = useTheme();
  const router = useRouter();
  const { user, checkOnboarding } = useAuth();

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

  const handleComplete = async () => {
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
      country,
      referralSource,
      ...(dobIso ? { dob: dobIso } : {}),
      ...(gender ? { gender } : {}),
    };

    const result = onboardingProfileSchema.safeParse(formData);

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

    try {
      const profileData: {
        country: string;
        referral_source: string;
        onboarding_completed: boolean;
        dob?: string;
        gender?: string;
      } = {
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

      const { error } = await supabase
        .from("profiles")
        .update(profileData)
        .eq("id", user!.id);

      if (error) {
        Alert.alert("Error", error.message);
        setLoading(false);
        return;
      }

      await checkOnboarding();

      if (user && signedInWithOAuth(user)) {
        const { error: welcomeEmailError } = await supabase.functions.invoke(
          "send-customer-email",
          { body: { userId: user.id, type: "welcome" } }
        );
        if (welcomeEmailError) {
          captureError(welcomeEmailError, {
            feature: "onboarding",
            action: "send_customer_email",
            severity: "warning",
          });
        }
      }

      try {
        await presentScamlyPaywall();
      } catch {
        // Non-blocking — proceed to home even if paywall fails to present
      }

      router.replace("/home");
    } catch (error) {
      Alert.alert(
        "Error",
        "Something went wrong. Please try again."
      );
      captureError(error, {
        feature: "onboarding",
        action: "complete_profile",
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
              <Text style={[styles.headerText, { color: colors.textPrimary }]}>
                You&apos;re almost there
              </Text>
              <Text style={[styles.subHeaderText, { color: colors.textSecondary }]}>
                Tell us a bit about yourself
              </Text>

              <ProfileFormFields
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
                onPress={handleComplete}
                loading={loading}
                disabled={loading}
                fullWidth
                size="lg"
              >
                Complete Setup
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
