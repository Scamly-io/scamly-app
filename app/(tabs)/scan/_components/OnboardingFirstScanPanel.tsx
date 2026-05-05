import Button from "@/components/Button";
import ScanDetectionsCard from "./ScanDetectionsCard";
import ScanDisclaimer from "./ScanDisclaimer";
import ScanFailureCard from "./ScanFailureCard";
import ScanningProgressPanel from "./ScanningProgressPanel";
import ScanResultSummaryCard from "./ScanResultSummaryCard";
import ScanUploadCard from "./ScanUploadCard";
import { useTheme } from "@/theme";
import { ScanError, scanImage } from "@/utils/ai/scan";
import {
  trackResultViewed,
  trackScanCompleted,
  trackScanStarted,
  trackUserVisibleError,
} from "@/utils/shared/analytics";
import { captureDataFetchError, captureError } from "@/utils/shared/sentry";
import { supabase } from "@/utils/shared/supabase";
import type { ScanResult } from "@/utils/shared/types";
import * as ImagePicker from "expo-image-picker";
import { ChevronDown } from "lucide-react-native";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Alert, Image, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

export type FirstOnboardingScanPhase = "idle" | "scanning" | "complete";

/**
 * Resize/compress a picked image to a JPEG base64 payload suitable for {@link scanImage}.
 */
async function convertPickerUriToJpegBase64(imageUri: string): Promise<string | undefined> {
  const ImageManipulator = await import("expo-image-manipulator");
  const result = await ImageManipulator.manipulateAsync(
    imageUri,
    [{ resize: { height: 1024 } }],
    { compress: 0.7, base64: true, format: ImageManipulator.SaveFormat.JPEG }
  );
  return result.base64 ?? undefined;
}

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
 * Stage lines for onboarding first scan: random copy from each pool.
 */
function onboardingScanStageTexts(): [string, string, string] {
  return [
    pickRandomScanLine(SCAN_STAGE_OPTIONS.upload),
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
 * Onboarding first scan: same upload/progress/results UX as the Scan tab but omits “Stay Safe” tips.
 */
const OnboardingFirstScanPanel = forwardRef<FirstOnboardingScanPanelHandle, Props>(
  function OnboardingFirstScanPanel({ userId, onContinueAfterSuccess, onTutorialScanPhaseChange }, ref) {
    const { colors } = useTheme();
    const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
    const [phase, setPhase] = useState<FirstOnboardingScanPhase>("idle");
    const phaseRef = useRef<FirstOnboardingScanPhase>("idle");
    phaseRef.current = phase;
    const [results, setResults] = useState<ScanResult | null>(null);
    const [failureWarning, setFailureWarning] = useState<string | null>(null);
    const [aspectRatio, setAspectRatio] = useState(1);
    const [scanStage, setScanStage] = useState(0);
    const [stageTexts, setStageTexts] = useState<[string, string, string]>(["", "", ""]);
    const [expandedDetections, setExpandedDetections] = useState<Set<number>>(new Set());
    const hasTrackedView = useRef(false);
    const stageTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const completeHintStyles = useMemo(
      () =>
        StyleSheet.create({
          scanCompleteText: {
            fontFamily: "Poppins-SemiBold",
            fontSize: 16,
            marginBottom: 8,
            color: colors.textPrimary,
          },
          viewResultsHint: {
            flexDirection: "row",
            alignItems: "center",
            gap: 6,
          },
          viewResultsText: {
            fontFamily: "Poppins-Medium",
            fontSize: 14,
            color: colors.textSecondary,
          },
          scanButtonContainer: {
            marginBottom: 16,
          },
        }),
      [colors]
    );

    useEffect(() => {
      hasTrackedView.current = false;
    }, [results?.risk_level, results?.is_scam]);

    useEffect(() => {
      onTutorialScanPhaseChange?.(phase);
    }, [phase, onTutorialScanPhaseChange]);

    const onContinue = useCallback(() => {
      if (results) {
        const c = getScanResultCategory(results.is_scam, results.risk_level);
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
      [onContinue]
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
                const { error } = await supabase.from("profiles").update({ data_sharing_consent: true }).eq("id", userId);
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
      setStageTexts(onboardingScanStageTexts());
      setPhase("scanning");
      trackScanStarted("image", "upload");

      const start = Date.now();
      try {
        const b64 = await convertPickerUriToJpegBase64(image.uri);
        if (!b64) {
          throw new Error("Image encoding failed");
        }
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

        const resultCategory = getScanResultCategory(scanResults.is_scam, scanResults.risk_level);
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
    }, [image?.uri]);

    const toggleDetection = useCallback((index: number) => {
      setExpandedDetections((prev) => {
        const next = new Set(prev);
        if (next.has(index)) next.delete(index);
        else next.add(index);
        return next;
      });
    }, []);

    return (
      <ScrollView
        contentContainerStyle={scrollStyles.scrollContent}
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
      >
        {phase === "idle" && (
          <>
            <ScanUploadCard
              imageUri={image?.uri ?? null}
              aspectRatio={aspectRatio}
              onPickImage={pickImage}
              onClear={resetScan}
            />
            <View style={completeHintStyles.scanButtonContainer}>
              <Button onPress={runScan} disabled={!image} fullWidth size="lg">
                Scan
              </Button>
            </View>
          </>
        )}

        {(phase === "scanning" || (phase === "complete" && image)) && (
          <View style={scrollStyles.scanningContainer}>
            <ScanningProgressPanel
              thumbnailUri={image!.uri}
              scanPhase={phase === "scanning" ? "scanning" : "complete"}
              scanStage={scanStage}
              stageTexts={stageTexts}
              completeSlot={
                <Animated.View entering={FadeIn.duration(300)}>
                  <Text style={completeHintStyles.scanCompleteText}>Scan Complete</Text>
                  <View style={completeHintStyles.viewResultsHint}>
                    <Text style={completeHintStyles.viewResultsText}>View Results</Text>
                    <ChevronDown size={16} color={colors.textSecondary} />
                  </View>
                </Animated.View>
              }
            />
          </View>
        )}

        {failureWarning && phase === "complete" && (
          <Animated.View entering={FadeIn.duration(300)}>
            <ScanFailureCard message={failureWarning} />
          </Animated.View>
        )}

        {results && phase === "complete" && results.scan_successful && (
          <Animated.View entering={FadeIn.duration(400)}>
            <ScanResultSummaryCard result={results} />
            <ScanDetectionsCard
              detections={results.detections}
              expandedDetections={expandedDetections}
              onToggleExpanded={toggleDetection}
            />
            <ScanDisclaimer />
          </Animated.View>
        )}
      </ScrollView>
    );
  }
);

const scrollStyles = StyleSheet.create({
  scrollContent: {
    paddingBottom: 32,
    gap: 0,
  },
  scanningContainer: {
    marginBottom: 8,
  },
});

export default OnboardingFirstScanPanel;
