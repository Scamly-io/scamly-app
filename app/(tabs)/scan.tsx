import Button from "@/components/Button";
import Card from "@/components/Card";
import ThemedBackground from "@/components/ThemedBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { ScanError, scanImage } from "@/utils/ai/scan";
import {
  trackFeatureOpened,
  trackResultViewed,
  trackScanCompleted,
  trackScanStarted,
  trackUserVisibleError,
  type ResultCategory,
} from "@/utils/analytics";
import { captureDataFetchError } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import { ScanResult } from "@/utils/types";
import { useFocusEffect } from "@react-navigation/native";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { CheckCircle, Info, Lock, Shield, TriangleAlert, Upload, XCircle } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

function getUserBillingPeriod(createdAt: string | Date) {
  const created = new Date(createdAt);
  const now = new Date();

  let periodStart = new Date(
    Date.UTC(now.getUTCFullYear(), created.getUTCMonth(), created.getUTCDate(), 0, 0, 0, 0)
  );

  if (periodStart > now) {
    periodStart = new Date(
      Date.UTC(now.getUTCFullYear(), created.getUTCMonth() - 1, created.getUTCDate(), 0, 0, 0, 0)
    );
  }

  const nextPeriodStart = new Date(
    Date.UTC(
      periodStart.getUTCFullYear(),
      periodStart.getUTCMonth() + 1,
      periodStart.getUTCDate(),
      0,
      0,
      0,
      0
    )
  );

  return { periodStart, nextPeriodStart };
}

const FREE_USER_SCAN_QUOTA = 6;

/**
 * Map scan results to analytics result category.
 * Uses is_scam and risk_level to determine the category.
 */
function getResultCategory(isScam: boolean, riskLevel: string): ResultCategory {
  if (isScam && riskLevel === "high") return "scam";
  if (isScam && riskLevel === "medium") return "likely_scam";
  if (!isScam && riskLevel === "low") return "safe";
  return "unsure";
}

