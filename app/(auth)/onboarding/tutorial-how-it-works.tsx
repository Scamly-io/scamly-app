import ThemedBackground from "@/components/ThemedBackground";
import FirstOnboardingScanPanel, {
  type FirstOnboardingScanPanelHandle,
  type FirstOnboardingScanPhase,
} from "@/components/onboarding/first-onboarding-scan-panel";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import {
  getAuthenticationMethodForAnalytics,
  trackOnboardingStepViewed,
  trackOnboardingTutorialDismissed,
} from "@/utils/analytics";
import { onboardingHref } from "@/utils/onboarding-href";
import { completeOnboardingTutorialWithPaywall } from "@/utils/onboarding-tutorial-exit";
import {
  clearOnboardingTutorialStorage,
  getStoredOnboardingTutorialStep,
  setStoredOnboardingTutorialStep,
} from "@/utils/onboarding-tutorial-storage";
import { captureError } from "@/utils/sentry";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { ArrowLeft, Camera, ImageUp, Scan, Smartphone } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  PanResponder,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { SlideInLeft, SlideInRight, useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

const SUB_STEPS = 2;
const SLIDE_MS = 260;
const phoneIllustration = require("@/assets/images/page-images/scan-tutorial-diagram.png");

/**
 * In-app tutorial: (1) how to capture a screenshot, then (2) upload + first real scan.
 * Swipeable / progress UI aligned with `collect-profile` onboarding.
 */
export default function OnboardingTutorialHowItWorks() {
  const { colors, radius, shadows, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { user, checkOnboarding, refreshAuth } = useAuth();
  const router = useRouter();
  const { start: startParam } = useLocalSearchParams<{ start?: string }>();

  const [subStep, setSubStep] = useState(0);
  const subStepRef = useRef(0);
  useEffect(() => {
    subStepRef.current = subStep;
  }, [subStep]);
  const [loadDone, setLoadDone] = useState(false);
  const [exitLoading, setExitLoading] = useState(false);
  const [tutorialScanPhase, setTutorialScanPhase] = useState<FirstOnboardingScanPhase>("idle");
  const scanPanelRef = useRef<FirstOnboardingScanPanelHandle | null>(null);
  const navDir = useRef<"forward" | "back">("forward");
  const hasNavigated = useRef(false);
  const backScale = useSharedValue(1);
  const nextScale = useSharedValue(1);
  const backAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: backScale.value }] }));
  const nextAnimStyle = useAnimatedStyle(() => ({ transform: [{ scale: nextScale.value }] }));

  const authMethod = getAuthenticationMethodForAnalytics(user);

  // Resume: stored "first_scan" = user already saw screenshot step; open on upload/scan step.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const stored = await getStoredOnboardingTutorialStep();
      if (cancelled) {
        return;
      }
      if (stored === "first_scan" || startParam === "scan") {
        setSubStep(1);
      }
      setLoadDone(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [startParam]);

  useEffect(() => {
    if (!loadDone) {
      return;
    }
    const step = subStep === 0 ? "tutorial_screenshot" : "first_scan";
    trackOnboardingStepViewed(step, { auth_method: authMethod });
  }, [loadDone, subStep, authMethod]);

  useEffect(() => {
    if (subStep !== 1) {
      setTutorialScanPhase("idle");
    }
  }, [subStep]);

  // Match previous first-scan: persist so cold resume lands on the scan sub-step.
  useFocusEffect(
    useCallback(() => {
      if (subStep === 1) {
        void setStoredOnboardingTutorialStep("first_scan");
      }
    }, [subStep]),
  );

  const onContinueAfterScan = async () => {
    await setStoredOnboardingTutorialStep("celebration");
    router.push(onboardingHref("/onboarding/tutorial-celebration"));
  };

  const onSkip = async () => {
    if (!user) {
      return;
    }
    setExitLoading(true);
    try {
      const atStep = subStep === 0 ? "tutorial_screenshot" : "first_scan";
      trackOnboardingTutorialDismissed(atStep, { auth_method: authMethod });
      await completeOnboardingTutorialWithPaywall({ user, checkOnboarding, refreshAuth, router });
    } catch (e) {
      captureError(e, { feature: "onboarding", action: "skip_tutorial_how", severity: "critical" });
    } finally {
      setExitLoading(false);
    }
  };

  const goToScanSubStep = useCallback(() => {
    hasNavigated.current = true;
    navDir.current = "forward";
    void setStoredOnboardingTutorialStep("first_scan");
    setSubStep(1);
  }, []);

  const goToScreenshotSubStep = useCallback(() => {
    hasNavigated.current = true;
    navDir.current = "back";
    void clearOnboardingTutorialStorage();
    setSubStep(0);
  }, []);

  const goBack = useCallback(() => {
    if (subStep === 0) {
      router.replace(onboardingHref("/onboarding"));
      return;
    }
    goToScreenshotSubStep();
  }, [subStep, router, goToScreenshotSubStep]);

  const goNext = useCallback(() => {
    if (subStep === 0) {
      goToScanSubStep();
    }
  }, [subStep, goToScanSubStep]);

  const goNextRef = useRef(goNext);
  goNextRef.current = goNext;
  const goBackRef = useRef(goBack);
  goBackRef.current = goBack;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) =>
        Math.abs(gs.dx) > 12 && Math.abs(gs.dx) > Math.abs(gs.dy) * 2,
      onPanResponderRelease: (_, gs) => {
        if (gs.dx < -50) {
          if (subStepRef.current === 0) {
            goNextRef.current();
          }
        } else if (gs.dx > 50) {
          goBackRef.current();
        }
      },
    }),
  ).current;

  if (!user || !loadDone) {
    return null;
  }

  if (exitLoading) {
    return (
      <ThemedBackground>
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </ThemedBackground>
    );
  }

  const isForward = navDir.current === "forward";
  const entering = hasNavigated.current
    ? isForward
      ? SlideInRight.duration(SLIDE_MS)
      : SlideInLeft.duration(SLIDE_MS)
    : undefined;

  const glowShadow = `0px 4px 20px ${isDark ? "rgba(167, 139, 250, 0.5)" : "rgba(124, 92, 252, 0.4)"}`;
  const footerPadBottom = Math.max(insets.bottom, 10);

  return (
    <ThemedBackground>
      <SafeAreaView style={{ flex: 1, width: "100%" }} edges={["top", "left", "right"]}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "flex-end",
            paddingHorizontal: 20,
            paddingTop: 4,
            minHeight: 40,
          }}
        >
          <Pressable onPress={onSkip} hitSlop={8} accessibilityRole="button" accessibilityLabel="Skip tutorial">
            <Text style={{ color: colors.textSecondary, fontFamily: "Poppins-Medium" }}>Skip</Text>
          </Pressable>
        </View>

        {/* Progress (2 segments) */}
        <View style={styles.progressRow}>
          {Array.from({ length: SUB_STEPS }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.progressSegment,
                {
                  backgroundColor: i <= subStep ? colors.accent : colors.border,
                  opacity: i < subStep ? 0.5 : 1,
                },
              ]}
            />
          ))}
        </View>

        <View
          style={{ flex: 1, minHeight: 0, width: "100%", overflow: "hidden" }}
          {...panResponder.panHandlers}
          collapsable={false}
        >
          <Animated.View key={subStep} entering={entering} style={{ flex: 1, overflow: "visible" }}>
            {subStep === 0 ? (
              <ScrollView
                contentContainerStyle={styles.scrollContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <View
                  style={[
                    styles.heroIcon,
                    { backgroundColor: colors.accentMuted, borderRadius: radius.xl },
                  ]}
                >
                  <Camera size={28} color={colors.accent} />
                </View>
                <Text style={[styles.title, { color: colors.textPrimary }]} selectable>
                  Get a screenshot
                </Text>
                <Text style={[styles.subtitle, { color: colors.textSecondary }]} selectable>
                  Scamly reads what&apos;s on screen — a text, DM, or email that worried you. Grab a picture first, then
                  you&apos;ll upload it on the next step.
                </Text>

                <View style={[styles.illustrationCard, { borderRadius: radius["2xl"], backgroundColor: colors.surface, ...shadows.lg }]}>
                  <Image source={phoneIllustration} style={styles.illustration} resizeMode="contain" />
                </View>

                <View style={{ gap: 10 }}>
                  <Text style={[styles.howTitle, { color: colors.textPrimary }]}>How to screenshot</Text>
                  {Platform.OS === "ios" ? (
                    <View
                      style={[
                        styles.tipRow,
                        { backgroundColor: colors.backgroundSecondary, borderRadius: radius.lg, borderCurve: "continuous" },
                      ]}
                    >
                      <Smartphone size={20} color={colors.accent} />
                      <Text style={[styles.tipBody, { color: colors.textSecondary }]}>
                        On most iPhones: press the <Text style={{ fontFamily: "Poppins-SemiBold" }}>Side</Text> button
                        and <Text style={{ fontFamily: "Poppins-SemiBold" }}>Volume Up</Text> at the same time. The
                        thumbnail appears in the corner — you&apos;re ready for the next step.
                      </Text>
                    </View>
                  ) : (
                    <View
                      style={[
                        styles.tipRow,
                        { backgroundColor: colors.backgroundSecondary, borderRadius: radius.lg, borderCurve: "continuous" },
                      ]}
                    >
                      <Smartphone size={20} color={colors.accent} />
                      <Text style={[styles.tipBody, { color: colors.textSecondary }]}>
                        On most Android phones: press <Text style={{ fontFamily: "Poppins-SemiBold" }}>Power</Text> and{" "}
                        <Text style={{ fontFamily: "Poppins-SemiBold" }}>Volume down</Text> together. A preview usually
                        appears at the bottom of the screen.
                      </Text>
                    </View>
                  )}
                  <View
                    style={[
                      styles.tipRow,
                      {
                        backgroundColor: colors.accentMuted,
                        borderRadius: radius.lg,
                        borderCurve: "continuous" as const,
                      },
                    ]}
                  >
                    <Scan size={20} color={colors.accent} />
                    <Text style={[styles.tipBody, { color: colors.textSecondary }]}>
                      Only share screenshots you&apos;re comfortable running through analysis — we never post them
                      publicly.
                    </Text>
                  </View>
                </View>
              </ScrollView>
            ) : (
              <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 0 }}>
                <View
                  style={[
                    styles.heroIcon,
                    { backgroundColor: colors.accentMuted, borderRadius: radius.xl, marginBottom: 12 },
                  ]}
                >
                  <ImageUp size={28} color={colors.accent} />
                </View>
                <Text
                  style={{ fontSize: 26, fontFamily: "Poppins-Bold", color: colors.textPrimary, marginBottom: 8 }}
                  selectable
                >
                  Your first look
                </Text>
                <Text
                  style={{
                    fontSize: 15,
                    lineHeight: 22,
                    color: colors.textSecondary,
                    fontFamily: "Poppins-Regular",
                    marginBottom: 16,
                  }}
                  selectable
                >
                  Choose something that felt off — a DM, a shipping text, a fake bank message. This runs a real scan in
                  the app.
                </Text>
                <View style={{ flex: 1, minHeight: 0 }}>
                  <FirstOnboardingScanPanel
                    ref={scanPanelRef}
                    userId={user.id}
                    onContinueAfterSuccess={onContinueAfterScan}
                    onTutorialScanPhaseChange={setTutorialScanPhase}
                  />
                </View>
              </View>
            )}
          </Animated.View>
        </View>

        <View
          style={[
            styles.footer,
            { paddingBottom: footerPadBottom },
          ]}
        >
          <View style={styles.footerBackSlot}>
            <Animated.View style={backAnimStyle}>
              <Pressable
                onPress={goBack}
                onPressIn={() => {
                  backScale.value = withSpring(0.88, { damping: 12, stiffness: 300 });
                }}
                onPressOut={() => {
                  backScale.value = withSpring(1, { damping: 12, stiffness: 300 });
                }}
                accessibilityRole="button"
                accessibilityLabel="Back"
                style={[styles.circleBack, { backgroundColor: "#fff", ...shadows.md }]}
              >
                <ArrowLeft size={20} color="#111" />
              </Pressable>
            </Animated.View>
          </View>
          <View style={styles.footerNextSlot}>
            {subStep === 0 ? (
              <Animated.View style={nextAnimStyle}>
                <Pressable
                  onPress={goNext}
                  onPressIn={() => {
                    nextScale.value = withSpring(0.94, { damping: 12, stiffness: 300 });
                  }}
                  onPressOut={() => {
                    nextScale.value = withSpring(1, { damping: 12, stiffness: 300 });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Next"
                  style={[
                    styles.pillNext,
                    {
                      maxWidth: "100%",
                      backgroundColor: colors.accent,
                      borderRadius: radius.full,
                      boxShadow: glowShadow,
                    },
                  ]}
                >
                  <Text style={[styles.pillNextText, { color: colors.textInverse }]}>Next</Text>
                </Pressable>
              </Animated.View>
            ) : (
              <Animated.View style={nextAnimStyle}>
                <Pressable
                  onPress={() => {
                    scanPanelRef.current?.finishTutorial();
                  }}
                  disabled={tutorialScanPhase !== "complete"}
                  onPressIn={() => {
                    if (tutorialScanPhase === "complete") {
                      nextScale.value = withSpring(0.94, { damping: 12, stiffness: 300 });
                    }
                  }}
                  onPressOut={() => {
                    nextScale.value = withSpring(1, { damping: 12, stiffness: 300 });
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Finish tutorial"
                  accessibilityState={{ disabled: tutorialScanPhase !== "complete" }}
                  style={[
                    styles.pillNext,
                    {
                      maxWidth: "100%",
                      borderRadius: radius.full,
                      borderCurve: "continuous" as const,
                      ...(tutorialScanPhase === "complete"
                        ? {
                            backgroundColor: colors.accent,
                            boxShadow: glowShadow,
                          }
                        : {
                            backgroundColor: colors.backgroundSecondary,
                            borderWidth: 1,
                            borderColor: colors.border,
                            opacity: 0.9,
                          }),
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.pillNextText,
                      {
                        color: tutorialScanPhase === "complete" ? colors.textInverse : colors.textTertiary,
                      },
                    ]}
                  >
                    Finish tutorial
                  </Text>
                </Pressable>
              </Animated.View>
            )}
          </View>
        </View>
      </SafeAreaView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  progressRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
  },
  progressSegment: {
    flex: 1,
    height: 4,
    borderRadius: 2,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  heroIcon: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 26,
    fontFamily: "Poppins-Bold",
    lineHeight: 34,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    lineHeight: 23,
    marginBottom: 16,
  },
  illustrationCard: {
    width: "100%",
    maxHeight: 200,
    marginBottom: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  illustration: {
    width: "100%",
    height: 180,
  },
  howTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    marginBottom: 2,
  },
  tipRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "flex-start",
    padding: 14,
  },
  tipBody: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 22,
  },
  footer: {
    flexDirection: "row",
    flexShrink: 0,
    alignSelf: "stretch",
    width: "100%",
    maxWidth: "100%",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  footerBackSlot: {
    width: 52,
    flexShrink: 0,
    alignItems: "center",
  },
  footerNextSlot: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-end",
  },
  circleBack: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  pillNext: {
    paddingVertical: 14,
    paddingHorizontal: 22,
    minHeight: 52,
    alignItems: "center",
    justifyContent: "center",
    borderCurve: "continuous",
  },
  pillNextText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 17,
  },
});
