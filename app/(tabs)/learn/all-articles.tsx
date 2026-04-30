import ArticleTile from "@/components/ArticleTile";
import Button from "@/components/Button";
import ThemedBackground from "@/components/ThemedBackground";
import { useTheme } from "@/theme";
import { getIsPremium } from "@/utils/shared/access";
import { presentScamlyPaywallIfNeeded, trackRevenueCatError } from "@/utils/shared/revenuecat";
import { supabase } from "@/utils/shared/supabase";
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

type Article = {
  id: string;
  slug: string;
  title: string;
  description: string;
  image: string;
  content: string;
  length?: number;
  free_access?: boolean;
};

export default function AllArticles() {
  const { colors, radius, shadows } = useTheme();
  const [articles, setArticles] = useState<Article[]>([]);
  const [pageLoading, setPageLoading] = useState<boolean>(true);
  const [isPremium, setIsPremium] = useState<boolean>(false);
  const [openingPaywall, setOpeningPaywall] = useState(false);

  const premiumOnlyCount = isPremium
    ? 0
    : articles.filter((a) => a.free_access === false).length;
  const visibleArticles = isPremium
    ? articles
    : articles.filter((a) => a.free_access !== false);

  function calculateReadTime(length: number): number {
    return Math.max(1, Math.round(length / 1500));
  }

  useEffect(() => {
    async function fetchArticles() {
      const premium = await getIsPremium();
      setIsPremium(premium);

      const { data: articles, error: articlesError } = await supabase
        .from("articles")
        .select("id, slug, title, description, primary_image, content, free_access")
        .eq("quick_tip", false);

      if (articlesError || !articles) {
        console.error("Error fetching articles:", articlesError);
        Alert.alert("Error", "Failed to fetch the current articles.");
        return;
      }

      setArticles(
        articles.map((article: any) => ({
          id: article.id,
          slug: article.slug,
          title: article.title,
          description: article.description,
          image: article.primary_image,
          content: article.content,
          length: article.content.length,
          free_access: article.free_access,
        }))
      );

      setPageLoading(false);
    }

    fetchArticles();
  }, []);

  const handleOpenPaywall = async () => {
    if (openingPaywall) return;
    setOpeningPaywall(true);
    try {
      const { didUnlockEntitlement } = await presentScamlyPaywallIfNeeded(undefined, {
        trigger: "library_articles_locked",
      });
      if (didUnlockEntitlement) {
        setIsPremium(true);
        router.push("/subscription-success");
      }
    } catch (error) {
      const message = trackRevenueCatError("present_paywall_library_articles", error);
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
              {visibleArticles.length} articles
            </Text>
          </View>
        </Animated.View>

        <Animated.View entering={FadeInDown.duration(400).delay(100)} style={styles.titleContainer}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>All Articles</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Browse all available articles and guides
          </Text>
        </Animated.View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {visibleArticles.map((article, index) => (
            <Animated.View
              key={article.id}
              entering={FadeInDown.duration(300).delay(150 + index * 50)}
            >
              <ArticleTile
                title={article.title}
                description={article.description}
                readTime={calculateReadTime(article.length!)}
                image={article.image}
                slug={article.slug}
                onPress={() => router.push(`/learn/${article.slug}`)}
              />
            </Animated.View>
          ))}

          {!isPremium && premiumOnlyCount > 0 ? (
            <Animated.View
              entering={FadeInDown.duration(300).delay(150 + visibleArticles.length * 50)}
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
                {premiumOnlyCount === 1 ? "article" : "articles"}
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
    gap: 16,
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
