import Button from "@/components/Button";
import Card from "@/components/Card";
import ShimmerText from "@/components/ShimmerText";
import { useTheme } from "@/theme";
import { ScanError, scanImage } from "@/utils/ai/scan";
import {
  trackResultViewed,
  trackScanCompleted,
  trackScanStarted,
  trackUserVisibleError,
  type ResultCategory,
} from "@/utils/shared/analytics";
import { captureDataFetchError, captureError } from "@/utils/shared/sentry";
import { supabase } from "@/utils/shared/supabase";
import { ScanResult } from "@/utils/shared/types";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { CheckCircle, ChevronDown, ChevronUp, TriangleAlert, Upload, XCircle } from "lucide-react-native";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

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

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function getResultCategory(isScam: boolean, riskLevel: string): ResultCategory {
  if (isScam && riskLevel === "high") return "scam";
  if (isScam && riskLevel === "medium") return "likely_scam";
  if (!isScam && riskLevel === "low") return "safe";
  return "unsure";
}

export type FirstOnboardingScanPhase = "idle" | "scanning" | "complete";

export type FirstOnboardingScanPanelHandle = {
  /** Call from tutorial footer when the scan has finished (`phase === "complete"`). */
  finishTutorial: () => void;
};

type Props = {
  userId: string;
  onContinueAfterSuccess: () => void;
  /** Tutorial host: drive a footer button (e.g. disabled while idle/scanning). */
  onTutorialScanPhaseChange?: (phase: FirstOnboardingScanPhase) => void;
};

/**
 * Onboarding first scan: matches the main Scan tab UI (upload, scanning header, result + key detections)
 * but omits the post-scan "Stay Safe" tips card.
 */
