import Button from "@/components/Button";
import Card from "@/components/Card";
import ThemedBackground from "@/components/ThemedBackground";
import { useTheme } from "@/theme";
import { search, SearchError } from "@/utils/ai/search";
import { trackFeatureOpened, trackUserVisibleError } from "@/utils/analytics";
import { captureDataFetchError } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import { SearchResult } from "@/utils/types";
import { useFocusEffect } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { Check, ContactRound, Copy, ExternalLink, Globe, Info, Lock, Phone, Search as SearchIcon } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PhoneSearch() {
  const { colors, radius, shadows, isDark } = useTheme();
  const [searchInput, setSearchInput] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [resultData, setResultData] = useState<SearchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [planLoading, setPlanLoading] = useState(true);
  const [isFreePlan, setIsFreePlan] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Track feature discovery when info search tab is focused
  useFocusEffect(
    React.useCallback(() => {
      trackFeatureOpened("info_search");
    }, [])
  );

  useEffect(() => {
    const fetchSubscriptionPlan = async () => {
      setPlanLoading(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        trackUserVisibleError("info_search", "session_invalid", false);
        captureDataFetchError(userError || new Error("No user found"), "info_search", "get_user", "critical");
        Alert.alert("Error", "No user found");
        setPlanLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("subscription_plan")
        .eq("id", user.id)
        .single();

      if (profileError) {
        trackUserVisibleError("info_search", "profile_fetch_failed", false);
        captureDataFetchError(profileError, "info_search", "fetch_profile", "critical");
        Alert.alert("Error", "There is an issue with your account. Please log out and try again.");
        setPlanLoading(false);
        return;
      }

      setIsFreePlan(profile.subscription_plan === "free");
      setPlanLoading(false);
    };

    fetchSubscriptionPlan();
  }, []);

  function getErrorMessage(err: unknown): string {
    if (err instanceof SearchError) {
      switch (err.stage) {
        case "subscription_check":
          return "There was an issue verifying your account. Please try again.";
        case "validation":
          return "Please enter a valid company name.";
        case "ai_response":
          return "Failed to fetch company information. Please try again later.";
        default:
          return "Something went wrong. Please try again later.";
      }
    }
    return "Something went wrong. Please try again later.";
  }

  async function handleSearch() {
    if (isFreePlan) {
      Alert.alert("Feature Locked", "This feature is not available on free accounts.");
      return;
    }
    if (!searchInput.trim()) return;

    setIsLoading(true);
    setError(null);
    setShowResults(false);

    try {
      const result = await search(searchInput.trim(), userId);

      setResultData(result.data);
      setShowResults(true);
    } catch (err) {
      // Error is already captured to Sentry and tracked in PostHog by search.ts
      // Just display the appropriate error message to the user
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }

  const company = resultData;

  // Clean domain by removing www., https://, or http:// prefixes
  const cleanDomain = (domain: string) => {
    if (!domain || domain === "0") return domain;
    return domain
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '');
  };

  // Copy phone number to clipboard with visual feedback
  const copyToClipboard = async (value: string, fieldName: string) => {
    await Clipboard.setStringAsync(value);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <ThemedBackground>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Info Search</Text>
              <View style={[styles.betaTag, { backgroundColor: isDark ? 'rgba(99, 102, 241, 0.2)' : 'rgba(99, 102, 241, 0.15)' }]}>
                <Text style={[styles.betaTagText, { color: colors.accent }]}>Beta</Text>
              </View>
            </View>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Find contact info for any organisation worldwide
            </Text>
          </Animated.View>

          {/* Search Card */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <Card style={styles.searchCard} pressable={false}>
              <TouchableOpacity style={styles.howToUseButton} onPress={() => setShowModal(true)}>
                <Info size={16} color={colors.accent} />
                <Text style={[styles.howToUseText, { color: colors.accent }]}>
                  How to use this feature
                </Text>
              </TouchableOpacity>

              <View
                style={[
                  styles.searchInputContainer,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                    borderRadius: radius.lg,
                  },
                ]}
              >
                <SearchIcon size={20} color={colors.textTertiary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  placeholder="Enter a company name"
                  placeholderTextColor={colors.textTertiary}
                  returnKeyType="search"
                  value={searchInput}
                  onChangeText={setSearchInput}
                  onSubmitEditing={handleSearch}
                  editable={!isFreePlan}
                  selectTextOnFocus={!isFreePlan}
                />
              </View>

              <Button
                onPress={handleSearch}
                disabled={!searchInput.trim() || !!isFreePlan}
                loading={isLoading}
                fullWidth
              >
                Search
              </Button>

              {isFreePlan && !planLoading && (
                <View style={[styles.lockOverlay, { borderRadius: radius.xl }]}>
                  <Lock size={28} color="white" />
                  <Text style={styles.lockTitle}>Feature Locked</Text>
                  <Text style={styles.lockSubtitle}>
                    Scamly's advanced contact information search tool is not available on free accounts.
                  </Text>
                </View>
              )}
            </Card>
          </Animated.View>

          {/* Results Card */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <Card style={styles.resultsCard} pressable={false}>
              {isLoading || planLoading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={colors.accent} />
                </View>
              ) : error ? (
                <View style={styles.errorContainer}>
                  <Text style={[styles.errorText, { color: colors.error }]}>{error}</Text>
                </View>
              ) : showResults && company ? (
                <Animated.View entering={FadeIn.duration(300)}>
                  <Text style={[styles.companyName, { color: colors.textPrimary }]}>
                    {company.company_name}
                  </Text>

                  <View style={[styles.divider, { backgroundColor: colors.border }]} />

                  <View style={styles.infoList}>
                    {/* Website */}
                    <View
                      style={[
                        styles.infoItem,
                        { backgroundColor: colors.backgroundSecondary, borderRadius: radius.lg },
                      ]}
                    >
                      <View style={styles.infoItemLeft}>
                        <View
                          style={[styles.infoIconContainer, { backgroundColor: colors.accentMuted }]}
                        >
                          <Globe size={18} color={colors.accent} />
                        </View>
                        <View style={styles.infoTextContainer}>
                          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                            Website
                          </Text>
                          <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                            {company.website_domain !== "0"
                              ? `www.${cleanDomain(company.website_domain)}`
                              : "Not found"}
                          </Text>
                        </View>
                      </View>
                      {company.website_domain !== "0" && (
                        <TouchableOpacity
                          onPress={() => Linking.openURL(`https://${cleanDomain(company.website_domain)}`)}
                          style={[styles.actionButton, { backgroundColor: colors.accentMuted }]}
                        >
                          <ExternalLink size={18} color={colors.accent} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Website */}
                    <View
                      style={[
                        styles.infoItem,
                        { backgroundColor: colors.backgroundSecondary, borderRadius: radius.lg },
                      ]}
                    >
                      <View style={styles.infoItemLeft}>
                        <View
                          style={[styles.infoIconContainer, { backgroundColor: colors.accentMuted }]}
                        >
                          <ContactRound size={18} color={colors.accent} />
                        </View>
                        <View style={styles.infoTextContainer}>
                          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                            Contact Us Page
                          </Text>
                          <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                            {company.contact_us_page !== "0"
                              ? `${company.contact_us_page}`
                              : "Not found"}
                          </Text>
                        </View>
                      </View>
                      {company.contact_us_page !== "0" && (
                        <TouchableOpacity
                          onPress={() => Linking.openURL(`https://${company.contact_us_page}`)}
                          style={[styles.actionButton, { backgroundColor: colors.accentMuted }]}
                        >
                          <ExternalLink size={18} color={colors.accent} />
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* Local Phone */}
                    <View
                      style={[
                        styles.infoItem,
                        { backgroundColor: colors.backgroundSecondary, borderRadius: radius.lg },
                      ]}
                    >
                      <View style={styles.infoItemLeft}>
                        <View
                          style={[styles.infoIconContainer, { backgroundColor: colors.accentMuted }]}
                        >
                          <Phone size={18} color={colors.accent} />
                        </View>
                        <View style={styles.infoTextContainer}>
                          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                            Local Phone
                          </Text>
                          <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                            {company.local_phone_number !== "0"
                              ? company.local_phone_number
                              : "Not found"}
                          </Text>
                        </View>
                      </View>
                      {company.local_phone_number !== "0" && (
                        <TouchableOpacity
                          onPress={() => copyToClipboard(company.local_phone_number, "local_phone")}
                          style={[styles.actionButton, { backgroundColor: colors.accentMuted }]}
                        >
                          {copiedField === "local_phone" ? (
                            <Check size={18} color={colors.success} />
                          ) : (
                            <Copy size={18} color={colors.accent} />
                          )}
                        </TouchableOpacity>
                      )}
                    </View>

                    {/* International Phone */}
                    <View
                      style={[
                        styles.infoItem,
                        { backgroundColor: colors.backgroundSecondary, borderRadius: radius.lg },
                      ]}
                    >
                      <View style={styles.infoItemLeft}>
                        <View
                          style={[styles.infoIconContainer, { backgroundColor: colors.accentMuted }]}
                        >
                          <Phone size={18} color={colors.accent} />
                        </View>
                        <View style={styles.infoTextContainer}>
                          <Text style={[styles.infoLabel, { color: colors.textSecondary }]}>
                            International
                          </Text>
                          <Text style={[styles.infoValue, { color: colors.textPrimary }]}>
                            {company.international_phone_number !== "0"
                              ? company.international_phone_number
                              : "Not found"}
                          </Text>
                        </View>
                      </View>
                      {company.international_phone_number !== "0" && (
                        <TouchableOpacity
                          onPress={() => copyToClipboard(company.international_phone_number, "international_phone")}
                          style={[styles.actionButton, { backgroundColor: colors.accentMuted }]}
                        >
                          {copiedField === "international_phone" ? (
                            <Check size={18} color={colors.success} />
                          ) : (
                            <Copy size={18} color={colors.accent} />
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>

                  {!company.found_all_fields && (
                    <View
                      style={[
                        styles.warningBox,
                        { backgroundColor: colors.warningMuted, borderRadius: radius.md },
                      ]}
                    >
                      <Text style={[styles.warningText, { color: colors.warning }]}>
                        Some information could not be found: {company.missing_fields.join(", ")}.
                      </Text>
                    </View>
                  )}
                </Animated.View>
              ) : (
                <View style={styles.emptyContainer}>
                  <View
                    style={[styles.emptyIconContainer, { backgroundColor: colors.accentMuted }]}
                  >
                    <SearchIcon size={28} color={colors.accent} />
                  </View>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Your results will appear here
                  </Text>
                </View>
              )}
            </Card>
          </Animated.View>

          {/* Disclaimer */}
          <View style={styles.disclaimer}>
            <Text style={[styles.disclaimerTitle, { color: colors.textSecondary }]}>
              Disclaimer
            </Text>
            <Text style={[styles.disclaimerText, { color: colors.textTertiary }]}>
              This tool uses AI to locate public company contact information. Results may not
              always be complete or accurate. Please verify through official sources before use.
            </Text>
          </View>
        </ScrollView>

        {/* How to Use Modal */}
        <Modal
          animationType="fade"
          transparent={true}
          visible={showModal}
          onRequestClose={() => setShowModal(false)}
        >
          <View style={styles.modalOverlay}>
            <Animated.View
              entering={FadeIn.duration(200)}
              style={[
                styles.modalContainer,
                {
                  backgroundColor: colors.surface,
                  borderRadius: radius["2xl"],
                  ...shadows.xl,
                },
              ]}
            >
              <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>Tips</Text>
              <Text style={[styles.modalText, { color: colors.textSecondary }]}>
                For the best results:{"\n\n"}• Use the company's full or most recognized name
                {"\n"}• Include a country for international brands{"\n"}• Example: "ANZ Bank
                Australia" instead of "ANZ"{"\n\n"}Allow up to 30 seconds for results.
              </Text>
              <Button onPress={() => setShowModal(false)}>Got it</Button>
            </Animated.View>
          </View>
        </Modal>
      </SafeAreaView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 24,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 28,
  },
  betaTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  betaTagText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 15,
  },
  searchCard: {
    marginBottom: 20,
    gap: 16,
    position: "relative",
  },
  howToUseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  howToUseText: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    height: 52,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: 15,
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.7)",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingHorizontal: 24,
  },
  lockTitle: {
    color: "white",
    fontFamily: "Poppins-Bold",
    fontSize: 18,
  },
  lockSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    textAlign: "center",
  },
  resultsCard: {
    marginBottom: 24,
    minHeight: 200,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  errorContainer: {
    padding: 20,
    alignItems: "center",
  },
  errorText: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    textAlign: "center",
  },
  companyName: {
    fontFamily: "Poppins-Bold",
    fontSize: 22,
    textAlign: "center",
    marginBottom: 16,
  },
  divider: {
    height: 1,
    marginBottom: 16,
  },
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  infoItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flex: 1,
    marginRight: 12,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoTextContainer: {
    flex: 1,
    flexShrink: 1,
  },
  infoLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
  },
  infoValue: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 15,
    flexWrap: "wrap",
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  warningBox: {
    padding: 14,
    marginTop: 16,
  },
  warningText: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
    textAlign: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 16,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontFamily: "Poppins-Regular",
    fontSize: 15,
  },
  disclaimer: {
    marginTop: 8,
  },
  disclaimerTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    marginBottom: 6,
  },
  disclaimerText: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContainer: {
    width: "100%",
    maxWidth: 340,
    padding: 24,
    alignItems: "center",
  },
  modalTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 20,
    marginBottom: 16,
  },
  modalText: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: "left",
    width: "100%",
  },
});
