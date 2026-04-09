import { useTheme } from "@/theme";
import {
  trackShortcutInstallLinkOpened,
  trackShortcutSetupModalOpened,
  type ShortcutSetupEntry,
} from "@/utils/analytics";
import * as WebBrowser from "expo-web-browser";
import {
  Download,
  MousePointerSquareDashed,
  Smartphone,
} from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  FlatList,
  Linking,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const SHORTCUT_URL =
  "https://www.icloud.com/shortcuts/71e686bdc4ec408ab780826245fc1336";

type SetupMethod = {
  id: string;
  title: string;
  subtitle: string;
  Icon: React.ComponentType<{ size: number; color: string }>;
  steps: string[];
};

const SETUP_METHODS: SetupMethod[] = [
  {
    id: "action-button",
    title: "Action Button",
    subtitle: "Press the action button to activate quick scan",
    Icon: Smartphone,
    steps: [
      "Open the Settings app",
      'Tap the "Action Button" setting',
      "Change the action button to a Shortcut",
      'Select the "Check for scams" shortcut',
    ],
  },
  {
    id: "back-tap",
    title: "Back Tap",
    subtitle: "Tap the back of your iPhone to activate quick scan",
    Icon: MousePointerSquareDashed,
    steps: [
      "Open the Settings app",
      'Search for "Back Tap"',
      "Select the first result",
      "Select either Double Tap or Triple Tap",
      'Select the "Check for scams" shortcut at the bottom',
    ],
  },
];

type ShortcutSetupModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Where the user opened Quick Scan setup (for analytics). */
  entry: ShortcutSetupEntry;
};