const FirstOnboardingScanPanel = forwardRef<FirstOnboardingScanPanelHandle, Props>(function FirstOnboardingScanPanel(
  { userId, onContinueAfterSuccess, onTutorialScanPhaseChange },
  ref,
) {
  const { colors, radius, isDark } = useTheme();
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [phase, setPhase] = useState<FirstOnboardingScanPhase>("idle");
  const phaseRef = useRef<FirstOnboardingScanPhase>("idle");
  phaseRef.current = phase;
  const [results, setResults] = useState<ScanResult | null>(null);
  const [failureWarning, setFailureWarning] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState(1);
  const [scanStage, setScanStage] = useState(0);
  const [stageTexts, setStageTexts] = useState<string[]>(["", "", ""]);
  const [expandedDetections, setExpandedDetections] = useState<Set<number>>(new Set());
  const hasTrackedView = useRef(false);
  const stageTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    hasTrackedView.current = false;
  }, [results?.risk_level, results?.is_scam]);

  useEffect(() => {
    onTutorialScanPhaseChange?.(phase);
  }, [phase, onTutorialScanPhaseChange]);

  const onContinue = useCallback(() => {
    if (results) {
      const c = getResultCategory(results.is_scam, results.risk_level);
      if (!hasTrackedView.current) {
        trackResultViewed(c);
        hasTrackedView.current = true;
      }
    }
    onContinueAfterSuccess();
  }, [results, onContinueAfterSuccess]);

  useImperativeHandle(
    ref,
    () => ({
      finishTutorial: () => {
        if (phaseRef.current !== "complete") {
          return;
        }
        onContinue();
      },
    }),
    [onContinue],
  );

  useEffect(() => {
    if (phase === "scanning") {
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
  }, [phase]);

  const getRiskColor = (riskLevel: string) => {
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
  };

  const getRiskBgColor = (riskLevel: string) => {
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
  };

  const getSeverityIcon = (severity: string) => {
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
  };

  const getResultTitle = (riskLevel: string) => {
    switch (riskLevel) {
      case "low":
        return "Looks Safe";
      case "medium":
        return "Possibly a Scam";
      case "high":
        return "Likely a Scam";
      default:
        return "Result";
    }
  };

  const convertImageToB64 = useCallback(async (imageUri: string) => {
    const result = await ImageManipulator.manipulateAsync(
      imageUri,
      [{ resize: { height: 1024 } }],
      {
        compress: 0.7,
        base64: true,
        format: ImageManipulator.SaveFormat.JPEG,
      }
    );
    return result.base64;
  }, []);

  const checkDataSharingConsent = useCallback(async (): Promise<boolean> => {
    const { data, error } = await supabase
      .from("profiles")
      .select("data_sharing_consent")
      .eq("id", userId)
      .single();

    if (error || !data) {
      trackUserVisibleError("onboarding", "consent_check_failed", false);
      captureDataFetchError(
        error || new Error("No profile data"),
        "onboarding",
        "check_data_sharing_consent",
        "critical"
      );
      Alert.alert("Error", "There was an issue checking your data sharing settings. Please try again.");
      return false;
    }
    return Boolean(data.data_sharing_consent);
  }, [userId]);

  const showDataSharingPrompt = useCallback((): Promise<boolean> => {
    return new Promise((resolve) => {
      Alert.alert(
        "Data Sharing Permission",
        "By using the scanning tool, you agree to allow Scamly to share images you upload, as well as your country data with our analysis providers for scan processing.",
        [
          { text: "Reject", style: "destructive", onPress: () => resolve(false) },
          {
            text: "Agree",
            onPress: async () => {
              const { error } = await supabase
                .from("profiles")
                .update({ data_sharing_consent: true })
                .eq("id", userId);
              if (error) {
                trackUserVisibleError("onboarding", "consent_update_failed", false);
                captureDataFetchError(error, "onboarding", "update_data_sharing_consent", "critical");
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
  }, [userId]);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      trackUserVisibleError("onboarding", "photo_permission_denied", true);
      Alert.alert("Error", "We need permission to access your photos to upload an image for your first scan.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 1,
    });
    if (result.canceled) {
      return;
    }

    const selected = result.assets[0];
    setImage(selected);
    setFailureWarning(null);
    setResults(null);
    hasTrackedView.current = false;
    setPhase("idle");

    Image.getSize(selected.uri, (w, h) => setAspectRatio(w / h));

    const hasConsent = await checkDataSharingConsent();
    if (!hasConsent) {
      const ok = await showDataSharingPrompt();
      if (!ok) {
        setImage(null);
      }
    }
  }, [checkDataSharingConsent, showDataSharingPrompt]);

  const resetScan = useCallback(() => {
    setImage(null);
    setResults(null);
    setFailureWarning(null);
    setPhase("idle");
    setScanStage(0);
    hasTrackedView.current = false;
    setExpandedDetections(new Set());
  }, []);

  const runScan = useCallback(async () => {
    if (!image?.uri) {
      return;
    }

    setResults(null);
    setFailureWarning(null);
    hasTrackedView.current = false;
    setStageTexts([
      pickRandom(STAGE_OPTIONS.upload),
      pickRandom(STAGE_OPTIONS.analysis),
      pickRandom(STAGE_OPTIONS.research),
    ]);
    setPhase("scanning");
    trackScanStarted("image", "upload");

    const start = Date.now();
    try {
      const b64 = await convertImageToB64(image.uri!);
      const scanResults = await scanImage(b64);
      const ms = Date.now() - start;

      if (!scanResults.scan_successful) {
        setFailureWarning(
          scanResults.scan_failure_reason?.trim() ||
            "We couldn't analyze this image confidently. Try a clearer screenshot."
        );
        setResults(null);
        setPhase("complete");
        return;
      }

      const resultCategory = getResultCategory(scanResults.is_scam, scanResults.risk_level);
      trackScanCompleted("image", resultCategory, ms);
      setResults(scanResults);
      setPhase("complete");
    } catch (err) {
      trackUserVisibleError("onboarding", "scan_failed", true);
      if (err instanceof ScanError) {
        if (err.stage === "auth") {
          Alert.alert("Sign in required", "Please sign in to run a scan.");
        } else {
          Alert.alert("Scan failed", "We couldn't complete this scan. Please try again.");
        }
      } else {
        captureError(err, { feature: "onboarding", action: "first_scan", severity: "critical" });
        Alert.alert("Scan failed", "Something went wrong. Please try again later.");
      }
      setPhase("idle");
    }
  }, [convertImageToB64, image?.uri]);

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
    >
      {phase === "idle" && (
        <>
          <Card style={styles.uploadCard} pressable={false}>
            {image ? (
              <View style={styles.uploadedImageContainer}>
                <Image
                  source={{ uri: image.uri }}
                  style={[
                    styles.uploadedImage,
                    { aspectRatio, borderRadius: radius.lg },
                  ]}
                  resizeMode="contain"
                />
                <TouchableOpacity
                  onPress={resetScan}
                >
                  <Text style={[styles.clearButtonText, { color: colors.error }]}>Clear</Text>
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
                onPress={pickImage}
              >
                <View style={[styles.uploadIconContainer, { backgroundColor: colors.accentMuted }]}>
                  <Upload size={28} color={colors.accent} />
                </View>
                <Text style={[styles.uploadTitle, { color: colors.textPrimary }]}>Upload a Screenshot</Text>
                <Text style={[styles.uploadSubtitle, { color: colors.textSecondary }]}>
                  Tap to select an image
                </Text>
              </TouchableOpacity>
            )}
          </Card>
          <View style={styles.scanButtonContainer}>
            <Button
              onPress={runScan}
              disabled={!image}
              fullWidth
              size="lg"
            >
              Scan
            </Button>
          </View>
        </>
      )}

      {(phase === "scanning" || (phase === "complete" && image)) && (
        <View style={styles.scanningContainer}>
          <View style={styles.scanningHeader}>
            <Image
              source={{ uri: image!.uri }}
              style={[
                styles.thumbnailImage,
                { borderRadius: radius.md, backgroundColor: colors.backgroundSecondary },
              ]}
            />
            <View style={styles.scanningTextContainer}>
              {phase === "scanning" && (
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

              {phase === "complete" && (
                <Animated.View entering={FadeIn.duration(300)}>
                  <Text style={[styles.scanCompleteText, { color: colors.textPrimary }]}>Scan Complete</Text>
                  <View style={styles.viewResultsHint}>
                    <Text style={[styles.viewResultsText, { color: colors.textSecondary }]}>View Results</Text>
                    <ChevronDown size={16} color={colors.textSecondary} />
                  </View>
                </Animated.View>
              )}
            </View>
          </View>
        </View>
      )}

      {failureWarning && phase === "complete" && (
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
            <Text style={[styles.scanFailureReason, { color: colors.textPrimary }]}>{failureWarning}</Text>
          </Card>
        </Animated.View>
      )}

      {results && phase === "complete" && results.scan_successful && (
        <Animated.View entering={FadeIn.duration(400)}>
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
                      <View style={[styles.detectionDetailsContainer, { borderTopColor: colors.border }]}>
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

          <View style={styles.disclaimer}>
            <Text style={[styles.disclaimerTitle, { color: colors.textSecondary }]}>Disclaimer</Text>
            <Text style={[styles.disclaimerText, { color: colors.textTertiary }]}>
              This tool uses AI to analyze content for potential scams. Results are generated automatically and may
              not always reflect the full context. Always use your own judgment and verify through official sources.
            </Text>
          </View>
        </Animated.View>
      )}
    </ScrollView>
  );
});

export default FirstOnboardingScanPanel;

const styles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 32,
    gap: 0,
  },
  uploadCard: {
    marginBottom: 16,
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
  scanButtonContainer: {
    marginBottom: 16,
  },
  scanningContainer: {
    marginBottom: 8,
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
    marginBottom: 8,
  },
  viewResultsHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  viewResultsText: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
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
});
