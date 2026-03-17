import Button from "@/components/Button";
import ThemedBackground from "@/components/ThemedBackground";
import { countries } from "@/constants/countries";
import { useSignUp } from "@/contexts/SignUpContext";
import { useTheme } from "@/theme";
import {
  trackSignupAttempted,
  trackSignupCompleted,
  trackSignupFailed,
} from "@/utils/analytics";
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
  Search,
  User,
  Users,
  X,
} from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  FlatList,
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

// ─── Date helpers ──────────────────────────────────────────

/**
 * Auto-format a raw digit string into DD/MM/YYYY as the user types.
 * Only digits are kept; slashes are inserted automatically.
 */
function formatDobInput(raw: string, previous: string): string {
  // Strip everything except digits
  const digits = raw.replace(/\D/g, "").slice(0, 8);

  // Build formatted string with slashes
  let formatted = "";
  for (let i = 0; i < digits.length; i++) {
    if (i === 2 || i === 4) formatted += "/";
    formatted += digits[i];
  }

  return formatted;
}

/**
 * Parse a DD/MM/YYYY string into a Date, or return null if invalid.
 * Validates that the date actually exists (no 31 Feb, etc.).
 */
function parseDob(value: string): Date | null {
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12) return null;
  if (day < 1) return null;

  // Construct the date and verify it round-trips (catches invalid days like 31 Feb)
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

/** Format a Date object to ISO date string "YYYY-MM-DD" */
function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ─── Generic Picker Modal ──────────────────────────────────

type PickerModalProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: readonly string[];
  onSelect: (value: string) => void;
  searchable?: boolean;
};

function PickerModal({
  visible,
  onClose,
  title,
  options,
  onSelect,
  searchable = false,
}: PickerModalProps) {
  const { colors, radius } = useTheme();
  const [search, setSearch] = useState("");

  const filtered = searchable
    ? options.filter((o) => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  const handleSelect = (value: string) => {
    onSelect(value);
    setSearch("");
    onClose();
  };

  const handleClose = () => {
    setSearch("");
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <Pressable style={styles.modalOverlay} onPress={handleClose}>
        <Pressable
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface,
              borderRadius: radius["2xl"],
            },
          ]}
          onPress={() => {}}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
              {title}
            </Text>
            <Pressable onPress={handleClose} hitSlop={8}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          {searchable && (
            <View
              style={[
                styles.searchWrapper,
                {
                  backgroundColor: colors.backgroundSecondary,
                  borderRadius: radius.lg,
                  borderColor: colors.border,
                },
              ]}
            >
              <Search size={18} color={colors.textTertiary} />
              <TextInput
                placeholder="Search..."
                placeholderTextColor={colors.textTertiary}
                style={[styles.searchInput, { color: colors.textPrimary }]}
                value={search}
                onChangeText={setSearch}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          <FlatList
            data={filtered}
            keyExtractor={(item) => item}
            style={styles.modalList}
            keyboardShouldPersistTaps="handled"
            renderItem={({ item }) => (
              <Pressable
                style={({ pressed }) => [
                  styles.modalOption,
                  {
                    backgroundColor: pressed
                      ? colors.pressedOverlay
                      : "transparent",
                    borderBottomColor: colors.divider,
                  },
                ]}
                onPress={() => handleSelect(item)}
              >
                <Text
                  style={[styles.modalOptionText, { color: colors.textPrimary }]}
                >
                  {item}
                </Text>
              </Pressable>
            )}
            ListEmptyComponent={
              <View style={styles.emptyList}>
                <Text style={[styles.emptyText, { color: colors.textTertiary }]}>
                  No results found
                </Text>
              </View>
            }
          />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

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
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 400,
    maxHeight: "70%",
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
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
  },
  searchWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    gap: 10,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    height: "100%",
  },
  modalList: {
    flexGrow: 0,
  },
  modalOption: {
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
  },
  modalOptionText: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
  },
  emptyList: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
  },
});
