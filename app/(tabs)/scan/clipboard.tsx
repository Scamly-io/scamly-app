import Button from "@/components/Button";
import ScanDetectionsCard from "./_components/ScanDetectionsCard";
import ScanFailureCard from "./_components/ScanFailureCard";
import ScanningProgressPanel from "./_components/ScanningProgressPanel";
import ScanResultSummaryCard from "./_components/ScanResultSummaryCard";
import ScanStaySafeTipsCard from "./_components/ScanStaySafeTipsCard";
import ThemedBackground from "@/components/ThemedBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useIsDark, useTheme } from "@/theme";
import { getIsPremium } from "@/utils/shared/access";
import { ScanError, scanImage } from "@/utils/ai/scan";
import {
  trackFeatureOpened,
  trackResultViewed,
  trackScanCompleted,
  trackScanStarted,
  trackUserVisibleError,
} from "@/utils/shared/analytics";
import { promptReview } from "@/utils/shared/review";
import { captureDataFetchError } from "@/utils/shared/sentry";
import { supabase } from "@/utils/shared/supabase";
import { ScanResult } from "@/utils/shared/types";
import { useFocusEffect } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { router, useIsFocused } from "expo-router";
import { X } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type ScanPhase = "idle" | "scanning" | "complete";

/**
 * Stage copy shown while scanning (upload → analysis → research).
 */
const SCAN_STAGE_OPTIONS = {
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
} as const;

/** Choose a random entry from the stage pool (uniform distribution). */
function pickRandomScanLine<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

/**
 * Stage lines for Clipboard scan: fixed upload copy, random analysis/research.
 */
function tabClipboardScanStageTexts(): [string, string, string] {
  return [
    SCAN_STAGE_OPTIONS.upload[0],
    pickRandomScanLine(SCAN_STAGE_OPTIONS.analysis),
    pickRandomScanLine(SCAN_STAGE_OPTIONS.research),
  ];
}

/**
 * Maps AI scan output to the analytics `ResultCategory` bucket used by PostHog.
 */
function getScanResultCategory(isScam: boolean, riskLevel: string) {
  if (isScam && riskLevel === "high") return "scam" as const;
  if (isScam && riskLevel === "medium") return "likely_scam" as const;
  if (!isScam && riskLevel === "low") return "safe" as const;
  return "unsure" as const;
}

