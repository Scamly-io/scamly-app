import Button from "@/components/Button";
import Card from "@/components/Card";
import PickerModal from "@/components/PickerModal";
import ThemedBackground from "@/components/ThemedBackground";
import { countries } from "@/constants/countries";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { formatDobInput, isoToDobDisplay, parseDob, toISODate } from "@/utils/date";
import { captureError } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import { genderOptions } from "@/utils/validation/auth";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  Copy,
  Crown,
  FileText,
  Globe,
  Mail,
  Shield,
  User,
  Users,
  X,
} from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { SafeAreaView } from "react-native-safe-area-context";

function getProviderLabel(provider: string): string {
  const first = provider.split(",")[0].trim().toLowerCase();
  switch (first) {
    case "apple":
      return "Apple";
    case "google":
      return "Google";
    case "email":
    default:
      return "Email";
  }
}

function getSubscriptionLabel(plan: string): string {
  switch (plan) {
    case "free":
      return "Free";
    case "premium-monthly":
      return "Premium Monthly";
    case "premium-yearly":
      return "Premium Yearly";
    default:
      if (plan.includes("trial")) return "Trial";
      if (plan.includes("premium")) return "Premium";
      return plan.charAt(0).toUpperCase() + plan.slice(1);
  }
}

export default function Profile() {
  const { colors, radius, shadows } = useTheme();
  const { user, refreshAuth } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [dobText, setDobText] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");
  const [subscriptionPlan, setSubscriptionPlan] = useState("free");

  const [originalData, setOriginalData] = useState({
    firstName: "",
    dobText: "",
    country: "",
    gender: "",
  });

  const [firstNameFocused, setFirstNameFocused] = useState(false);
  const [dobFocused, setDobFocused] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [showGenderPicker, setShowGenderPicker] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showDeleteFailedModal, setShowDeleteFailedModal] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  const DELETE_CONFIRMATION_PHRASE = "confirm deletion";

  const provider = getProviderLabel(
    user?.app_metadata?.provider ?? "email"
  );
  const isEmailProvider = provider === "Email";
  const email = user?.email ?? "";

  const hasChanges =
    firstName !== originalData.firstName ||
    dobText !== originalData.dobText ||
    country !== originalData.country ||
    gender !== originalData.gender;
  const canConfirmDeletion =
    deleteConfirmationText.trim() === DELETE_CONFIRMATION_PHRASE;

  useEffect(() => {
    async function fetchProfile() {
      if (!user) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("first_name, dob, country, gender, subscription_plan")
        .eq("id", user.id)
        .single();

      if (error || !data) {
        captureError(error || new Error("No profile data"), {
          feature: "profile",
          action: "fetch_profile",
          severity: "critical",
        });
        setLoading(false);
        return;
      }

      const name = data.first_name ?? "";
      const dob = data.dob ? isoToDobDisplay(data.dob) : "";
      const c = data.country ?? "";
      const g = data.gender ?? "";

      setFirstName(name);
      setDobText(dob);
      setCountry(c);
      setGender(g);
      setSubscriptionPlan(data.subscription_plan ?? "free");
      setOriginalData({ firstName: name, dobText: dob, country: c, gender: g });
      setLoading(false);
    }

    fetchProfile();
  }, [user]);

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

  const validateDobOnBlur = () => {
    setDobFocused(false);
    if (!dobText) return;

    if (dobText.length < 10) {
      setErrors((prev) => ({
        ...prev,
        dob: "Please enter a complete date (DD/MM/YYYY)",
      }));
      return;
    }

    const parsed = parseDob(dobText);
    if (!parsed) {
      setErrors((prev) => ({ ...prev, dob: "Please enter a valid date" }));
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

  const handleSave = async () => {
    if (!user) return;

    const fieldErrors: Record<string, string> = {};
    let dobIso: string | null = null;

    if (!firstName.trim()) {
      fieldErrors.firstName = "First name is required";
    }

    if (!country) {
      fieldErrors.country = "Country is required";
    }

    if (dobText) {
      if (dobText.length < 10) {
        fieldErrors.dob = "Please enter a complete date (DD/MM/YYYY)";
      } else {
        const parsed = parseDob(dobText);
        if (!parsed) {
          fieldErrors.dob = "Please enter a valid date";
        } else if (parsed > new Date()) {
          fieldErrors.dob = "Date of birth cannot be in the future";
        } else {
          dobIso = toISODate(parsed);
        }
      }
    }

    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    setErrors({});
    setSaving(true);

    try {
      const updateData: Record<string, string | null> = {
        first_name: firstName.trim(),
        country,
        gender: gender || null,
        dob: dobIso,
      };

      const { error } = await supabase
        .from("profiles")
        .update(updateData)
        .eq("id", user.id);

      if (error) {
        Alert.alert("Error", "Failed to save your profile. Please try again.");
        captureError(error, {
          feature: "profile",
          action: "update_profile",
          severity: "critical",
        });
        setSaving(false);
        return;
      }

      setOriginalData({
        firstName: firstName.trim(),
        dobText,
        country,
        gender,
      });
      await refreshAuth();
      Alert.alert("Success", "Your profile has been updated.");
    } catch (err) {
      Alert.alert("Error", "Something went wrong. Please try again.");
      captureError(err, {
        feature: "profile",
        action: "update_profile",
        severity: "critical",
      });
    } finally {
      setSaving(false);
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

  const handleCopyDeletePhrase = async () => {
    await Clipboard.setStringAsync(DELETE_CONFIRMATION_PHRASE);
  };

  const closeDeleteModal = () => {
    if (deletingAccount) return;
    setShowDeleteModal(false);
    setDeleteConfirmationText("");
  };

  const handleDeleteAccount = async () => {
    if (!user || deletingAccount || !canConfirmDeletion) return;

    setDeletingAccount(true);

    try {
      const { error } = await supabase.functions.invoke("delete-account");
      if (error) {
        throw error;
      }

      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        captureError(signOutError, {
          feature: "home",
          action: "delete_account_sign_out",
          severity: "warning",
        });
      }

      setShowDeleteModal(false);
      setDeleteConfirmationText("");
      router.replace("/account-deleted");
    } catch (err) {
      captureError(err, {
        feature: "home",
        action: "delete_account",
        severity: "critical",
      });
      setShowDeleteModal(false);
      setShowDeleteFailedModal(true);
    } finally {
      setDeletingAccount(false);
    }
  };

  if (loading) {
    return (
      <ThemedBackground>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        </SafeAreaView>
      </ThemedBackground>
    );
  }

  return (
    <ThemedBackground>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.flex}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.divider }]}>
            <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
              <ArrowLeft size={22} color={colors.textPrimary} />
            </Pressable>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Profile
            </Text>
            <View style={styles.headerSpacer} />
          </View>

          <ScrollView
            style={styles.flex}
            contentContainerStyle={styles.scrollContent}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Account Info */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Account
              </Text>

              <Card style={styles.card} pressable={false}>
                {isEmailProvider ? (
                  <View style={styles.fieldRow}>
                    <View style={[styles.fieldIcon, { backgroundColor: colors.accentMuted }]}>
                      <Mail size={18} color={colors.accent} />
                    </View>
                    <View style={styles.fieldContent}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                        Email address
                      </Text>
                      <Text style={[styles.fieldValueDisabled, { color: colors.textTertiary }]}>
                        {email}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.fieldRow}>
                    <View style={[styles.fieldIcon, { backgroundColor: colors.accentMuted }]}>
                      <Shield size={18} color={colors.accent} />
                    </View>
                    <View style={styles.fieldContent}>
                      <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                        Sign-in method
                      </Text>
                      <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>
                        {provider}
                      </Text>
                    </View>
                  </View>
                )}
              </Card>
              {isEmailProvider ? (
                <Text style={[styles.helperText, { color: colors.textTertiary }]}>
                  You cannot change your email address in the app
                </Text>
              ) : null}
            </View>

            {/* Personal Info */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Personal Information
              </Text>

              <View style={styles.fieldsContainer}>
                {/* First Name */}
                <View>
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    First name
                  </Text>
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
                      editable={!saving}
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
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    Date of birth
                  </Text>
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
                      editable={!saving}
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
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    Country
                  </Text>
                  <Pressable
                    onPress={() => setShowCountryPicker(true)}
                    disabled={saving}
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
                        { color: country ? colors.textPrimary : colors.textTertiary },
                      ]}
                    >
                      {country || "Select country"}
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
                  <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
                    Gender
                  </Text>
                  <Pressable
                    onPress={() => setShowGenderPicker(true)}
                    disabled={saving}
                    style={[
                      styles.inputWrapper,
                      { borderRadius: radius.lg },
                      getPickerStyle(),
                    ]}
                  >
                    <Users
                      size={20}
                      color={colors.textTertiary}
                    />
                    <Text
                      style={[
                        styles.pickerText,
                        { color: gender ? colors.textPrimary : colors.textTertiary },
                      ]}
                    >
                      {gender || "Select gender"}
                    </Text>
                    <ChevronDown size={18} color={colors.textTertiary} />
                  </Pressable>
                </View>
              </View>
            </View>

            {/* Subscription */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Subscription
              </Text>

              <Card style={styles.card} pressable={false}>
                <View style={styles.fieldRow}>
                  <View style={[styles.fieldIcon, { backgroundColor: colors.accentMuted }]}>
                    <Crown size={18} color={colors.accent} />
                  </View>
                  <View style={styles.fieldContent}>
                    <Text style={[styles.fieldLabel, { color: colors.textSecondary }]}>
                      Current plan
                    </Text>
                    <Text style={[styles.fieldValue, { color: colors.textPrimary }]}>
                      {getSubscriptionLabel(subscriptionPlan)}
                    </Text>
                  </View>
                </View>
              </Card>
              <Text style={[styles.helperText, { color: colors.textTertiary }]}>
                You cannot manage your subscription in the app
              </Text>
            </View>

            {/* Legal */}
            <View style={styles.section}>
              <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                Legal
              </Text>

              <Card style={styles.card} pressable={false}>
                <Pressable
                  style={styles.linkRow}
                  onPress={() => router.push("/home/privacy-policy")}
                >
                  <View style={[styles.fieldIcon, { backgroundColor: colors.accentMuted }]}>
                    <Shield size={18} color={colors.accent} />
                  </View>
                  <Text style={[styles.linkText, { color: colors.textPrimary }]}>
                    Privacy Policy
                  </Text>
                  <ChevronRight size={18} color={colors.textTertiary} />
                </Pressable>

                <View style={[styles.divider, { backgroundColor: colors.divider }]} />

                <Pressable
                  style={styles.linkRow}
                  onPress={() => router.push("/home/terms")}
                >
                  <View style={[styles.fieldIcon, { backgroundColor: colors.accentMuted }]}>
                    <FileText size={18} color={colors.accent} />
                  </View>
                  <Text style={[styles.linkText, { color: colors.textPrimary }]}>
                    Terms of Service
                  </Text>
                  <ChevronRight size={18} color={colors.textTertiary} />
                </Pressable>
              </Card>
            </View>

            {/* Save Button */}
            <View style={styles.saveSection}>
              <Button
                onPress={handleSave}
                loading={saving}
                disabled={saving || !hasChanges}
                fullWidth
                size="lg"
              >
                Save Changes
              </Button>
            </View>

            {/* Danger Zone */}
            <View style={styles.dangerZoneSection}>
              <View style={styles.dangerZoneHeader}>
                <AlertTriangle size={18} color={colors.warning} />
                <Text style={[styles.dangerZoneTitle, { color: colors.warning }]}>
                  Danger Zone
                </Text>
              </View>

              <Card
                style={[
                  styles.dangerZoneCard,
                  { borderColor: colors.error, backgroundColor: colors.errorMuted },
                ]}
                variant="outlined"
                pressable={false}
              >
                <Text style={[styles.dangerZoneText, { color: colors.textPrimary }]}>
                  Permanently delete your account and all associated data.
                </Text>
                <Button
                  onPress={() => setShowDeleteModal(true)}
                  variant="danger"
                  fullWidth
                  disabled={saving || deletingAccount}
                >
                  Delete Account
                </Button>
              </Card>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

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
        }}
      />

      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={closeDeleteModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeDeleteModal}>
          <Pressable
            style={[
              styles.deleteModalContent,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius["2xl"],
                ...shadows.lg,
              },
            ]}
            onPress={() => {}}
          >
            <View style={styles.deleteModalHeader}>
              <View style={styles.deleteModalTitleRow}>
                <AlertTriangle size={18} color={colors.error} />
                <Text style={[styles.deleteModalTitle, { color: colors.error }]}>
                  Delete your account?
                </Text>
              </View>
              <Pressable onPress={closeDeleteModal} hitSlop={8}>
                <X size={18} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text style={[styles.deleteModalDescription, { color: colors.textSecondary }]}>
              This will permanently delete your Scamly account including:
            </Text>

            <View style={styles.bulletList}>
              <Text style={[styles.bulletItem, { color: colors.textPrimary }]}>
                • Your profile and personal data
              </Text>
              <Text style={[styles.bulletItem, { color: colors.textPrimary }]}>
                • All scan history and chat conversations
              </Text>
              <Text style={[styles.bulletItem, { color: colors.textPrimary }]}>
                • Your referral data and rewards
              </Text>
              <Text style={[styles.bulletItem, { color: colors.textPrimary }]}>
                • Any active subscription (cancelled immediately with no further billing)
              </Text>
            </View>

            <Text style={[styles.deleteModalWarning, { color: colors.error }]}>
              This action is irreversible and cannot be undone.
            </Text>

            <Text style={[styles.deleteInstruction, { color: colors.textSecondary }]}>
              Type "confirm deletion" to confirm:
            </Text>

            <View style={styles.deletePhraseRow}>
              <TextInput
                placeholder={DELETE_CONFIRMATION_PHRASE}
                placeholderTextColor={colors.textTertiary}
                style={[
                  styles.deleteInput,
                  {
                    color: colors.textPrimary,
                    borderColor: canConfirmDeletion ? colors.success : colors.border,
                    backgroundColor: colors.backgroundSecondary,
                  },
                ]}
                value={deleteConfirmationText}
                onChangeText={setDeleteConfirmationText}
                editable={!deletingAccount}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Pressable
                onPress={handleCopyDeletePhrase}
                style={[
                  styles.copyButton,
                  {
                    borderColor: colors.border,
                    backgroundColor: colors.backgroundSecondary,
                  },
                ]}
              >
                <Copy size={16} color={colors.accent} />
                <Text style={[styles.copyButtonText, { color: colors.accent }]}>Copy</Text>
              </Pressable>
            </View>

            <View style={styles.deleteActionRow}>
              <Button
                onPress={closeDeleteModal}
                variant="secondary"
                disabled={deletingAccount}
                style={styles.deleteActionButton}
              >
                Cancel
              </Button>
              <Button
                onPress={handleDeleteAccount}
                variant="danger"
                loading={deletingAccount}
                disabled={!canConfirmDeletion || deletingAccount}
                style={styles.deleteActionButton}
              >
                Permanently Delete Account
              </Button>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={showDeleteFailedModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDeleteFailedModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDeleteFailedModal(false)}
        >
          <Pressable
            style={[
              styles.errorModalContent,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
                borderRadius: radius["2xl"],
                ...shadows.lg,
              },
            ]}
            onPress={() => {}}
          >
            <Text style={[styles.errorModalTitle, { color: colors.textPrimary }]}>
              Account deletion failed
            </Text>
            <Text style={[styles.errorModalBody, { color: colors.textSecondary }]}>
              We could not delete your account right now. Please try again in a few
              minutes.{"\n\n"}If you are signed in to Scamly elsewhere, you cannot
              delete your account. Please sign out of all other sessions and retry.{"\n\n"}If
              issues persist, contact support@scamly.io
            </Text>
            <Button
              onPress={() => setShowDeleteFailedModal(false)}
              fullWidth
              size="lg"
            >
              Close
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 18,
    flex: 1,
  },
  headerSpacer: {
    width: 34,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 17,
    marginBottom: 12,
  },
  card: {
    padding: 0,
    overflow: "hidden",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    gap: 14,
  },
  fieldIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
    marginBottom: 2,
  },
  fieldValue: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 15,
  },
  fieldValueDisabled: {
    fontFamily: "Poppins-Regular",
    fontSize: 15,
  },
  helperText: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    marginTop: 4,
    lineHeight: 17,
    textAlign: "center",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
  },
  fieldsContainer: {
    gap: 16,
  },
  inputLabel: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
    marginBottom: 6,
    marginLeft: 4,
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
  linkRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 14,
  },
  linkText: {
    flex: 1,
    fontFamily: "Poppins-Medium",
    fontSize: 15,
  },
  saveSection: {
    marginTop: 4,
    marginBottom: 16,
  },
  dangerZoneSection: {
    marginTop: 6,
    marginBottom: 24,
  },
  dangerZoneHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  dangerZoneTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
  },
  dangerZoneCard: {
    padding: 14,
    gap: 12,
    borderWidth: 1,
  },
  dangerZoneText: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    padding: 20,
  },
  deleteModalContent: {
    borderWidth: 1,
    padding: 20,
  },
  deleteModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  deleteModalTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  deleteModalTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 20,
  },
  deleteModalDescription: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  bulletList: {
    marginTop: 8,
    marginBottom: 8,
    gap: 6,
  },
  bulletItem: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  deleteModalWarning: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  deleteInstruction: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
    marginBottom: 8,
  },
  deletePhraseRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  deleteInput: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: "Poppins-Regular",
    fontSize: 15,
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    gap: 6,
  },
  copyButtonText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 13,
  },
  deleteActionRow: {
    flexDirection: "row",
    gap: 10,
  },
  deleteActionButton: {
    flex: 1,
  },
  errorModalContent: {
    borderWidth: 1,
    padding: 20,
    gap: 14,
  },
  errorModalTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 20,
  },
  errorModalBody: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 20,
  },
});