export default function ShortcutSetupModal({
  visible,
  onClose,
  entry,
}: ShortcutSetupModalProps) {
  const { colors, radius, shadows } = useTheme();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const flatListRef = useRef<FlatList<SetupMethod>>(null);
  const [step, setStep] = useState<0 | 1>(0);
  const [methodPage, setMethodPage] = useState(0);
  const hasTrackedOpenRef = useRef(false);

  const contentWidth = width - 48;

  useEffect(() => {
    if (visible && !hasTrackedOpenRef.current) {
      hasTrackedOpenRef.current = true;
      trackShortcutSetupModalOpened(entry);
    }
    if (!visible) {
      hasTrackedOpenRef.current = false;
    }
  }, [visible, entry]);

  const handleClose = () => {
    setStep(0);
    setMethodPage(0);
    onClose();
  };

  const handleDownload = async () => {
    trackShortcutInstallLinkOpened(entry);
    try {
      await Linking.openURL(SHORTCUT_URL);
    } catch {
      await WebBrowser.openBrowserAsync(SHORTCUT_URL);
    }
  };

  const scrollToMethod = (page: number) => {
    flatListRef.current?.scrollToIndex({ index: page, animated: true });
    setMethodPage(page);
  };

  const handleMethodScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const x = event.nativeEvent.contentOffset.x;
    const page = Math.round(x / contentWidth);
    if (page !== methodPage && page >= 0 && page < SETUP_METHODS.length) {
      setMethodPage(page);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <View
        style={[
          styles.root,
          {
            backgroundColor: colors.background,
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ]}
      >
        {/* ── Step 1: Download ── */}
        {step === 0 && (
          <View style={styles.stepContainer}>
            <View style={styles.contentArea}>
              <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
                Install the shortcut
              </Text>
              <Text
                style={[styles.pageSubtitle, { color: colors.textSecondary }]}
              >
                The quick scan feature uses an iOS Shortcut to work. You'll need
                to download and add it to your device first, then you can assign
                it to an Action Button or Back Tap.
              </Text>

              <View
                style={[
                  styles.downloadCard,
                  {
                    backgroundColor: colors.surface,
                    borderRadius: radius["2xl"],
                    ...shadows.lg,
                  },
                ]}
              >
                <View
                  style={[
                    styles.downloadIconBg,
                    { backgroundColor: colors.accentMuted },
                  ]}
                >
                  <Download size={28} color={colors.accent} />
                </View>
                <Text
                  style={[
                    styles.downloadCardTitle,
                    { color: colors.textPrimary },
                  ]}
                >
                  Check for Scams
                </Text>
                <Text
                  style={[
                    styles.downloadCardDesc,
                    { color: colors.textSecondary },
                  ]}
                >
                  Tap below to open the shortcut in Safari. Then press{" "}
                  <Text style={{ fontFamily: "Poppins-SemiBold" }}>
                    "Add Shortcut"
                  </Text>{" "}
                  to install it on your device.
                </Text>

                <Pressable
                  onPress={handleDownload}
                  style={({ pressed }) => [
                    styles.downloadButton,
                    {
                      backgroundColor: colors.accent,
                      borderRadius: radius.lg,
                      shadowColor: colors.accent,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <Download size={18} color="#fff" />
                  <Text style={styles.downloadButtonText}>Get Shortcut</Text>
                </Pressable>
              </View>
            </View>

            <View style={styles.footer}>
              <View style={styles.footerButtons}>
                <Pressable
                  onPress={handleClose}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    {
                      borderRadius: radius.lg,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    Back
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() => setStep(1)}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      backgroundColor: colors.accent,
                      borderRadius: radius.lg,
                      shadowColor: colors.accent,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <Text style={styles.primaryButtonText}>Next</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

        {/* ── Step 2: Activate ── */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            <View style={styles.contentArea}>
              <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>
                Activate the quick scan shortcut
              </Text>
              <Text
                style={[styles.pageSubtitle, { color: colors.textSecondary }]}
              >
                It&apos;s now time to activate the shortcut. Follow the
                instructions below to set it up on your device.
              </Text>

              {/* Page dots */}
              <View style={styles.dotsRow}>
                {SETUP_METHODS.map((_, i) => (
                  <Pressable key={i} onPress={() => scrollToMethod(i)}>
                    <View
                      style={[
                        styles.dot,
                        {
                          backgroundColor:
                            methodPage === i ? colors.accent : colors.border,
                          width: methodPage === i ? 18 : 8,
                        },
                      ]}
                    />
                  </Pressable>
                ))}
              </View>

              {/* Swipeable method cards */}
              <FlatList
                ref={flatListRef}
                data={SETUP_METHODS}
                keyExtractor={(item) => item.id}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScroll={handleMethodScroll}
                scrollEventThrottle={16}
                snapToInterval={contentWidth}
                decelerationRate="fast"
                getItemLayout={(_, index) => ({
                  length: contentWidth,
                  offset: contentWidth * index,
                  index,
                })}
                style={styles.methodList}
                renderItem={({ item }) => (
                  <View style={{ width: contentWidth }}>
                    {/* Method header */}
                    <View style={styles.methodHeader}>
                      <View
                        style={[
                          styles.methodIconBox,
                          {
                            backgroundColor: colors.accent,
                            borderRadius: radius.lg,
                          },
                        ]}
                      >
                        <item.Icon size={24} color="#fff" />
                      </View>
                      <View style={styles.methodHeaderText}>
                        <Text
                          style={[
                            styles.methodTitle,
                            { color: colors.textPrimary },
                          ]}
                        >
                          {item.title}
                        </Text>
                        <Text
                          style={[
                            styles.methodSubtitle,
                            { color: colors.textSecondary },
                          ]}
                        >
                          {item.subtitle}
                        </Text>
                      </View>
                    </View>

                    {/* Steps */}
                    <View style={styles.stepsList}>
                      {item.steps.map((text, i) => (
                        <View key={i} style={styles.stepRow}>
                          <View
                            style={[
                              styles.stepBadge,
                              { backgroundColor: colors.accent },
                            ]}
                          >
                            <Text style={styles.stepBadgeText}>{i + 1}</Text>
                          </View>
                          <Text
                            style={[
                              styles.stepText,
                              { color: colors.textPrimary },
                            ]}
                          >
                            {text}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}
              />

              {/* Swipe hint */}
              <Text style={[styles.swipeHint, { color: colors.textTertiary }]}>
                {methodPage === 0
                  ? "Swipe for other options →"
                  : "← Swipe for other options"}
              </Text>
            </View>

            <View style={styles.footer}>
              <View style={styles.footerButtons}>
                <Pressable
                  onPress={() => setStep(0)}
                  style={({ pressed }) => [
                    styles.secondaryButton,
                    {
                      borderRadius: radius.lg,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.secondaryButtonText,
                      { color: colors.textPrimary },
                    ]}
                  >
                    Back
                  </Text>
                </Pressable>
                <Pressable
                  onPress={handleClose}
                  style={({ pressed }) => [
                    styles.primaryButton,
                    {
                      backgroundColor: colors.accent,
                      borderRadius: radius.lg,
                      shadowColor: colors.accent,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <Text style={styles.primaryButtonText}>Done</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  stepContainer: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  pageTitle: {
    fontSize: 24,
    fontFamily: "Poppins-Bold",
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    lineHeight: 22,
    marginBottom: 24,
  },

  /* ── Step 1: Download card ── */
  downloadCard: {
    padding: 24,
    alignItems: "center",
  },
  downloadIconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  downloadCardTitle: {
    fontSize: 18,
    fontFamily: "Poppins-Bold",
    marginBottom: 6,
  },
  downloadCardDesc: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  downloadButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 50,
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  downloadButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#fff",
  },

  /* ── Step 2: Activate ── */
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginBottom: 20,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  methodList: {
    flexGrow: 0,
  },
  methodHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginBottom: 24,
  },
  methodIconBox: {
    width: 50,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  methodHeaderText: {
    flex: 1,
  },
  methodTitle: {
    fontSize: 17,
    fontFamily: "Poppins-Bold",
  },
  methodSubtitle: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    lineHeight: 18,
  },
  stepsList: {
    gap: 16,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  stepBadgeText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Poppins-Bold",
    lineHeight: 16,
  },
  stepText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    lineHeight: 22,
  },
  swipeHint: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    textAlign: "center",
    marginTop: 20,
  },

  /* ── Shared footer ── */
  footer: {
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 4,
  },
  footerButtons: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
  },
  primaryButton: {
    flex: 1,
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  primaryButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#fff",
  },
});