export default function Scan() {
  const { colors, radius, shadows, isDark } = useTheme();
  const { user } = useAuth();
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [showModal, setShowModal] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [pageLoading, setPageLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<ScanResult | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const [scanQuotaReached, setScanQuotaReached] = useState<boolean>(false);
  const [scanQuotaJustReached, setScanQuotaJustReached] = useState<boolean>(false);
  const [scanQuotaResetDate, setScanQuotaResetDate] = useState<string | null>(null);

  // Track whether we've already fired result_viewed for the current results
  const hasTrackedResultView = useRef<boolean>(false);

  async function handlePageMount() {
    setPageLoading(true);

    if (!user) {
      trackUserVisibleError("scan", "session_invalid", false);
      Alert.alert("Error", "There is an issue with your account. Please log out and try again.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_plan, created_at")
      .eq("id", user.id)
      .single();

    if (profileError) {
      trackUserVisibleError("scan", "profile_fetch_failed", false);
      captureDataFetchError(profileError, "scan", "fetch_profile", "critical");
      Alert.alert("Error", "There is an issue with your account. Please log out and try again.");
      return;
    }

    if (profile.subscription_plan === "free") {
      const { periodStart, nextPeriodStart } = getUserBillingPeriod(profile.created_at);

      const { count, error: countError } = await supabase
        .from("scans")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user!.id)
        .gte("created_at", periodStart.toISOString())
        .lt("created_at", nextPeriodStart.toISOString());

      if (countError) {
        trackUserVisibleError("scan", "quota_check_failed", false);
        captureDataFetchError(countError, "scan", "fetch_quota", "critical");
        Alert.alert("Error", "There is an issue with your account. Please log out and try again.");
        return;
      }

      if (count !== null && count >= FREE_USER_SCAN_QUOTA) {
        setScanQuotaReached(true);
        setScanQuotaResetDate(nextPeriodStart.toLocaleDateString());
      }
    }
    setPageLoading(false);
  }

  useEffect(() => {
    if (user) {
      handlePageMount();
    }
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      // Track feature discovery when scan tab is focused
      trackFeatureOpened("scan");
      if (user) {
        handlePageMount();
      }
    }, [user])
  );

  async function checkQuotaAfterScan() {
    if (!user) return;

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_plan, created_at")
      .eq("id", user.id)
      .single();

    if (profileError || profile.subscription_plan !== "free") return;

    const { periodStart, nextPeriodStart } = getUserBillingPeriod(profile.created_at);

    const { count, error: countError } = await supabase
      .from("scans")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", periodStart.toISOString())
      .lt("created_at", nextPeriodStart.toISOString());

    if (countError) return;

    if (count !== null && count >= FREE_USER_SCAN_QUOTA) {
      setScanQuotaJustReached(true);
      setScanQuotaResetDate(nextPeriodStart.toLocaleDateString());
      Alert.alert("Scan Limit Reached", "You've reached the monthly scan limit for your account. Your quota will reset on " + nextPeriodStart.toLocaleDateString());
    }
  }

  function makeId(length: number): string {
    let result = "";
    const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  async function convertImageToB64(imageUri: string): Promise<string> {

    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { height: 1024 } }], 
      {
        compress: 0.7,
        base64: true,
        format: ImageManipulator.SaveFormat.JPEG
      }
    )
    return result.base64
  }

  async function handleScan() {
    if (!image) return;
    if (!user) return;

    setResults(null);
    setLoading(true);
    // Reset result view tracking for new scan
    hasTrackedResultView.current = false;

    // Track scan initiation - source is always 'upload' since camera is not yet implemented
    trackScanStarted("screenshot", "upload");

    const scanStartTime = Date.now();

    const imageB64 = await convertImageToB64(image.uri!);

    try {
      const scanResults = await scanImage(imageB64);

      // Track successful scan completion with result category and processing time
      const processingTimeMs = Date.now() - scanStartTime;
      const resultCategory = getResultCategory(scanResults.is_scam, scanResults.risk_level);
      trackScanCompleted("screenshot", resultCategory, processingTimeMs);

      // Track that the user is viewing the result
      trackResultViewed(resultCategory);
      hasTrackedResultView.current = true;

      setResults(scanResults);

      // Check if this scan exhausted the user's free quota
      await checkQuotaAfterScan();
    } catch (err) {
      // Track user-visible error for analytics
      trackUserVisibleError("scan", "scan_failed", true);

      // Show appropriate error message based on error type
      if (err instanceof ScanError) {
        if (err.stage === "quota_exceeded") {
          // Refresh the page state to show quota warning
          handlePageMount();
          Alert.alert("Scan Limit Reached", "You've reached your monthly scan limit. Please upgrade or wait for your quota to reset.");
        } else if (err.stage === "upload") {
          Alert.alert("Upload Failed", "We couldn't upload your image. Please check your connection and try again.");
        } else {
          Alert.alert("Scan Failed", "We couldn't complete your scan. Please try again later.");
        }
      } else {
        // Generic error for unexpected failures
        Alert.alert("Scan Failed", "Something went wrong while scanning your image. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function pickImage() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      // Permission denied is expected user behavior, not logged to Sentry
      trackUserVisibleError("scan", "photo_permission_denied", true);
      Alert.alert("Error", "We need permission to access your photos to upload images.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });

    if (result.canceled) return;

    setImage(result.assets[0]);

    Image.getSize(result.assets[0].uri!, (width, height) => {
      setAspectRatio(width / height);
    });
  }

  function getRiskColor(riskLevel: string) {
    switch (riskLevel) {
      case "low":
        return colors.success;
      case "medium":
        return colors.warning;
      case "high":
        return colors.error;
      default:
        return colors.textSecondary;
    }
  }

  function getRiskBgColor(riskLevel: string) {
    switch (riskLevel) {
      case "low":
        return colors.successMuted;
      case "medium":
        return colors.warningMuted;
      case "high":
        return colors.errorMuted;
      default:
        return colors.backgroundSecondary;
    }
  }

  function getSeverityIcon(severity: string) {
    switch (severity) {
      case "low":
        return <TriangleAlert size={20} color={colors.success} />;
      case "medium":
        return <TriangleAlert size={20} color={colors.warning} />;
      case "high":
        return <XCircle size={20} color={colors.error} />;
      default:
        return null;
    }
  }

  function getResultTitle(riskLevel: string) {
    switch (riskLevel) {
      case "low":
        return "Looks Safe";
      case "medium":
        return "Possibly a Scam";
      case "high":
        return "Likely a Scam";
    }
  }

  const scanButtonDisabled = !image || loading || !user || scanQuotaReached || scanQuotaJustReached;

  return (
    <ThemedBackground>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Scanner</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Scan texts, emails, or online media for scams
            </Text>
          </Animated.View>

          {pageLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : (
            <>
              {/* Quota Warning */}
              {(scanQuotaReached || scanQuotaJustReached) && (
                <Animated.View entering={FadeIn.duration(300)}>
                  <Card
                    style={[styles.quotaCard, { backgroundColor: colors.errorMuted }]}
                    pressable={false}
                  >
                    <Lock size={20} color={colors.error} />
                    <View style={styles.quotaTextContainer}>
                      <Text style={[styles.quotaTitle, { color: colors.error }]}>
                        Monthly limit reached
                      </Text>
                      <Text style={[styles.quotaSubtitle, { color: colors.textSecondary }]}>
                        Your quota will reset on {scanQuotaResetDate}
                      </Text>
                    </View>
                  </Card>
                </Animated.View>
              )}

              {/* Upload Card */}
              <Animated.View entering={FadeInDown.duration(400).delay(100)}>
                <Card style={styles.uploadCard} pressable={false}>
                  <TouchableOpacity
                    style={styles.howToUseButton}
                    onPress={() => setShowModal(true)}
                  >
                    <Info size={16} color={colors.accent} />
                    <Text style={[styles.howToUseText, { color: colors.accent }]}>
                      How to use this feature
                    </Text>
                  </TouchableOpacity>

                  {image ? (
                    <View style={styles.uploadedImageContainer}>
                      <Image
                        source={{ uri: image.uri }}
                        style={[
                          styles.uploadedImage,
                          { aspectRatio: aspectRatio, borderRadius: radius.lg },
                        ]}
                        resizeMode="contain"
                      />
                      <TouchableOpacity
                        onPress={() => {
                          setImage(null);
                          setResults(null);
                          if (scanQuotaJustReached) {
                            setScanQuotaJustReached(false);
                            setScanQuotaReached(true);
                          }
                        }}
                        disabled={loading}
                      >
                        <Text style={[styles.clearButtonText, { color: colors.error }]}>
                          Clear
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={[
                        styles.uploadPlaceholder,
                        {
                          borderColor: colors.border,
                          backgroundColor: colors.backgroundSecondary,
                          borderRadius: radius.xl,
                        },
                      ]}
                      onPress={() => {
                        if (!scanQuotaReached) pickImage();
                      }}
                      disabled={scanQuotaReached}
                    >
                      <View
                        style={[
                          styles.uploadIconContainer,
                          { backgroundColor: colors.accentMuted },
                        ]}
                      >
                        <Upload size={28} color={colors.accent} />
                      </View>
                      <Text style={[styles.uploadTitle, { color: colors.textPrimary }]}>
                        Upload a Screenshot
                      </Text>
                      <Text style={[styles.uploadSubtitle, { color: colors.textSecondary }]}>
                        Tap to select an image
                      </Text>
                      {scanQuotaReached && (
                        <View
                          style={[styles.uploadOverlay, { backgroundColor: "rgba(0,0,0,0.6)" }]}
                        >
                          <Lock size={28} color="white" />
                        </View>
                      )}
                    </TouchableOpacity>
                  )}
                </Card>
              </Animated.View>

              {/* Scan Button */}
              <Animated.View entering={FadeInDown.duration(400).delay(150)} style={styles.scanButtonContainer}>
                <Button
                  onPress={handleScan}
                  disabled={scanButtonDisabled}
                  loading={loading}
                  fullWidth
                  size="lg"
                >
                  Scan for Scams
                </Button>
              </Animated.View>

              {/* Results */}
              {results && (
                <Animated.View entering={FadeIn.duration(400)}>
                  {/* Risk Level Card */}
                  <Card
                    style={[
                      styles.resultCard,
                      { backgroundColor: getRiskBgColor(results.risk_level) },
                    ]}
                    pressable={false}
                  >
                    <View style={styles.resultHeader}>
                      <View style={styles.resultTitleRow}>
                        {results.is_scam ? (
                          <TriangleAlert size={24} color={getRiskColor(results.risk_level)} />
                        ) : (
                          <CheckCircle size={24} color={getRiskColor(results.risk_level)} />
                        )}
                        <Text
                          style={[
                            styles.resultTitle,
                            { color: getRiskColor(results.risk_level) },
                          ]}
                        >
                          {getResultTitle(results.risk_level)}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.confidenceText,
                          { color: getRiskColor(results.risk_level) },
                        ]}
                      >
                        {results.confidence}%
                      </Text>
                    </View>
                    <View style={styles.resultDetails}>
                      <Text style={[styles.riskLevelText, { color: colors.textSecondary }]}>
                        {results.risk_level.charAt(0).toUpperCase() + results.risk_level.slice(1)}{" "}
                        risk detected
                      </Text>
                      <Text style={[styles.confidenceLabel, { color: colors.textSecondary }]}>
                        Confidence
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.warningBox,
                        { backgroundColor: isDark ? colors.surface : "rgba(255,255,255,0.6)" },
                      ]}
                    >
                      <Text style={[styles.warningText, { color: colors.textPrimary }]}>
                        {results.is_scam
                          ? "Do not respond or click any links. Report and delete this message immediately."
                          : "This looks safe. But always verify the sender before responding."}
                      </Text>
                    </View>
                  </Card>

                  {/* Key Detections */}
                  <Card style={styles.detectionsCard} pressable={false}>
                    <Text style={[styles.detectionsTitle, { color: colors.textPrimary }]}>
                      Key Detections
                    </Text>
                    <View style={styles.detectionsList}>
                      {results.detections.map((detection, index) => (
                        <View
                          key={index}
                          style={[
                            styles.detectionItem,
                            { backgroundColor: colors.backgroundSecondary },
                          ]}
                        >
                          {getSeverityIcon(detection.severity)}
                          <Text
                            style={[styles.detectionText, { color: colors.textPrimary }]}
                          >
                            {detection.description}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </Card>

                  {/* Safety Tips */}
                  <Card
                    style={[styles.tipsCard, { backgroundColor: colors.accentMuted }]}
                    pressable={false}
                  >
                    <View style={styles.tipsHeader}>
                      <Shield size={20} color={colors.accent} />
                      <Text style={[styles.tipsTitle, { color: colors.textPrimary }]}>
                        Stay Safe
                      </Text>
                    </View>
                    <View style={styles.tipsList}>
                      {[
                        "Never share passwords or financial information via text or email.",
                        "Verify the sender through official channels.",
                        "Be wary of urgent requests or threats.",
                        "Check URL details carefully before clicking links.",
                      ].map((tip, index) => (
                        <View key={index} style={styles.tipItem}>
                          <Text style={[styles.tipBullet, { color: colors.accent }]}>•</Text>
                          <Text style={[styles.tipText, { color: colors.textSecondary }]}>
                            {tip}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </Card>
                </Animated.View>
              )}

              {/* Disclaimer */}
              <View style={styles.disclaimer}>
                <Text style={[styles.disclaimerTitle, { color: colors.textSecondary }]}>
                  Disclaimer
                </Text>
                <Text style={[styles.disclaimerText, { color: colors.textTertiary }]}>
                  This tool uses AI to analyze content for potential scams. Results are generated
                  automatically and may not always reflect the full context. Always use your own
                  judgment and verify through official sources.
                </Text>
              </View>
            </>
          )}
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
                For the best results:{"\n\n"}• Include the main message or section to analyze
                {"\n"}• Capture contact details if relevant{"\n"}• Focus on the most suspicious
                parts{"\n"}• Ensure text is easy to read{"\n\n"}Allow up to 10 seconds for results to appear.
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
  headerTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 28,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 15,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
  },
  quotaCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  quotaTextContainer: {
    flex: 1,
  },
  quotaTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 15,
  },
  quotaSubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
  },
  uploadCard: {
    marginBottom: 16,
  },
  howToUseButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 16,
  },
  howToUseText: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
  },
  uploadedImageContainer: {
    alignItems: "center",
    gap: 16,
  },
  uploadedImage: {
    width: "100%",
    maxHeight: 300,
  },
  clearButtonText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 15,
  },
  uploadPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
    borderWidth: 2,
    borderStyle: "dashed",
    gap: 12,
    position: "relative",
    overflow: "hidden",
  },
  uploadIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  uploadTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 17,
    textAlign: "center",
  },
  uploadSubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    textAlign: "center",
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
  },
  scanButtonContainer: {
    marginBottom: 24,
  },
  resultCard: {
    marginBottom: 16,
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  resultTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  resultTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 20,
  },
  confidenceText: {
    fontFamily: "Poppins-Bold",
    fontSize: 26,
  },
  resultDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  riskLevelText: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
  },
  confidenceLabel: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
  },
  warningBox: {
    padding: 14,
    borderRadius: 12,
  },
  warningText: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  detectionsCard: {
    marginBottom: 16,
  },
  detectionsTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 18,
    marginBottom: 14,
  },
  detectionsList: {
    gap: 10,
  },
  detectionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
  },
  detectionText: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  tipsCard: {
    marginBottom: 24,
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 14,
  },
  tipsTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 17,
  },
  tipsList: {
    gap: 10,
  },
  tipItem: {
    flexDirection: "row",
    gap: 10,
  },
  tipBullet: {
    fontFamily: "Poppins-Bold",
    fontSize: 16,
  },
  tipText: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
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
