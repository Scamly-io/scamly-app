import ArticleTile from "@/components/ArticleTile";
import Button from "@/components/Button";
import Card from "@/components/Card";
import QuickTipTile from "@/components/QuickTipTile";
import ThemedBackground from "@/components/ThemedBackground";
import { useTheme } from "@/theme";
import { getIsPremium } from "@/utils/access";
import { trackFeatureOpened, trackUserVisibleError } from "@/utils/analytics";
import { captureError, captureWarning } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { ChevronRight, Clock, Search, Sparkles, TrendingUp, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

export default function Learn() {
  const { colors, isDark } = useTheme();
  const [searchInput, setSearchInput] = useState<string>("");
  const [searchResults, setSearchResults] = useState<Article[]>([]);
  const [searchLoading, setSearchLoading] = useState<boolean>(false);
  const [pageLoading, setPageLoading] = useState<boolean>(true);
  const [featuredArticle, setFeaturedArticle] = useState<Article | null>(null);
  const [trendingArticles, setTrendingArticles] = useState<Article[]>([]);
  const [quickTips, setQuickTips] = useState<Article[]>([]);
  const [isPremium, setIsPremium] = useState<boolean>(false);

  // Track feature discovery when learning center tab is focused
  useFocusEffect(
    React.useCallback(() => {
      trackFeatureOpened("learning_center");
    }, [])
  );

  useEffect(() => {
    async function fetchPageData() {
      const premium = await getIsPremium();
      setIsPremium(premium);

      async function getFeaturedArticle() {
        let query = supabase
          .from("articles")
          .select("id, slug, title, description, content")
          .order("views", { ascending: false })
          .limit(1)
          .eq("quick_tip", false);

        if (!premium) {
          query = query.eq("free_access", true);
        }

        const { data: featuredArticle, error: featuredArticleError } = await query.single();

        if (featuredArticleError || !featuredArticle) {
          captureWarning(featuredArticleError || new Error("No featured article"), "learn", "fetch_featured_article");
          return;
        }

        setFeaturedArticle({
          id: featuredArticle.id,
          slug: featuredArticle.slug,
          title: featuredArticle.title,
          description: featuredArticle.description,
          length: featuredArticle.content.length,
        });
      }

      async function getTrendingArticles() {
        let query = supabase
          .from("articles")
          .select("id, slug, title, description, primary_image, content")
          .order("views", { ascending: false })
          .eq("quick_tip", false)
          .range(1, 3);

        if (!premium) {
          query = query.eq("free_access", true);
        }

        const { data: trendingArticles, error: trendingArticlesError } = await query;

        if (trendingArticlesError || !trendingArticles) {
          captureWarning(trendingArticlesError || new Error("No trending articles"), "learn", "fetch_trending_articles");
          return;
        }

        setTrendingArticles(
          trendingArticles.map((article: any) => ({
            id: article.id,
            slug: article.slug,
            title: article.title,
            description: article.description,
            length: article.content.length,
            image: article.primary_image,
          }))
        );
      }

      async function getQuickTips() {
        let query = supabase
          .from("articles")
          .select(
            "id, slug, title, description, quick_tip_icon, quick_tip_icon_colour, quick_tip_icon_background_colour"
          )
          .eq("quick_tip", true)
          .order("views", { ascending: false })
          .range(0, 3);

        if (!premium) {
          query = query.eq("free_access", true);
        }

        const { data: quickTips, error: quickTipsError } = await query;

        if (quickTipsError || !quickTips) {
          captureWarning(quickTipsError || new Error("No quick tips"), "learn", "fetch_quick_tips");
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
          }))
        );
      }

      await Promise.all([getFeaturedArticle(), getTrendingArticles(), getQuickTips()]);
      setPageLoading(false);
    }

    fetchPageData();
  }, []);

  function calculateReadTime(length: number): number {
    return Math.max(1, Math.round(length / 1500));
  }

  async function handleSearch() {
    if (!isPremium) {
      Alert.alert("Premium required", "Search is only available to Scamly Premium users.");
      return;
    }
    if (!searchInput.trim()) return;

    setSearchLoading(true);
    setSearchResults([]);

    try {
      const { data } = await supabase.rpc("search_articles", { search_text: searchInput.trim() });

      const mapped = data.map((article: any) => ({
        id: article.id,
        slug: article.slug,
        title: article.title,
        description: article.description,
        length: article.content.length,
        image: article.image,
        quick_tip: article.quick_tip,
        icon: article.quick_tip_icon,
        iconColour: article.quick_tip_icon_colour,
        iconBackground: article.quick_tip_icon_background_colour,
        rank: article.rank,
      }));

      setSearchResults(mapped);

      if (mapped.length < 1) {
        Alert.alert("No results found", `We couldn't find any articles related to ${searchInput.trim()}`);
      }
    } catch (error) {
      trackUserVisibleError("learn", "search_failed", true);
      captureError(error, {
        feature: "learn",
        action: "search_articles",
        severity: "critical",
        extra: { searchInput },
      });
      Alert.alert("Error", "Failed to search articles. Please try again later.");
    } finally {
      setSearchLoading(false);
    }
  }

  function clearSearch() {
    setSearchInput("");
    setSearchResults([]);
  }

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
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardDismissMode="on-drag"
        >
          {/* Header */}
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Library
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Stay informed, stay aware, stay safe
            </Text>
          </Animated.View>

          {/* Search (Premium only) */}
          {isPremium && (
            <Animated.View entering={FadeInDown.duration(400).delay(50)} style={styles.searchContainer}>
              <View style={[styles.searchInputContainer, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <Search size={20} color={colors.textTertiary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  placeholder="Search articles, guides, and tips..."
                  placeholderTextColor={colors.textTertiary}
                  value={searchInput}
                  onChangeText={setSearchInput}
                  onSubmitEditing={handleSearch}
                  returnKeyType="search"
                />
                {(searchInput.length > 0 || searchResults.length > 0) && (
                  <TouchableOpacity
                    onPress={clearSearch}
                    style={styles.searchClearButton}
                    accessibilityRole="button"
                    accessibilityLabel="Clear search"
                  >
                    <X size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </View>

              {searchLoading && (
                <View style={styles.searchLoadingContainer}>
                  <ActivityIndicator size="small" color={colors.accent} />
                </View>
              )}

              {searchResults.length > 0 && (
                <View style={styles.searchResults}>
                  {searchResults.filter((result) => result.quick_tip).map((result) => (
                    <QuickTipTile
                      key={result.id}
                      slug={result.slug}
                      title={result.title}
                      description={result.description}
                      icon={result.icon!}
                      iconColour={result.iconColour!}
                      iconBackground={result.iconBackground!}
                      readMoreVisible={false}
                    />
                  ))}
                  {searchResults.filter((result) => !result.quick_tip).map((result) => (
                    <ArticleTile
                      key={result.id}
                      title={result.title}
                      description={result.description}
                      readTime={calculateReadTime(result.length!)}
                      image={result.image!}
                      slug={result.slug}
                    />
                  ))}
                </View>
              )}
            </Animated.View>
          )}

          {/* Featured Article */}
          {featuredArticle && (
            <Animated.View entering={FadeInDown.duration(400).delay(100)}>
              <Card
                onPress={() => router.push(`/learn/${featuredArticle.slug}`)}
                style={[
                  styles.featuredCard,
                  { backgroundColor: isDark ? colors.surfaceElevated : colors.accent },
                ]}
              >
                <View style={[styles.featuredBadge, { backgroundColor: isDark ? colors.accentMuted : "rgba(255,255,255,0.2)" }]}>
                  <Sparkles size={14} color={isDark ? colors.accent : "white"} />
                  <Text style={[styles.featuredBadgeText, { color: isDark ? colors.accent : "white" }]}>
                    Featured
                  </Text>
                </View>
                <Text
                  style={[styles.featuredTitle, { color: isDark ? colors.textPrimary : "white" }]}
                  numberOfLines={2}
                >
                  {featuredArticle.title}
                </Text>
                <Text
                  style={[styles.featuredDescription, { color: isDark ? colors.textSecondary : "rgba(255,255,255,0.85)" }]}
                  numberOfLines={2}
                >
                  {featuredArticle.description}
                </Text>
                <View style={styles.featuredFooter}>
                  <View style={styles.featuredReadTime}>
                    <Clock size={14} color={isDark ? colors.textSecondary : "rgba(255,255,255,0.8)"} />
                    <Text style={[styles.featuredReadTimeText, { color: isDark ? colors.textSecondary : "rgba(255,255,255,0.8)" }]}>
                      {calculateReadTime(featuredArticle.length!)} min read
                    </Text>
                  </View>
                  <View style={[styles.readNowButton, { backgroundColor: isDark ? colors.accentMuted : "rgba(255,255,255,0.2)" }]}>
                    <Text style={[styles.readNowText, { color: isDark ? colors.accent : "white" }]}>
                      Read now
                    </Text>
                    <ChevronRight size={16} color={isDark ? colors.accent : "white"} />
                  </View>
                </View>
              </Card>
            </Animated.View>
          )}

          {/* Trending Now */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <View style={[styles.sectionIconContainer, { backgroundColor: colors.accentMuted }]}>
                  <TrendingUp size={18} color={colors.accent} />
                </View>
                <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                  Trending Now
                </Text>
              </View>
            </View>
            <View style={styles.articlesList}>
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
          </Animated.View>

          {/* Quick Tips */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <Card
              style={[styles.quickTipsSection, { backgroundColor: colors.backgroundSecondary }]}
              pressable={false}
            >
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <View style={[styles.sectionIconContainer, { backgroundColor: colors.accentMuted }]}>
                    <Sparkles size={18} color={colors.accent} />
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
                    Quick Tips
                  </Text>
                </View>
                <TouchableOpacity onPress={() => router.push("/learn/all-quick-tips")}>
                  <Text style={[styles.viewAllText, { color: colors.accent }]}>View All</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.quickTipsList}>
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
            </Card>
          </Animated.View>

          {/* View All Articles */}
          <Animated.View entering={FadeInDown.duration(400).delay(400)} style={styles.viewAllSection}>
            <Button
              onPress={() => router.push("/learn/all-articles")}
              variant="secondary"
              fullWidth
            >
              View All Articles
            </Button>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
  searchContainer: {
    marginBottom: 20,
    gap: 12,
  },
  searchInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: 15,
  },
  searchClearButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  searchLoadingContainer: {
    padding: 16,
    alignItems: "center",
  },
  searchResults: {
    gap: 12,
  },
  featuredCard: {
    marginBottom: 28,
    gap: 10,
  },
  featuredBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
  },
  featuredBadgeText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 12,
  },
  featuredTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 20,
    lineHeight: 26,
  },
  featuredDescription: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  featuredFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  featuredReadTime: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  featuredReadTimeText: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
  },
  readNowButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  readNowText: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
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
  articlesList: {
    gap: 16,
  },
  quickTipsSection: {
    padding: 16,
    marginBottom: 24,
  },
  quickTipsList: {
    gap: 12,
  },
  viewAllSection: {
    marginTop: 8,
  },
});
