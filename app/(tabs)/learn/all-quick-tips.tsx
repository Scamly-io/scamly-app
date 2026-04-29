import QuickTipTile from "@/components/QuickTipTile";
import Button from "@/components/Button";
import ThemedBackground from "@/components/ThemedBackground";
import { useTheme } from "@/theme";
import { getIsPremium } from "@/utils/access";
import { presentScamlyPaywallIfNeeded, trackRevenueCatError } from "@/utils/revenuecat";
import { supabase } from "@/utils/supabase";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type QuickTip = {
  id: string;
  slug: string;
  title: string;
  description: string;
  icon: string;
  iconColour: string;
  iconBackground: string;
  free_access?: boolean;
};

export default function AllQuickTips() {
  const { colors, radius, shadows } = useTheme();
  const [quickTips, setQuickTips] = useState<QuickTip[]>([]);
  const [pageLoading, setPageLoading] = useState<boolean>(true);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [openingPaywall, setOpeningPaywall] = useState(false);

  const premiumOnlyCount = isPremium
    ? 0
    : quickTips.filter((t) => t.free_access === false).length;
  const visibleQuickTips = isPremium
    ? quickTips
    : quickTips.filter((t) => t.free_access !== false);

  useEffect(() => {
    async function fetchQuickTips() {
      const premium = await getIsPremium();
      setIsPremium(premium);

      const { data: quickTips, error: quickTipsError } = await supabase
        .from("articles")
        .select(
          "id, slug, title, description, quick_tip_icon, quick_tip_icon_colour, quick_tip_icon_background_colour, free_access"
        )
        .eq("quick_tip", true);

      if (quickTipsError || !quickTips) {
        console.error("Error fetching quick tips:", quickTipsError);
        Alert.alert("Error", "Failed to fetch the current quick tips.");
        return;
      }

      setQuickTips(
        quickTips.map((quickTip: any) => ({
          id: quickTip.id,
          slug: quickTip.slug,
          title: quickTip.title,
          description: quickTip.description,
          icon: quickTip.quick_tip_icon,
          iconColour: quickTip.quick_tip_icon_colour,
          iconBackground: quickTip.quick_tip_icon_background_colour,
          free_access: quickTip.free_access,
        }))
      );

      setPageLoading(false);
    }

    fetchQuickTips();
  }, []);

  const handleOpenPaywall = async () => {
    if (openingPaywall) return;
    setOpeningPaywall(true);
    try {
      const { didUnlockEntitlement } = await presentScamlyPaywallIfNeeded(undefined, {
        trigger: "library_quick_tips_locked",
      });
      if (didUnlockEntitlement) {
        setIsPremium(true);
        router.push("/subscription-success");
      }
    } catch (error) {
      const message = trackRevenueCatError("present_paywall_library_quick_tips", error);
      Alert.alert("Subscription unavailable", message);
    } finally {
      setOpeningPaywall(false);
    }
  };

  if (pageLoading) {
    return (
      <ThemedBackground>
        <SafeAreaView edges={["top"]} style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </SafeAreaView>
      </ThemedBackground>
    );
  }

  return (
    <ThemedBackground>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        {/* Header */}
        <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
          <TouchableOpacity
            style={[
              styles.backButton,
              { backgroundColor: colors.surface, borderRadius: radius.md, ...shadows.sm },
            ]}
            onPress={() => router.replace("/learn")}
          >
            <ArrowLeft size={18} color={colors.textPrimary} />
            <Text style={[styles.backLabel, { color: colors.textPrimary }]}>Back</Text>
          </TouchableOpacity>
          <View style={[styles.countBadge, { backgroundColor: colors.accentMuted }]}>
            <Text style={[styles.countText, { color: colors.accent }]}>
              {visibleQuickTips.length} tips
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Quick Tips</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Short, actionable tips to stay safe
          </Text>
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {visibleQuickTips.map((quickTip, index) => (
            <Animated.View
              key={quickTip.id}
              entering={FadeInDown.duration(300).delay(150 + index * 50)}
            >
              <QuickTipTile
                slug={quickTip.slug}
                title={quickTip.title}
                icon={quickTip.icon}
                iconColour={quickTip.iconColour}
                iconBackground={quickTip.iconBackground}
                readMoreVisible={true}
                onPress={() => router.push(`/learn/${quickTip.slug}`)}
              />
            </Animated.View>
          ))}

          {!isPremium && premiumOnlyCount > 0 ? (
            <Animated.View
              entering={FadeInDown.duration(300).delay(150 + visibleQuickTips.length * 50)}
              style={[
                styles.upgradeSection,
                {
                  backgroundColor: colors.surface,
                  borderRadius: radius.lg,
                  ...shadows.sm,
                },
              ]}
            >
              <Text style={[styles.upgradeTitle, { color: colors.textPrimary }]}>
                Upgrade to premium to view {premiumOnlyCount} more{" "}
                {premiumOnlyCount === 1 ? "quick tip" : "quick tips"}
              </Text>
              <Button onPress={handleOpenPaywall} loading={openingPaywall} fullWidth>
                Upgrade to Premium
              </Button>
            </Animated.View>
          ) : null}
        </ScrollView>
      </SafeAreaView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
  },
  countBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  countText: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
  },
  titleContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  title: {
    fontFamily: "Poppins-Bold",
    fontSize: 26,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 15,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  upgradeSection: {
    padding: 20,
    gap: 16,
    marginTop: 4,
  },
  upgradeTitle: {
    fontFamily: "Poppins-Medium",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
});
