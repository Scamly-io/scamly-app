import Button from "@/components/Button";
import PickerModal from "@/components/PickerModal";
import ThemedBackground from "@/components/ThemedBackground";
import { countries } from "@/constants/countries";
import { useSignUp } from "@/contexts/SignUpContext";
import { useTheme } from "@/theme";
import {
  trackSignupAttempted,
  trackSignupCompleted,
  trackSignupFailed,
} from "@/utils/analytics";
import { formatDobInput, parseDob, toISODate } from "@/utils/date";
import { addActionBreadcrumb, captureError } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import {
  genderOptions,
  referralSourceOptions,
  signUpSchema,
} from "@/utils/validation/auth";
import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Globe,
  Megaphone,
  User,
  Users,
} from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
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

// ─── Main screen ───────────────────────────────────────────

export default function SignUpProfile() {
  const { colors, radius, shadows } = useTheme();
  const router = useRouter();
  const { signUpData, resetSignUpData } = useSignUp();

  const [firstName, setFirstName] = useState("");
  const [dobText, setDobText] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");
  const [referralSource, setReferralSource] = useState("");

  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [dobFocused, setDobFocused] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Picker visibility
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showReferralPicker, setShowReferralPicker] = useState(false);
  const [showCountryInfoModal, setShowCountryInfoModal] = useState(false);

  const clearError = (field: string) => {
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleDobChange = (text: string) => {
    const formatted = formatDobInput(text, dobText);
    setDobText(formatted);
    clearError("dob");
  };

  /** Validate the DOB field on blur and show contextual errors */
  const validateDobOnBlur = () => {
    setDobFocused(false);
    if (!dobText) return; // Will be caught by required validation on submit

    // If partially typed
    if (dobText.length < 10) {
      setErrors((prev) => ({
        ...prev,
        dob: "Please enter a complete date (DD/MM/YYYY)",
      }));
      return;
    }

    const parsed = parseDob(dobText);
    if (!parsed) {
      setErrors((prev) => ({
        ...prev,
        dob: "Please enter a valid date",
      }));
      return;
    }

    if (parsed > new Date()) {
      setErrors((prev) => ({
        ...prev,
        dob: "Date of birth cannot be in the future",
      }));
      return;
    }

    clearError("dob");
  };

  const handleCreateAccount = async () => {
    // Validate DOB before building form data
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
      const profileData: {
        first_name: string;
        country: string;
        referral_source: string;
        onboarding_completed: boolean;
        dob?: string;
        gender?: string;
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

      const { error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          emailRedirectTo: "https://test.scamly.io/portal", // Test environment
          data: profileData,
        },
      });

      if (error) {
        Alert.alert("Error", error.message);
        trackSignupFailed(error.message);
        // Auth errors (email already registered, etc.) are expected user behavior, not logged to Sentry
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
      // Only capture truly unexpected errors to Sentry
      captureError(error, {
        feature: "signup",
        action: "signup_attempt",
        severity: "critical",
      });
      setLoading(false);
    }
  };

  const getInputStyle = (focused: boolean) => ({
    backgroundColor: focused ? colors.surface : colors.backgroundSecondary,
    borderColor: focused ? colors.accent : colors.border,
  });

  const getPickerStyle = () => ({
    backgroundColor: colors.backgroundSecondary,
    borderColor: colors.border,
  });

  const renderFieldLabel = (label: string, required = true) => (
    <View style={styles.fieldLabelRow}>
      <Text style={[styles.fieldLabelText, { color: colors.textSecondary }]}>
        {label}
      </Text>
      {required ? (
        <Text style={[styles.requiredAsterisk, { color: colors.error }]}>*</Text>
      ) : (
        <Text style={[styles.optionalTag, { color: colors.textTertiary }]}>
          (optional)
        </Text>
      )}
    </View>
  );

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
                About You
              </Text>
              <Text style={[styles.subHeaderText, { color: colors.textSecondary }]}>
                Tell us a bit about yourself
              </Text>
              <Text style={[styles.requiredHint, { color: colors.textSecondary }]}>
                <Text style={{ color: colors.error }}>*</Text> Required fields
              </Text>

              <View style={styles.inputContainer}>
                {/* First Name */}
                <View>
                  {renderFieldLabel("First name")}
                  <View
                    style={[
                      styles.inputWrapper,
                      { borderRadius: radius.lg },
                      getInputStyle(firstNameFocused),
                      errors.firstName ? { borderColor: colors.error } : {},
                    ]}
                  >
                    <User
                      size={20}
                      color={
                        errors.firstName
                          ? colors.error
                          : firstNameFocused
                            ? colors.accent
                            : colors.textTertiary
                      }
                    />
                    <TextInput
                      placeholder="First name"
                      placeholderTextColor={colors.textTertiary}
                      style={[styles.input, { color: colors.textPrimary }]}
                      value={firstName}
                      onChangeText={(text) => {
                        setFirstName(text);
                        clearError("firstName");
                      }}
                      autoCapitalize="words"
                      editable={!loading}
                      onFocus={() => setFirstNameFocused(true)}
                      onBlur={() => setFirstNameFocused(false)}
                    />
                  </View>
                  {errors.firstName && (
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      {errors.firstName}
                    </Text>
                  )}
                </View>

                {/* Date of Birth */}
                <View>
                  {renderFieldLabel("Date of birth", false)}
                  <View
                    style={[
                      styles.inputWrapper,
                      { borderRadius: radius.lg },
                      getInputStyle(dobFocused),
                      errors.dob ? { borderColor: colors.error } : {},
                    ]}
                  >
                    <Calendar
                      size={20}
                      color={
                        errors.dob
                          ? colors.error
                          : dobFocused
                            ? colors.accent
                            : colors.textTertiary
                      }
                    />
                    <TextInput
                      placeholder="DD/MM/YYYY"
                      placeholderTextColor={colors.textTertiary}
                      style={[styles.input, { color: colors.textPrimary }]}
                      value={dobText}
                      onChangeText={handleDobChange}
                      keyboardType="number-pad"
                      maxLength={10}
                      editable={!loading}
                      onFocus={() => setDobFocused(true)}
                      onBlur={validateDobOnBlur}
                    />
                  </View>
                  {errors.dob && (
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      {errors.dob}
                    </Text>
                  )}
                </View>

                {/* Country */}
                <View>
                  <View style={styles.fieldLabelWithAction}>
                    {renderFieldLabel("Country")}
                    <Pressable onPress={() => setShowCountryInfoModal(true)} hitSlop={8}>
                      <Text style={[styles.countryInfoLink, { color: colors.accent }]}>
                        Why is this collected?
                      </Text>
                    </Pressable>
                  </View>
                  <Pressable
                    onPress={() => setShowCountryPicker(true)}
                    disabled={loading}
                    style={[
                      styles.inputWrapper,
                      { borderRadius: radius.lg },
                      getPickerStyle(),
                      errors.country ? { borderColor: colors.error } : {},
                    ]}
                  >
                    <Globe
                      size={20}
                      color={errors.country ? colors.error : colors.textTertiary}
                    />
                    <Text
                      style={[
                        styles.pickerText,
                        {
                          color: country ? colors.textPrimary : colors.textTertiary,
                        },
                      ]}
                    >
                      {country || "Country"}
                    </Text>
                    <ChevronDown size={18} color={colors.textTertiary} />
                  </Pressable>
                  {errors.country && (
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      {errors.country}
                    </Text>
                  )}
                </View>

                {/* Gender */}
                <View>
                  {renderFieldLabel("Gender", false)}
                  <Pressable
                    onPress={() => setShowGenderPicker(true)}
                    disabled={loading}
                    style={[
                      styles.inputWrapper,
                      { borderRadius: radius.lg },
                      getPickerStyle(),
                      errors.gender ? { borderColor: colors.error } : {},
                    ]}
                  >
                    <Users
                      size={20}
                      color={errors.gender ? colors.error : colors.textTertiary}
                    />
                    <Text
                      style={[
                        styles.pickerText,
                        {
                          color: gender ? colors.textPrimary : colors.textTertiary,
                        },
                      ]}
                    >
                      {gender || "Gender"}
                    </Text>
                    <ChevronDown size={18} color={colors.textTertiary} />
                  </Pressable>
                  {errors.gender && (
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      {errors.gender}
                    </Text>
                  )}
                </View>

                {/* Referral Source */}
                <View>
                  {renderFieldLabel("How did you hear about us?")}
                  <Pressable
                    onPress={() => setShowReferralPicker(true)}
                    disabled={loading}
                    style={[
                      styles.inputWrapper,
                      { borderRadius: radius.lg },
                      getPickerStyle(),
                      errors.referralSource ? { borderColor: colors.error } : {},
                    ]}
                  >
                    <Megaphone
                      size={20}
                      color={
                        errors.referralSource ? colors.error : colors.textTertiary
                      }
                    />
                    <Text
                      style={[
                        styles.pickerText,
                        {
                          color: referralSource
                            ? colors.textPrimary
                            : colors.textTertiary,
                        },
                      ]}
                    >
                      {referralSource || "How did you hear about us?"}
                    </Text>
                    <ChevronDown size={18} color={colors.textTertiary} />
                  </Pressable>
                  {errors.referralSource && (
                    <Text style={[styles.errorText, { color: colors.error }]}>
                      {errors.referralSource}
                    </Text>
                  )}
                </View>
              </View>

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

      {/* Picker Modals */}
      <PickerModal
        visible={showCountryPicker}
        onClose={() => setShowCountryPicker(false)}
        title="Select Country"
        options={countries}
        searchable
        onSelect={(value) => {
          setCountry(value);
          clearError("country");
        }}
      />
      <PickerModal
        visible={showGenderPicker}
        onClose={() => setShowGenderPicker(false)}
        title="Select Gender"
        options={genderOptions}
        onSelect={(value) => {
          setGender(value);
          clearError("gender");
        }}
      />
      <PickerModal
        visible={showReferralPicker}
        onClose={() => setShowReferralPicker(false)}
        title="How did you hear about us?"
        options={referralSourceOptions}
        onSelect={(value) => {
          setReferralSource(value);
          clearError("referralSource");
        }}
      />

      <Modal
        visible={showCountryInfoModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowCountryInfoModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowCountryInfoModal(false)}
        >
          <Pressable
            style={[
              styles.infoModalContent,
              { backgroundColor: colors.surface, borderRadius: radius["2xl"] },
            ]}
            onPress={() => {}}
          >
            <Text style={[styles.infoModalTitle, { color: colors.textPrimary }]}>
              Why is this collected?
            </Text>
            <Text style={[styles.infoModalBody, { color: colors.textSecondary }]}>
              Country data is collected to provide Scamly's AI with contextual
              information that may be relevant to detecting scams. For example, if
              you receive a text message claiming to be from a US bank, and you live
              in Australia, this adds suspicion. {"\n\n"}All data collected is done
              so in line with our privacy policy, available on our website.
            </Text>
            <Button onPress={() => setShowCountryInfoModal(false)} fullWidth size="lg">
              Got it
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedBackground>
  );
}

// ─── Styles ────────────────────────────────────────────────

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
  requiredHint: {
    width: "100%",
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    marginBottom: 14,
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
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    marginLeft: 4,
    gap: 4,
  },
  fieldLabelWithAction: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldLabelText: {
    fontSize: 13,
    fontFamily: "Poppins-Medium",
  },
  requiredAsterisk: {
    fontSize: 13,
    fontFamily: "Poppins-SemiBold",
    lineHeight: 16,
  },
  optionalTag: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    lineHeight: 16,
  },
  countryInfoLink: {
    fontSize: 12,
    fontFamily: "Poppins-Medium",
    textDecorationLine: "underline",
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    height: "100%",
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    marginTop: 4,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  infoModalContent: {
    width: "100%",
    maxWidth: 400,
    padding: 22,
  },
  infoModalTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
    marginBottom: 12,
  },
  infoModalBody: {
    fontSize: 14,
    lineHeight: 22,
    fontFamily: "Poppins-Regular",
    marginBottom: 18,
  },
});
