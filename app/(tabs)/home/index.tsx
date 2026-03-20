import ArticleTile from "@/components/ArticleTile";
import Button from "@/components/Button";
import Card from "@/components/Card";
import QuickTipTile from "@/components/QuickTipTile";
import ThemedBackground from "@/components/ThemedBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { trackFeatureOpened, trackUserVisibleError } from "@/utils/analytics";
import { captureDataFetchError, captureError, captureWarning } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { ChevronRight, LogOut, MessageCircle, Scan, Search, Sparkles, TrendingUp, User } from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type Article = {
  id: string;
  slug: string;
  title: string;
  description: string;
  image?: string;
  content?: string;
  length?: number;
  quick_tip?: boolean;
  rank?: number;
  icon?: string;
  iconColour?: string;
  iconBackground?: string;
};

export default function Home() {
  const { colors, isDark } = useTheme();
  const { user, signOut } = useAuth();
  const [userName, setUserName] = useState<string | null>("");
  const [trendingArticles, setTrendingArticles] = useState<Article[]>([]);
  const [quickTips, setQuickTips] = useState<Article[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPremium, setIsPremium] = useState<boolean>(false);

  function calculateReadTime(length: number): number {
    return Math.max(1, Math.round(length / 1500));
  }

  const fetchPageData = useCallback(async () => {
    async function getUserProfile(): Promise<boolean> {
      if (!user) {
        trackUserVisibleError("home", "session_invalid", false);
        return false;
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, subscription_plan")
        .eq("id", user.id)
        .single();

      if (profileError || !profileData) {
        trackUserVisibleError("home", "profile_fetch_failed", false);
        captureDataFetchError(profileError || new Error("No profile data"), "home", "fetch_profile", "critical");
        setUserName("");
        return false;
      }

      const premium = profileData.subscription_plan !== "free";
      setIsPremium(premium);
      setUserName(profileData.first_name);
      return premium;
    }

    async function getTrendingArticles(premium: boolean) {
      let query = supabase
        .from("articles")
        .select("id, title, primary_image, description, slug, content")
        .order("views", { ascending: false })
        .eq("quick_tip", false)
        .limit(2);

      if (!premium) {
        query = query.eq("free_access", true);
      }

      const { data: trendingArticles, error: trendingArticlesError } = await query;

      if (!trendingArticles || trendingArticlesError) {
        captureWarning(trendingArticlesError || new Error("No trending articles"), "home", "fetch_trending_articles");
      } else {
        setTrendingArticles(
          trendingArticles.map((article: any) => ({
            id: article.id,
            slug: article.slug,
            title: article.title,
            description: article.description,
            image: article.primary_image,
            length: article.content.length,
          }))
        );
      }
    }

    async function getQuickTips(premium: boolean) {
      let query = supabase
        .from("articles")
        .select(
          "id, slug, title, description, quick_tip_icon, quick_tip_icon_colour, quick_tip_icon_background_colour"
        )
        .eq("quick_tip", true)
        .order("views", { ascending: false })
        .limit(3);

      if (!premium) {
        query = query.eq("free_access", true);
      }

      const { data: quickTips, error: quickTipsError } = await query;

      if (!quickTips || quickTipsError) {
        captureWarning(quickTipsError || new Error("No quick tips"), "home", "fetch_quick_tips");
      } else {
        setQuickTips(
          quickTips.map((quickTip: any) => ({
            id: quickTip.id,
            slug: quickTip.slug,
            title: quickTip.title,
            description: quickTip.description,
            icon: quickTip.quick_tip_icon,
            iconColour: quickTip.quick_tip_icon_colour,
            iconBackground: quickTip.quick_tip_icon_background_colour,
          }))
        );
      }
    }

    setLoading(true);
    const premium = await getUserProfile();
    await Promise.all([getTrendingArticles(premium), getQuickTips(premium)]);
    setLoading(false);
  }, [user]);

  // Refresh data whenever home tab is focused so subscription state stays current.
  useFocusEffect(
    useCallback(() => {
      trackFeatureOpened("home");
      fetchPageData();
    }, [fetchPageData])
  );

  async function handleSignOut() {
    try {
      await signOut();
      router.replace("/login");
    } catch (err) {
      trackUserVisibleError("home", "signout_failed", true);
      captureError(err, {
        feature: "home",
        action: "sign_out",
        severity: "critical",
      });
      Alert.alert("Error", "There was an error signing you out. Please try again.");
    }
  }

  const navOptions = [
    {
      icon: Scan,
      label: "Scanner",
      route: "/scan",
      color: colors.accent,
    },
    {
      icon: MessageCircle,
      label: "AI Chat",
      route: "/chat",
      color: colors.accent,
    },
    {
      icon: Search,
      label: "Contact Search",
      route: "/contact-search",
      color: colors.accent,
    },
  ];

  return (
    <ThemedBackground>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(400).delay(0)} style={styles.header}>
            <View>
              <Text style={[styles.greeting, { color: colors.textSecondary }]}>
                {userName ? `Hi, ${userName}` : "Hi there"}
              </Text>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
                What can we help{"\n"}you with today?
              </Text>
            </View>
            <View style={[styles.avatarContainer, { backgroundColor: colors.accentMuted }]}>
              <Image
                source={
                  isDark
                    ? require("@/assets/images/page-images/logo_square_dark.png")
                    : require("@/assets/images/page-images/logo_square_light.png")
                }
                style={styles.avatarImage}
              />
            </View>
          </Animated.View>

          {/* Navigation Options */}
          <Animated.View
            entering={FadeInDown.duration(400).delay(100)}
            style={styles.navOptionsContainer}
          >
            {navOptions.map((option, index) => (
              <Card
                key={option.label}
                onPress={() => router.push(option.route as any)}
                style={styles.navOption}
              >
                <View style={[styles.navIconContainer, { backgroundColor: colors.accentMuted }]}>
                  <option.icon size={24} color={option.color} />
                </View>
                <Text style={[styles.navOptionText, { color: colors.textPrimary }]}>
                  {option.label}
                </Text>
              </Card>
            ))}
          </Animated.View>

          {/* Trending Articles */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <View style={[styles.sectionIconContainer, { backgroundColor: colors.accentMuted }]}>
                  <TrendingUp size={18} color={colors.accent} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Trending Articles
                </Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/learn/all-articles")}>
                <Text style={[styles.viewAllText, { color: colors.accent }]}>View All</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            ) : (
              <View style={styles.articlesContainer}>
                {trendingArticles.map((article) => (
                  <ArticleTile
                    key={article.id}
                    title={article.title}
                    description={article.description}
                    readTime={calculateReadTime(article.length!)}
                    image={article.image!}
                    slug={article.slug}
                  />
                ))}
              </View>
            )}
          </Animated.View>

          {/* Quick Tips */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <View style={[styles.sectionIconContainer, { backgroundColor: colors.accentMuted }]}>
                  <Sparkles size={18} color={colors.accent} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Quick Tips</Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/learn/all-quick-tips")}>
                <Text style={[styles.viewAllText, { color: colors.accent }]}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.quickTipsContainer}>
              {quickTips.map((quickTip) => (
                <QuickTipTile
                  key={quickTip.id}
                  slug={quickTip.slug}
                  title={quickTip.title}
                  description={quickTip.description}
                  icon={quickTip.icon!}
                  iconColour={quickTip.iconColour!}
                  iconBackground={quickTip.iconBackground!}
                  readMoreVisible={false}
                />
              ))}
            </View>
          </Animated.View>

          {/* Premium Banner */}
          <Animated.View entering={FadeInDown.duration(400).delay(400)}>
            <Card
              style={[
                styles.premiumBanner,
                { backgroundColor: isDark ? colors.surfaceElevated : colors.accent },
              ]}
              pressable={false}
            >
              <View style={styles.premiumContent}>
                <View
                  style={[
                    styles.premiumIconContainer,
                    { backgroundColor: isDark ? colors.accentMuted : "rgba(255,255,255,0.2)" },
                  ]}
                >
                  <Image
                    source={require("@/assets/images/page-images/logo_square_dark.png")}
                    style={styles.premiumIcon}
                  />
                </View>
                <View style={styles.premiumTextContainer}>
                  <Text
                    style={[
                      styles.premiumTitle,
                      { color: isDark ? colors.textPrimary : colors.textInverse },
                    ]}
                  >
                    Scamly {isPremium ? "Premium" : "Free"}
                  </Text>
                  <Text
                    style={[
                      styles.premiumDescription,
                      { color: isDark ? colors.textSecondary : "rgba(255,255,255,0.85)" },
                    ]}
                  >
                    {isPremium
                      ? "Thank you for being a premium member"
                      : "Upgrade to premium for unlimited access"}
                  </Text>
                </View>
              </View>
            </Card>
          </Animated.View>

          {/* Profile & Settings */}
          <Animated.View entering={FadeInDown.duration(400).delay(500)}>
            <Card
              onPress={() => router.push("/home/profile")}
              style={styles.profileBanner}
            >
              <View style={styles.profileBannerContent}>
                <View style={[styles.profileIconContainer, { backgroundColor: colors.accentMuted }]}>
                  <User size={22} color={colors.accent} />
                </View>
                <View style={styles.profileTextContainer}>
                  <Text style={[styles.profileBannerTitle, { color: colors.textPrimary }]}>
                    Profile & Settings
                  </Text>
                  <Text style={[styles.profileBannerDescription, { color: colors.textSecondary }]}>
                    Manage your account
                  </Text>
                </View>
                <ChevronRight size={20} color={colors.textTertiary} />
              </View>
            </Card>
          </Animated.View>

          {/* Sign Out */}
          <Animated.View entering={FadeInDown.duration(400).delay(600)} style={styles.signOutSection}>
            <Button
              onPress={handleSignOut}
              variant="danger"
              icon={<LogOut size={16} color={colors.textInverse} />}
            >
              Sign out
            </Button>
            <Text style={[styles.feedbackText, { color: colors.textPrimary }]}>
              We value your feedback. {"\n"} To provide feedback, email{" "}
              <Text style={{ fontWeight: "bold" }}>feedback@scamly.io</Text>
            </Text>
          </Animated.View>
        </ScrollView>
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  greeting: {
    fontFamily: "Poppins-Medium",
    fontSize: 15,
    marginBottom: 4,
  },
  headerTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 26,
    lineHeight: 34,
  },
  avatarContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImage: {
    width: 36,
    height: 36,
    resizeMode: "contain",
  },
  navOptionsContainer: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  navOption: {
    flex: 1,
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  navIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  navOptionText: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
    textAlign: "center",
  },
  section: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  sectionTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sectionTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 18,
  },
  viewAllText: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
  },
  articlesContainer: {
    gap: 16,
  },
  quickTipsContainer: {
    gap: 12,
  },
  premiumBanner: {
    marginBottom: 20,
  },
  premiumContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  premiumIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  premiumIcon: {
    width: 32,
    height: 32,
    resizeMode: "contain",
  },
  premiumTextContainer: {
    flex: 1,
  },
  premiumTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 17,
    marginBottom: 2,
  },
  premiumDescription: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
  },
  profileBanner: {
    marginBottom: 20,
  },
  profileBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  profileIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  profileTextContainer: {
    flex: 1,
  },
  profileBannerTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    marginBottom: 1,
  },
  profileBannerDescription: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
  },
  signOutSection: {
    alignItems: "center",
    marginTop: 8,
  },
  feedbackText: {
    fontFamily: "Poppins-Regular",
    fontSize: 16,
    lineHeight: 24,
    marginTop: 20,
    textAlign: "center",
  },
});
