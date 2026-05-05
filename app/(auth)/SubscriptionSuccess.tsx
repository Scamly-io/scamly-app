import ShortcutSetupModal from "@/components/ShortcutSetupModal";
import ThemedBackground from "@/components/ThemedBackground";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import { CheckCircle, ShieldCheck, Zap } from "lucide-react-native";
import { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

const FEATURES = [
  {
    title: "Unlimited Scam Scans",
    description: "No monthly cap — scan as many messages and images as you need",
  },
  {
    title: "AI Scam Chat",
    description: "Ask our AI anything about suspicious messages or contacts",
  },
  {
    title: "Full Learning Library",
    description: "All articles, guides, and scam prevention tips unlocked",
  },
  {
    title: "Contact Lookup",
    description: "Search and verify suspicious phone numbers and callers",
  },
];

export default function SubscriptionSuccess() {
  const { colors, radius, shadows } = useTheme();
  const router = useRouter();
  const [showShortcutSetup, setShowShortcutSetup] = useState(false);

  return (
    <>
      <ShortcutSetupModal
        visible={showShortcutSetup}
        onClose={() => setShowShortcutSetup(false)}
        entry="subscription_success"
      />
    <ThemedBackground>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.container}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            entering={FadeInDown.duration(600).delay(100)}
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderRadius: radius["2xl"],
                ...shadows.xl,
              },
            ]}
          >
            {/* Success icon */}
            <View style={[styles.iconContainer, { backgroundColor: "#dcfce7" }]}>
              <ShieldCheck size={42} color="#16a34a" />
            </View>

            <Text style={[styles.title, { color: colors.textPrimary }]}>
              You&apos;re Premium!
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Here&apos;s everything you now have access to:
            </Text>

            {/* Standard features */}
            <View style={[styles.featuresList, { borderColor: colors.border }]}>
              {FEATURES.map((feature, index) => (
                <View
                  key={index}
                  style={[
                    styles.featureRow,
                    index < FEATURES.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <CheckCircle
                    size={18}
                    color="#16a34a"
                    style={styles.featureIcon}
                  />
                  <View style={styles.featureText}>
                    <Text
                      style={[
                        styles.featureTitle,
                        { color: colors.textPrimary },
                      ]}
                    >
                      {feature.title}
                    </Text>
                    <Text
                      style={[
                        styles.featureDescription,
                        { color: colors.textSecondary },
                      ]}
                    >
                      {feature.description}
                    </Text>
                  </View>
                </View>
              ))}
            </View>

            {/* iOS-only Quick Scam Check highlight */}
            {Platform.OS === "ios" && (
              <Animated.View
                entering={FadeInDown.duration(500).delay(350)}
                style={[
                  styles.quickScanCard,
                  {
                    backgroundColor: colors.accentMuted,
                    borderColor: colors.accent,
                    borderRadius: radius.xl,
                  },
                ]}
              >
                <View style={styles.quickScanHeader}>
                  <View
                    style={[
                      styles.quickScanIconBg,
                      { backgroundColor: colors.accent },
                    ]}
                  >
                    <Zap size={16} color="#fff" />
                  </View>
                  <Text
                    style={[
                      styles.quickScanLabel,
                      { color: colors.accent },
                    ]}
                  >
                    NEW — iOS EXCLUSIVE
                  </Text>
                </View>
                <Text
                  style={[styles.quickScanTitle, { color: colors.textPrimary }]}
                >
                  Quick Scam Check
                </Text>
                <Text
                  style={[
                    styles.quickScanDescription,
                    { color: colors.textSecondary },
                  ]}
                >
                  Use your Action Button or Back Tap to instantly scan anything
                  suspicious on the screen.
                </Text>
              </Animated.View>
            )}

            {/* Buttons */}
            <View style={styles.buttonsContainer}>
              {Platform.OS === "ios" && (
                <Pressable
                  onPress={() => setShowShortcutSetup(true)}
                  style={({ pressed }) => [
                    styles.glowButton,
                    {
                      backgroundColor: colors.accent,
                      borderRadius: radius.lg,
                      shadowColor: colors.accent,
                      opacity: pressed ? 0.88 : 1,
                    },
                  ]}
                >
                  <Zap size={18} color="#fff" style={styles.glowButtonIcon} />
                  <Text style={styles.glowButtonText}>Set Up Shortcut</Text>
                </Pressable>
              )}

              <Pressable
                onPress={() => router.replace("/home")}
                style={({ pressed }) => [
                  styles.closeButton,
                  {
                    borderRadius: radius.lg,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.closeButtonText,
                    { color: colors.textPrimary },
                  ]}
                >
                  Continue to App
                </Text>
              </Pressable>
            </View>
          </Animated.View>
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
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: 28,
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 26,
    fontFamily: "Poppins-Bold",
    textAlign: "center",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Poppins-Regular",
    textAlign: "center",
    marginBottom: 20,
  },
  featuresList: {
    width: "100%",
    borderWidth: 1,
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 16,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 12,
  },
  featureIcon: {
    marginTop: 1,
    flexShrink: 0,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 14,
    fontFamily: "Poppins-SemiBold",
    marginBottom: 1,
  },
  featureDescription: {
    fontSize: 12,
    fontFamily: "Poppins-Regular",
    lineHeight: 18,
  },
  quickScanCard: {
    width: "100%",
    borderWidth: 1.5,
    padding: 16,
    marginBottom: 20,
  },
  quickScanHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  quickScanIconBg: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  quickScanLabel: {
    fontSize: 11,
    fontFamily: "Poppins-Bold",
    letterSpacing: 0.5,
  },
  quickScanTitle: {
    fontSize: 16,
    fontFamily: "Poppins-Bold",
    marginBottom: 4,
  },
  quickScanDescription: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    lineHeight: 20,
  },
  buttonsContainer: {
    width: "100%",
    gap: 12,
  },
  glowButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 52,
    gap: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
  },
  glowButtonIcon: {
    flexShrink: 0,
  },
  glowButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
    color: "#fff",
  },
  closeButton: {
    width: "100%",
    height: 52,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  closeButtonText: {
    fontSize: 16,
    fontFamily: "Poppins-SemiBold",
  },
});