export default function ClipboardScan() {
  const { colors } = useTheme();
  const isDark = useIsDark();
  const { user } = useAuth();

  const [scanPhase, setScanPhase] = useState<ScanPhase>("idle");
  const [scanStage, setScanStage] = useState<number>(0);
  const [stageTexts, setStageTexts] = useState<[string, string, string]>(["", "", ""]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [results, setResults] = useState<ScanResult | null>(null);
  const [scanFailureWarning, setScanFailureWarning] = useState<string | null>(null);
  const [expandedDetections, setExpandedDetections] = useState<Set<number>>(new Set());

  const hasTrackedResultView = useRef<boolean>(false);
  const stageTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scanInFlightRef = useRef<boolean>(false);

  const [premiumAccess, setPremiumAccess] = useState<boolean | null>(null);
  const isFocused = useIsFocused();

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setPremiumAccess(null);
      const checkAccess = async () => {
        const premium = await getIsPremium();
        if (!active) return;
        setPremiumAccess(premium);
        if (!premium) {
          Alert.alert(
            "Premium Required",
            "Quick Scan is only available to Scamly Premium subscribers. Upgrade to unlock instant scanning.",
            [
              {
                text: "OK",
                onPress: () => {
                  router.replace("/scan");
                },
              },
            ]
          );
        }
      };
      checkAccess();
      return () => {
        active = false;
      };
    }, [])
  );

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

  async function checkDataSharingConsent(): Promise<boolean> {
    if (!user) return false;

    const { data, error } = await supabase
      .from("profiles")
      .select("data_sharing_consent")
      .eq("id", user.id)
      .single();

    if (error || !data) {
      trackUserVisibleError("scan", "consent_check_failed", false);
      captureDataFetchError(
        error || new Error("No profile data"),
        "scan",
        "check_data_sharing_consent",
        "critical"
      );
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
        "By using the scanning tool, you agree to allow Scamly to share clipboard images, as well as your country data with OpenAI's GPT models for scan processing.",
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

  const startClipboardScan = useCallback(async () => {
    if (!user || scanInFlightRef.current) return;

    scanInFlightRef.current = true;
    try {
      setResults(null);
      setScanFailureWarning(null);
      setExpandedDetections(new Set());
      hasTrackedResultView.current = false;

      const hasImage = await Clipboard.hasImageAsync();
      if (!hasImage) {
        setImageUri(null);
        setScanFailureWarning("No image found in your clipboard. Copy an image and tap Try again.");
        setScanPhase("complete");
        return;
      }

      const clipboardImage = await Clipboard.getImageAsync({ format: "jpeg" });
      if (!clipboardImage?.data) {
        setImageUri(null);
        setScanFailureWarning("No readable image found in your clipboard. Copy an image and try again.");
        setScanPhase("complete");
        return;
      }

      const hasConsent = await checkDataSharingConsent();
      if (!hasConsent) {
        const agreed = await showDataSharingConsentPrompt();
        if (!agreed) {
          setImageUri(null);
          setScanFailureWarning("We need data sharing permission before we can scan clipboard images.");
          setScanPhase("complete");
          return;
        }
      }

      setImageUri(clipboardImage.data);
      const imageb64 = clipboardImage.data.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, "");
      setStageTexts(tabClipboardScanStageTexts());
      setScanPhase("scanning");
      trackScanStarted("screenshot", "upload");

      const scanStartTime = Date.now();
      const scanResults = await scanImage(imageb64);
      const processingTimeMs = Date.now() - scanStartTime;

      if (!scanResults.scan_successful) {
        const failureReason =
          scanResults.scan_failure_reason?.trim() ||
          "We couldn't analyze this image confidently. Try copying a clearer screenshot.";
        setScanFailureWarning(failureReason);
        setResults(null);
        trackUserVisibleError("scan", "scan_unsuccessful", false);
        setScanPhase("complete");
        return;
      }

      const resultCategory = getScanResultCategory(scanResults.is_scam, scanResults.risk_level);
      trackScanCompleted("screenshot", resultCategory, processingTimeMs);
      trackResultViewed(resultCategory);
      hasTrackedResultView.current = true;
      setResults(scanResults);
      setScanPhase("complete");
      await promptReview(user.id);
    } catch (err) {
      trackUserVisibleError("scan", "scan_failed", true);

      if (err instanceof ScanError) {
        if (err.stage === "quota_exceeded") {
          Alert.alert(
            "Scan Limit Reached",
            "You've reached your monthly scan limit. Please upgrade or wait for your quota to reset."
          );
        } else if (err.stage === "auth") {
          Alert.alert("Sign in required", "Please sign in to scan images.");
        } else if (err.stage === "upload") {
          Alert.alert(
            "Upload Failed",
            "We couldn't upload your clipboard image. Please check your connection and try again."
          );
        } else {
          Alert.alert("Scan Failed", "We couldn't complete your scan. Please try again later.");
        }
      } else {
        Alert.alert("Scan Failed", "Something went wrong while scanning your image. Please try again later.");
      }

      setScanPhase("complete");
      setScanFailureWarning("We couldn't complete this scan. Please try again.");
    } finally {
      scanInFlightRef.current = false;
    }
  }, [user]);

  useEffect(() => {
    if (!isFocused || premiumAccess !== true) return;
    trackFeatureOpened("scan");
    startClipboardScan();
  }, [isFocused, premiumAccess, startClipboardScan]);

  return (
    <ThemedBackground>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={styles.topRow}>
          <View style={styles.topSpacer} />
          <Pressable
            onPress={() => router.replace("/scan")}
            hitSlop={8}
            style={[
              styles.closeButton,
              {
                backgroundColor: isDark ? colors.accentMuted : colors.surface,
              },
            ]}
          >
            <X size={20} color={colors.textPrimary} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {(scanPhase === "scanning" || scanPhase === "complete") && imageUri && (
            <Animated.View entering={FadeIn.duration(250)} style={styles.scanningContainer}>
              <ScanningProgressPanel
                thumbnailUri={imageUri}
                scanPhase={scanPhase === "scanning" ? "scanning" : "complete"}
                scanStage={scanStage}
                stageTexts={stageTexts}
                completeSlot={
                  <Animated.View entering={FadeIn.duration(250)}>
                    <Text style={[styles.scanCompleteText, { color: colors.textPrimary }]}>Scan Complete</Text>
                    <View style={styles.scanCompleteActions}>
                      <Button variant="primary" size="sm" onPress={startClipboardScan}>
                        Try again
                      </Button>
                    </View>
                  </Animated.View>
                }
              />
            </Animated.View>
          )}

          {scanFailureWarning && scanPhase === "complete" && (
            <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)}>
              <ScanFailureCard
                message={scanFailureWarning}
                footer={
                  !imageUri ? (
                    <View style={styles.emptyClipboardRetry}>
                      <Button variant="primary" size="sm" onPress={startClipboardScan}>
                        Try again
                      </Button>
                    </View>
                  ) : undefined
                }
              />
            </Animated.View>
          )}

          {results && scanPhase === "complete" && (
            <Animated.View entering={FadeIn.duration(300)}>
              <ScanResultSummaryCard result={results} unknownHeadlineFallback="Scan Result" />
              <ScanDetectionsCard
                detections={results.detections}
                expandedDetections={expandedDetections}
                onToggleExpanded={(index) => {
                  setExpandedDetections((prev) => {
                    const next = new Set(prev);
                    if (next.has(index)) next.delete(index);
                    else next.add(index);
                    return next;
                  });
                }}
                severityIconVariant="clipboard"
              />
              <ScanStaySafeTipsCard />
            </Animated.View>
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topRow: {
    paddingHorizontal: 20,
    paddingTop: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topSpacer: {
    width: 40,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 12,
    paddingBottom: 40,
  },
  scanningContainer: {
    marginBottom: 24,
  },
  scanCompleteText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    marginBottom: 10,
  },
  scanCompleteActions: {
    flexDirection: "row",
  },
  emptyClipboardRetry: {
    marginTop: 14,
    alignItems: "flex-start",
  },
});
