import Button from "@/components/Button";
import Card from "@/components/Card";
import ShimmerText from "@/components/ShimmerText";
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
import { promptReview } from "@/utils/review";
import { captureDataFetchError } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import { ScanResult } from "@/utils/types";
import { useFocusEffect } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import { router } from "expo-router";
import {
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Shield,
  ShieldCheck,
  TriangleAlert,
  X,
  XCircle,
} from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type ScanPhase = "idle" | "scanning" | "complete";

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

function getResultCategory(isScam: boolean, riskLevel: string): ResultCategory {
  if (isScam && riskLevel === "high") return "scam";
  if (isScam && riskLevel === "medium") return "likely_scam";
  if (!isScam && riskLevel === "low") return "safe";
  return "unsure";
}

export default function ClipboardScan() {
  const { colors, radius, isDark } = useTheme();
  const { user } = useAuth();

  const [scanPhase, setScanPhase] = useState<ScanPhase>("idle");
  const [scanStage, setScanStage] = useState<number>(0);
  const [stageTexts, setStageTexts] = useState<string[]>(["", "", ""]);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [results, setResults] = useState<ScanResult | null>(null);
  const [scanFailureWarning, setScanFailureWarning] = useState<string | null>(null);
  const [expandedDetections, setExpandedDetections] = useState<Set<number>>(new Set());

  const hasTrackedResultView = useRef<boolean>(false);
  const stageTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const scanInFlightRef = useRef<boolean>(false);

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
      setStageTexts([
        STAGE_OPTIONS.upload[0],
        pickRandom(STAGE_OPTIONS.analysis),
        pickRandom(STAGE_OPTIONS.research),
      ]);
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

      const resultCategory = getResultCategory(scanResults.is_scam, scanResults.risk_level);
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

  useFocusEffect(
    useCallback(() => {
      trackFeatureOpened("scan");
      startClipboardScan();
    }, [startClipboardScan])
  );

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
        return <ShieldCheck size={20} color={colors.success} />;
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
      default:
        return "Scan Result";
    }
  }

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
              <View style={styles.scanningHeader}>
                <Image
                  source={{ uri: imageUri }}
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
                    <Animated.View entering={FadeIn.duration(250)}>
                      <Text style={[styles.scanCompleteText, { color: colors.textPrimary }]}>
                        Scan Complete
                      </Text>
                      <View style={styles.scanCompleteActions}>
                        <Button variant="primary" size="sm" onPress={startClipboardScan}>
                          Try again
                        </Button>
                      </View>
                    </Animated.View>
                  )}
                </View>
              </View>
            </Animated.View>
          )}

          {scanFailureWarning && scanPhase === "complete" && (
            <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(200)}>
              <Card style={[styles.scanFailureCard, { backgroundColor: colors.warningMuted }]} pressable={false}>
                <View style={styles.scanFailureHeader}>
                  <TriangleAlert size={20} color={colors.warning} />
                  <Text style={[styles.scanFailureTitle, { color: colors.warning }]}>
                    We couldn&apos;t complete this scan
                  </Text>
                </View>
                <Text style={[styles.scanFailureReason, { color: colors.textPrimary }]}>
                  {scanFailureWarning}
                </Text>
                {!imageUri && (
                  <View style={styles.emptyClipboardRetry}>
                    <Button variant="primary" size="sm" onPress={startClipboardScan}>
                      Try again
                    </Button>
                  </View>
                )}
              </Card>
            </Animated.View>
          )}

          {results && scanPhase === "complete" && (
            <Animated.View entering={FadeIn.duration(300)}>
              <Card
                style={[
                  styles.resultCard,
                  {
                    backgroundColor: getRiskBgColor(results.risk_level),
                  },
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
                    <Text style={[styles.resultTitle, { color: getRiskColor(results.risk_level) }]}>
                      {getResultTitle(results.risk_level)}
                    </Text>
                  </View>
                  <Text style={[styles.confidenceText, { color: getRiskColor(results.risk_level) }]}>
                    {results.confidence}%
                  </Text>
                </View>
                <View style={styles.resultDetails}>
                  <Text style={[styles.riskLevelText, { color: colors.textSecondary }]}>
                    {results.risk_level.charAt(0).toUpperCase() + results.risk_level.slice(1)} risk detected
                  </Text>
                  <Text style={[styles.confidenceLabel, { color: colors.textSecondary }]}>Confidence</Text>
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

              <Card style={styles.detectionsCard} pressable={false}>
                <Text style={[styles.detectionsTitle, { color: colors.textPrimary }]}>Key Detections</Text>
                <View style={styles.detectionsList}>
                  {results.detections.map((detection, index) => {
                    const isExpanded = expandedDetections.has(index);
                    return (
                      <View
                        key={index}
                        style={[
                          styles.detectionWrapper,
                          {
                            backgroundColor: colors.backgroundSecondary,
                            borderRadius: radius.lg,
                          },
                        ]}
                      >
                        <Pressable
                          style={[styles.detectionItem, { backgroundColor: colors.backgroundSecondary }]}
                          onPress={() => {
                            setExpandedDetections((prev) => {
                              const next = new Set(prev);
                              if (next.has(index)) next.delete(index);
                              else next.add(index);
                              return next;
                            });
                          }}
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
                        </Pressable>
                        {isExpanded && (
                          <View
                            style={[
                              styles.detectionDetailsContainer,
                              {
                                borderTopColor: colors.border,
                              },
                            ]}
                          >
                            <Text style={[styles.detectionDetailsText, { color: colors.textSecondary }]}>
                              {detection.details}
                            </Text>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              </Card>

              <Card style={[styles.tipsCard, { backgroundColor: colors.accentMuted }]} pressable={false}>
                <View style={styles.tipsHeader}>
                  <Shield size={20} color={colors.accent} />
                  <Text style={[styles.tipsTitle, { color: colors.textPrimary }]}>Stay Safe</Text>
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
                      <Text style={[styles.tipText, { color: colors.textSecondary }]}>{tip}</Text>
                    </View>
                  ))}
                </View>
              </Card>
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
  emptyClipboardRetry: {
    marginTop: 14,
    alignItems: "flex-start",
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
});
