import Button from "@/components/Button";
import Card from "@/components/Card";
import ShimmerText from "@/components/ShimmerText";
import ShortcutSetupModal from "@/components/ShortcutSetupModal";
import ThemedBackground from "@/components/ThemedBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useQuickScanRedirect } from "@/hooks/useQuickScanRedirect";
import { useTheme } from "@/theme";
import { ScanError, scanImage } from "@/utils/ai/scan";
import {
  trackFeatureOpened,
  trackResultViewed,
  trackScanCompleted,
  trackScanStarted,
  trackUserVisibleError,
  type ResultCategory,
} from "@/utils/shared/analytics";
import { presentScamlyPaywallIfNeeded, trackRevenueCatError } from "@/utils/shared/revenuecat";
import { promptReview } from "@/utils/shared/review";
import { captureDataFetchError } from "@/utils/shared/sentry";
import { supabase } from "@/utils/shared/supabase";
import { ScanResult } from "@/utils/shared/types";
import { useFocusEffect } from "@react-navigation/native";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import {
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Lock,
  Shield,
  TriangleAlert,
  Upload,
  XCircle,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import Animated, { FadeIn, FadeInDown, FadeOut } from "react-native-reanimated";
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
const PAGE_MOUNT_CACHE_TTL_MS = 5 * 60 * 1000;

const SCAN_PREMIUM_UPSELL_BULLETS = [
  "Unlimited scans per month",
  "Our most advanced scam detection models",
  "Faster, easier scanning with Quick Scan on iOS.",
] as const;

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

type ScanPhase = "idle" | "scanning" | "complete";
type PageMountCache = {
  userRef: ReturnType<typeof useAuth>["user"];
  cachedAt: number;
  scanQuotaReached: boolean;
  scanQuotaResetDate: string | null;
  isFreePlan: boolean;
};

const STAGE_OPTIONS = {
  upload: ["Uploading your image"],
  analysis: [
    "Analysing content",
    "Examining message patterns",
    "Scanning for red flags",
    "Reviewing message content",
  ],
  research: [
    "Researching contact information",
    "Cross-referencing known scam patterns",
    "Verifying sender details",
    "Checking against scam databases",
  ],
};

function pickRandom(arr: string[]): string {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function Scan() {
  const { quickscan } = useLocalSearchParams<{ quickscan?: string | string[] }>();
  useQuickScanRedirect(quickscan);
  const { colors, radius, shadows, isDark } = useTheme();
  const { user } = useAuth();
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [pageLoading, setPageLoading] = useState<boolean>(true);
  const [results, setResults] = useState<ScanResult | null>(null);
  const [aspectRatio, setAspectRatio] = useState<number>(1);
  const [scanQuotaReached, setScanQuotaReached] = useState<boolean>(false);
  const [scanQuotaJustReached, setScanQuotaJustReached] = useState<boolean>(false);
  const [scanQuotaResetDate, setScanQuotaResetDate] = useState<string | null>(null);
  const [scanFailureWarning, setScanFailureWarning] = useState<string | null>(null);
  const [expandedDetections, setExpandedDetections] = useState<Set<number>>(new Set());
  const [showShortcutSetup, setShowShortcutSetup] = useState(false);
  const [isFreePlan, setIsFreePlan] = useState(false);
  const [openingPaywall, setOpeningPaywall] = useState(false);

  const [scanPhase, setScanPhase] = useState<ScanPhase>("idle");
  const [scanStage, setScanStage] = useState<number>(0);
  const [stageTexts, setStageTexts] = useState<string[]>(["", "", ""]);

  const loading = scanPhase === "scanning";

  // Track whether we've already fired result_viewed for the current results
  const hasTrackedResultView = useRef<boolean>(false);
  const stageTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pageMountCacheRef = useRef<PageMountCache | null>(null);
  const pageMountInFlightRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    if (pageMountCacheRef.current?.userRef !== user) {
      pageMountCacheRef.current = null;
    }
  }, [user]);

  useEffect(() => {
    if (scanPhase === "scanning") {
      setScanStage(0);
      const t1 = setTimeout(() => {
        setScanStage(1);
        const t2 = setTimeout(() => setScanStage(2), 5000);
        stageTimersRef.current.push(t2);
      }, 1000);
      stageTimersRef.current.push(t1);
    }
    return () => {
      stageTimersRef.current.forEach(clearTimeout);
      stageTimersRef.current = [];
    };
  }, [scanPhase]);

  const handlePageMount = useCallback(async ({ forceRefresh = false }: { forceRefresh?: boolean } = {}) => {
    const cached = pageMountCacheRef.current;
    const isCacheValid =
      !forceRefresh &&
      cached?.userRef === user &&
      Date.now() - cached.cachedAt < PAGE_MOUNT_CACHE_TTL_MS;

    if (isCacheValid && cached) {
      setScanQuotaReached(cached.scanQuotaReached);
      setScanQuotaResetDate(cached.scanQuotaResetDate);
      setIsFreePlan(cached.isFreePlan);
      setPageLoading(false);
      return;
    }

    if (pageMountInFlightRef.current) {
      await pageMountInFlightRef.current;
      return;
    }

    const loadPromise = (async () => {
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

      let nextScanQuotaReached = false;
      let nextScanQuotaResetDate: string | null = null;
      const nextIsFreePlan = profile.subscription_plan === "free";
      setIsFreePlan(nextIsFreePlan);

      if (nextIsFreePlan) {
        const { periodStart, nextPeriodStart } = getUserBillingPeriod(profile.created_at);

        const { count, error: countError } = await supabase
          .from("scans")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id)
          .gte("created_at", periodStart.toISOString())
          .lt("created_at", nextPeriodStart.toISOString());

        if (countError) {
          trackUserVisibleError("scan", "quota_check_failed", false);
          captureDataFetchError(countError, "scan", "fetch_quota", "critical");
          Alert.alert("Error", "There is an issue with your account. Please log out and try again.");
          return;
        }

        if (count !== null && count >= FREE_USER_SCAN_QUOTA) {
          nextScanQuotaReached = true;
          nextScanQuotaResetDate = nextPeriodStart.toLocaleDateString();
        }
      }

      setScanQuotaReached(nextScanQuotaReached);
      setScanQuotaResetDate(nextScanQuotaResetDate);
      pageMountCacheRef.current = {
        userRef: user,
        cachedAt: Date.now(),
        scanQuotaReached: nextScanQuotaReached,
        scanQuotaResetDate: nextScanQuotaResetDate,
        isFreePlan: nextIsFreePlan,
      };
    })();

    pageMountInFlightRef.current = loadPromise;
    try {
      await loadPromise;
    } finally {
      pageMountInFlightRef.current = null;
      setPageLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      handlePageMount();
    }
  }, [user, handlePageMount]);

  useFocusEffect(
    useCallback(() => {
      // Track feature discovery when scan tab is focused
      trackFeatureOpened("scan");
      if (user) {
        handlePageMount();
      }
    }, [user, handlePageMount])
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
    setScanFailureWarning(null);
    setExpandedDetections(new Set());
    hasTrackedResultView.current = false;

    setStageTexts([
      STAGE_OPTIONS.upload[0],
      pickRandom(STAGE_OPTIONS.analysis),
      pickRandom(STAGE_OPTIONS.research),
    ]);

    setScanPhase("scanning");
    trackScanStarted("screenshot", "upload");

    const imageB64 = await convertImageToB64(image.uri!);
    const scanStartTime = Date.now();

    try {
      const scanResults = await scanImage(imageB64);
      const processingTimeMs = Date.now() - scanStartTime;

      if (!scanResults.scan_successful) {
        const failureReason =
          scanResults.scan_failure_reason?.trim() ||
          "We couldn't analyze this image confidently. Try uploading a clearer screenshot.";

        setScanFailureWarning(failureReason);
        setResults(null);

        trackUserVisibleError("scan", "scan_unsuccessful", false);
        setScanPhase("complete");
        await checkQuotaAfterScan();
        return;
      }

      const resultCategory = getResultCategory(scanResults.is_scam, scanResults.risk_level);
      trackScanCompleted("screenshot", resultCategory, processingTimeMs);

      trackResultViewed(resultCategory);
      hasTrackedResultView.current = true;

      setResults(scanResults);
      setScanPhase("complete");
      await checkQuotaAfterScan();
      await promptReview(user.id);
    } catch (err) {
      trackUserVisibleError("scan", "scan_failed", true);

      if (err instanceof ScanError) {
        if (err.stage === "quota_exceeded") {
          handlePageMount({ forceRefresh: true });
          Alert.alert("Scan Limit Reached", "You've reached your monthly scan limit. Please upgrade or wait for your quota to reset.");
        } else if (err.stage === "auth") {
          Alert.alert("Sign in required", "Please sign in to scan images.");
        } else if (err.stage === "upload") {
          Alert.alert("Upload Failed", "We couldn't upload your image. Please check your connection and try again.");
        } else {
          Alert.alert("Scan Failed", "We couldn't complete your scan. Please try again later.");
        }
      } else {
        Alert.alert("Scan Failed", "Something went wrong while scanning your image. Please try again later.");
      }

      setScanPhase("idle");
    }
  }

  function resetScan() {
    setImage(null);
    setResults(null);
    setScanFailureWarning(null);
    setExpandedDetections(new Set());
    setScanPhase("idle");
    if (scanQuotaJustReached) {
      setScanQuotaJustReached(false);
      setScanQuotaReached(true);
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

    const selectedImage = result.assets[0];
    setImage(selectedImage);
    setScanFailureWarning(null);

    Image.getSize(selectedImage.uri!, (width, height) => {
      setAspectRatio(width / height);
    });

    const hasConsent = await checkDataSharingConsent();
    if (!hasConsent) {
      const agreed = await showDataSharingConsentPrompt();
      if (!agreed) {
        setImage(null);
      }
    }
  }

  async function checkDataSharingConsent(): Promise<boolean> {
    if (!user) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("data_sharing_consent")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      trackUserVisibleError("scan", "consent_check_failed", false);
      captureDataFetchError(error || new Error("No profile data"), "scan", "check_data_sharing_consent", "critical");
      Alert.alert("Error", "There was an issue checking your data sharing settings. Please try again.");
      return false;
    }

    return Boolean(data.data_sharing_consent);
  }

  async function showDataSharingConsentPrompt(): Promise<boolean> {
    if (!user) return false;

    return new Promise((resolve) => {
      Alert.alert(
        "Data Sharing Permission",
        "By using the scanning tool, you agree to allow Scamly to share images you upload, as well as your country data with OpenAI's GPT models for scan processing.",
        [
          {
            text: "Reject",
            style: "destructive",
            onPress: () => resolve(false),
          },
          {
            text: "Agree",
            onPress: async () => {
              const { error } = await supabase
                .from("profiles")
                .update({ data_sharing_consent: true })
                .eq("id", user.id);

              if (error) {
                trackUserVisibleError("scan", "consent_update_failed", false);
                captureDataFetchError(error, "scan", "update_data_sharing_consent", "critical");
                Alert.alert("Error", "We couldn't save your consent. Please try again.");
                resolve(false);
                return;
              }

              resolve(true);
            },
          },
        ],
        { cancelable: false }
      );
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

  const handleOpenPaywall = async () => {
    if (openingPaywall) return;

    setOpeningPaywall(true);
    try {
      const { didUnlockEntitlement } = await presentScamlyPaywallIfNeeded(undefined, {
        trigger: "scan_premium_upsell",
      });
      if (didUnlockEntitlement) {
        setIsFreePlan(false);
        const cached = pageMountCacheRef.current;
        if (cached?.userRef === user) {
          pageMountCacheRef.current = { ...cached, isFreePlan: false };
        }
        void handlePageMount({ forceRefresh: true });
        router.push("/subscription-success");
      }
    } catch (error) {
      const message = trackRevenueCatError("present_paywall_scan", error);
      Alert.alert("Subscription unavailable", message);
    } finally {
      setOpeningPaywall(false);
    }
  };

  return (
    <>
    <ShortcutSetupModal
      visible={showShortcutSetup}
      onClose={() => setShowShortcutSetup(false)}
      entry="scan_tab"
    />
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

              {/* Idle Phase: Upload Card + Scan Button */}
              {scanPhase === "idle" && (
                <Animated.View
                  entering={FadeInDown.duration(400).delay(100)}
                  exiting={FadeOut.duration(250)}
                >
                  <Card style={styles.uploadCard} pressable={false}>
                    {Platform.OS === "ios" && (
                      <View style={styles.topActionsRow}>
                        {!isFreePlan && (
                          <TouchableOpacity
                            style={styles.addShortcutButton}
                            onPress={() => setShowShortcutSetup(true)}
                          >
                            <Text style={[styles.howToUseText, { color: colors.accent }]}>
                              Enable Quick Scan
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
               

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
                            setScanFailureWarning(null);
                            if (scanQuotaJustReached) {
                              setScanQuotaJustReached(false);
                              setScanQuotaReached(true);
                            }
                          }}
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

                  <View style={styles.scanButtonContainer}>
                    <Button
                      onPress={handleScan}
                      disabled={scanButtonDisabled}
                      fullWidth
                      size="lg"
                    >
                      Scan
                    </Button>
                  </View>
                </Animated.View>
              )}

              {/* Scanning / Complete Phase: Compact Header */}
              {(scanPhase === "scanning" || scanPhase === "complete") && image && (
                <Animated.View
                  entering={FadeIn.duration(350).delay(150)}
                  style={styles.scanningContainer}
                >
                  <View style={styles.scanningHeader}>
                    <Image
                      source={{ uri: image.uri }}
                      style={[
                        styles.thumbnailImage,
                        {
                          borderRadius: radius.md,
                          backgroundColor: colors.backgroundSecondary,
                        },
                      ]}
                    />
                    <View style={styles.scanningTextContainer}>
                      {scanPhase === "scanning" && (
                        <View>
                          <View style={{ marginBottom: 6 }}>
                            {scanStage === 0 ? (
                              <ShimmerText
                                size="sm"
                                bold={false}
                                duration={1.4}
                                containerStyle={{ alignItems: "flex-start" }}
                                style={{ fontFamily: "Poppins-Medium", textAlign: "left" }}
                                colors={{
                                  light: {
                                    text: colors.textSecondary,
                                    shimmer: {
                                      start: colors.textSecondary,
                                      middle: colors.accentMuted,
                                      end: colors.textSecondary,
                                    },
                                  },
                                  dark: {
                                    text: colors.textSecondary,
                                    shimmer: {
                                      start: colors.textSecondary,
                                      middle: colors.accentMuted,
                                      end: colors.textSecondary,
                                    },
                                  },
                                }}
                              >
                                {stageTexts[0]}
                              </ShimmerText>
                            ) : (
                              <Text style={[styles.scanningStageText, { color: colors.textPrimary }]}>
                                {stageTexts[0]}
                              </Text>
                            )}
                          </View>

                          {scanStage >= 1 && (
                            <View style={{ marginBottom: 6 }}>
                              {scanStage === 1 ? (
                                <ShimmerText
                                  size="sm"
                                  bold={false}
                                  duration={1.4}
                                  containerStyle={{ alignItems: "flex-start" }}
                                  style={{ fontFamily: "Poppins-Medium", textAlign: "left" }}
                                  colors={{
                                    light: {
                                      text: colors.textSecondary,
                                      shimmer: {
                                        start: colors.textSecondary,
                                        middle: colors.accentMuted,
                                        end: colors.textSecondary,
                                      },
                                    },
                                    dark: {
                                      text: colors.textSecondary,
                                      shimmer: {
                                        start: colors.textSecondary,
                                        middle: colors.accentMuted,
                                        end: colors.textSecondary,
                                      },
                                    },
                                  }}
                                >
                                  {stageTexts[1]}
                                </ShimmerText>
                              ) : (
                                <Text style={[styles.scanningStageText, { color: colors.textPrimary }]}>
                                  {stageTexts[1]}
                                </Text>
                              )}
                            </View>
                          )}

                          {scanStage >= 2 && (
                            <View style={{ marginBottom: 6 }}>
                              <ShimmerText
                                size="sm"
                                bold={false}
                                duration={1.4}
                                containerStyle={{ alignItems: "flex-start" }}
                                style={{ fontFamily: "Poppins-Medium", textAlign: "left" }}
                                colors={{
                                  light: {
                                    text: colors.textSecondary,
                                    shimmer: {
                                      start: colors.textSecondary,
                                      middle: colors.accentMuted,
                                      end: colors.textSecondary,
                                    },
                                  },
                                  dark: {
                                    text: colors.textSecondary,
                                    shimmer: {
                                      start: colors.textSecondary,
                                      middle: colors.accentMuted,
                                      end: colors.textSecondary,
                                    },
                                  },
                                }}
                              >
                                {stageTexts[2]}
                              </ShimmerText>
                            </View>
                          )}
                        </View>
                      )}

                      {scanPhase === "complete" && (
                        <Animated.View entering={FadeIn.duration(300)}>
                          <Text
                            style={[
                              styles.scanCompleteText,
                              { color: colors.textPrimary },
                            ]}
                          >
                            Scan Complete
                          </Text>
                          <View style={styles.scanCompleteActions}>
                            <Button
                              variant="secondary"
                              size="sm"
                              onPress={resetScan}
                            >
                              Clear Results
                            </Button>
                            <Button
                              variant="primary"
                              size="sm"
                              onPress={handleScan}
                            >
                              Rescan
                            </Button>
                          </View>
                        </Animated.View>
                      )}
                    </View>
                  </View>
                </Animated.View>
              )}

              {/* Scan Failure Warning */}
              {scanFailureWarning && scanPhase === "complete" && (
                <Animated.View entering={FadeIn.duration(300)}>
                  <Card
                    style={[styles.scanFailureCard, { backgroundColor: colors.warningMuted }]}
                    pressable={false}
                  >
                    <View style={styles.scanFailureHeader}>
                      <TriangleAlert size={20} color={colors.warning} />
                      <Text style={[styles.scanFailureTitle, { color: colors.warning }]}>
                        We couldn&apos;t complete this scan
                      </Text>
                    </View>
                    <Text style={[styles.scanFailureReason, { color: colors.textPrimary }]}>
                      {scanFailureWarning}
                    </Text>
                  </Card>
                </Animated.View>
              )}

              {results && scanPhase === "complete" && (
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
                      {results.detections.map((detection, index) => {
                        const isExpanded = expandedDetections.has(index);
                        return (
                          <View
                            key={index}
                            style={[
                              styles.detectionWrapper,
                              { backgroundColor: colors.backgroundSecondary, borderRadius: radius.lg },
                            ]}
                          >
                            <TouchableOpacity
                              style={[
                                styles.detectionItem,
                                { backgroundColor: colors.backgroundSecondary },
                              ]}
                              onPress={() => {
                                setExpandedDetections((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(index)) next.delete(index);
                                  else next.add(index);
                                  return next;
                                });
                              }}
                              activeOpacity={0.7}
                            >
                              {getSeverityIcon(detection.severity)}
                              <Text
                                style={[styles.detectionDescription, { color: colors.textPrimary }]}
                                numberOfLines={isExpanded ? undefined : 1}
                              >
                                {detection.description}
                              </Text>
                              
                              {isExpanded ? (
                                <ChevronUp size={20} color={colors.textSecondary} />
                              ) : (
                                <ChevronDown size={20} color={colors.textSecondary} />
                              )}
                            </TouchableOpacity>
                            {isExpanded && (
                              <View
                                style={[
                                  styles.detectionDetailsContainer,
                                  { borderTopColor: colors.border },
                                ]}
                              >
                                <Text
                                  style={[styles.detectionDetailsText, { color: colors.textSecondary }]}
                                >
                                  {detection.details}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })}
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

              {(isFreePlan && scanPhase === "idle") && (
                <Animated.View entering={FadeInDown.duration(350)}>
                  <Card style={styles.premiumUpsellCard} pressable={false}>
                    <Text style={[styles.premiumUpsellTitle, { color: colors.textPrimary }]} selectable>
                      Get more accurate scanning.
                    </Text>
                    <Text style={[styles.premiumUpsellSubtitle, { color: colors.textSecondary }]} selectable>
                      Premium users get:
                    </Text>
                    <View style={styles.premiumBenefitsList}>
                      {SCAN_PREMIUM_UPSELL_BULLETS.map((line) => (
                        <View key={line} style={styles.premiumBenefitItem}>
                          <View
                            style={[
                              styles.premiumBenefitCheckWrap,
                              {
                                backgroundColor: colors.accentMuted,
                                borderCurve: "continuous" as const,
                              },
                            ]}
                          >
                            <Check size={14} color={colors.accent} strokeWidth={2.5} />
                          </View>
                          <Text style={[styles.premiumBenefitText, { color: colors.textSecondary }]} selectable>
                            {line}
                          </Text>
                        </View>
                      ))}
                    </View>
                    <Button onPress={handleOpenPaywall} loading={openingPaywall} fullWidth>
                      Get Protected
                    </Button>
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
      </SafeAreaView>
    </ThemedBackground>
    </>
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
  topActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  addShortcutButton: {
    flexDirection: "row",
    alignItems: "center",
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
  premiumUpsellCard: {
    padding: 24,
    gap: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  premiumUpsellTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 24,
    lineHeight: 32,
    letterSpacing: -0.3,
  },
  premiumUpsellSubtitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 15,
    lineHeight: 22,
  },
  premiumBenefitsList: {
    gap: 12,
    marginBottom: 2,
  },
  premiumBenefitItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  premiumBenefitCheckWrap: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  premiumBenefitText: {
    flex: 1,
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    lineHeight: 21,
  },
  scanFailureCard: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "transparent",
  },
  scanFailureHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  scanFailureTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
  },
  scanFailureReason: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 20,
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
  detectionWrapper: {
    overflow: "hidden",
  },
  detectionItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
  },
  detectionDescription: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
    flex: 1,
    lineHeight: 20,
  },
  detectionSeverityBadge: {
    marginRight: 4,
  },
  detectionSeverityText: {
    fontFamily: "Poppins-Medium",
    fontSize: 12,
    textTransform: "capitalize",
  },
  detectionDetailsContainer: {
    paddingVertical: 12,
    paddingLeft: 46,
    paddingRight: 14,
    borderTopWidth: 1,
  },
  detectionDetailsText: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
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
  scanningContainer: {
    marginBottom: 24,
  },
  scanningHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  thumbnailImage: {
    width: 56,
    height: 74,
  },
  scanningTextContainer: {
    flex: 1,
    paddingTop: 2,
  },
  scanningStageText: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  scanCompleteText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    marginBottom: 10,
  },
  scanCompleteActions: {
    flexDirection: "row",
    gap: 10,
  },
});
