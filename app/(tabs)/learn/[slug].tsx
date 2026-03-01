import Button from "@/components/Button";
import ThemedBackground from "@/components/ThemedBackground";
import { useTheme } from "@/theme";
import { getIsPremium } from "@/utils/access";
import {
  trackArticleEngaged,
  trackArticleViewed,
  trackUserVisibleError,
} from "@/utils/analytics";
import { captureDataFetchError, captureWarning } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import Markdown from "@ronradtke/react-native-markdown-display";
import { router, useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft } from "lucide-react-native";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  LogBox,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

LogBox.ignoreLogs([
  'A props object containing a "key" prop is being spread into JSX',
]);

// Minimum thresholds for meaningful engagement
const ENGAGEMENT_MIN_SCROLL_PERCENT = 0.75; // 75% of content
const ENGAGEMENT_MIN_TIME_SECONDS = 60; // 60 seconds

type Article = {
  content: string;
  id: string;
};

export default function ArticleDetail() {
  const { colors, radius, shadows, isDark } = useTheme();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const { slug } = useLocalSearchParams<{ slug: string }>();

  // Engagement tracking state
  const articleViewStartTime = useRef<number>(0);
  const maxScrollPercent = useRef<number>(0);
  const hasTrackedEngagement = useRef<boolean>(false);
  const hasTrackedView = useRef<boolean>(false);

  /**
   * Check if engagement criteria are met and fire event if so.
   * Only fires once per article view.
   */
  const checkAndTrackEngagement = () => {
    if (hasTrackedEngagement.current || !article) return;

    const timeOnPageSeconds = Math.round((Date.now() - articleViewStartTime.current) / 1000);

    if (
      maxScrollPercent.current >= ENGAGEMENT_MIN_SCROLL_PERCENT &&
      timeOnPageSeconds >= ENGAGEMENT_MIN_TIME_SECONDS
    ) {
      // User meaningfully engaged: scrolled 75%+ and spent 60+ seconds
      trackArticleEngaged(article.id, timeOnPageSeconds);
      hasTrackedEngagement.current = true;
    }
  };

  /**
   * Handle scroll events to track max scroll position.
   * Only checks engagement on significant scroll changes.
   */
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
    const scrollableHeight = contentSize.height - layoutMeasurement.height;

    if (scrollableHeight > 0) {
      const scrollPercent = contentOffset.y / scrollableHeight;
      if (scrollPercent > maxScrollPercent.current) {
        maxScrollPercent.current = scrollPercent;
        // Check engagement when user scrolls past threshold
        if (scrollPercent >= ENGAGEMENT_MIN_SCROLL_PERCENT) {
          checkAndTrackEngagement();
        }
      }
    }
  };

  useEffect(() => {
    async function fetchArticle() {
      const premium = await getIsPremium();

      const { data: article, error: articleError } = await supabase
        .from("articles")
        .select("id, content, free_access")
        .eq("slug", slug)
        .single();

      if (articleError || !article) {
        trackUserVisibleError("learn", "article_not_found", false);
        captureDataFetchError(articleError || new Error("Article not found"), "learn", "fetch_article", "critical", { slug });
        Alert.alert("Error", "We couldn't find the article you were looking for.", [
          {
            text: "Back",
            style: "destructive",
            onPress: () => {
              router.replace("/learn");
            },
          },
        ]);
        return;
      }

      if (!premium && article.free_access === false) {
        router.replace("/learn");
        return;
      }

      setArticle(article);
      setLoading(false);

      // Track article view - fires once when article content is loaded
      if (!hasTrackedView.current) {
        trackArticleViewed(article.id, "article");
        hasTrackedView.current = true;
        articleViewStartTime.current = Date.now();
      }

      try {
        await supabase.rpc("increment_article_views", { article_id: article.id });
      } catch (error) {
        // Non-blocking error - doesn't affect user experience
        captureWarning(error, "learn", "increment_views", { articleId: article.id });
      }
    }

    fetchArticle();
  }, [slug]);

  // Check engagement when component unmounts (user leaves article)
  useEffect(() => {
    return () => {
      checkAndTrackEngagement();
    };
  }, [article]);

  const markdownStyles = {
    body: {
      fontFamily: "Poppins-Regular",
      fontSize: 16,
      color: colors.textPrimary,
      lineHeight: 26,
    },
    heading1: {
      fontFamily: "Poppins-Bold",
      fontSize: 26,
      color: colors.textPrimary,
      paddingTop: 24,
      marginBottom: 12,
    },
    heading2: {
      fontFamily: "Poppins-SemiBold",
      fontSize: 22,
      color: colors.textPrimary,
      marginTop: 20,
      marginBottom: 10,
    },
    heading3: {
      fontFamily: "Poppins-SemiBold",
      fontSize: 18,
      color: colors.textPrimary,
      marginTop: 16,
      marginBottom: 8,
    },
    paragraph: {
      marginBottom: 16,
    },
    image: {
      borderRadius: 16,
      marginVertical: 16,
    },
    blockquote: {
      backgroundColor: colors.accentMuted,
      borderLeftColor: colors.accent,
      borderLeftWidth: 4,
      paddingLeft: 16,
      paddingVertical: 12,
      marginVertical: 16,
      borderRadius: 8,
    },
    code_inline: {
      backgroundColor: colors.backgroundSecondary,
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 4,
      fontFamily: "Menlo",
      fontSize: 14,
    },
    code_block: {
      backgroundColor: colors.surfaceElevated,
      padding: 16,
      borderRadius: 12,
      overflow: "hidden",
      fontFamily: "Menlo",
      fontSize: 14,
    },
    fence: {
      backgroundColor: colors.surfaceElevated,
      padding: 16,
      borderRadius: 12,
      overflow: "hidden",
      fontFamily: "Menlo",
      fontSize: 14,
    },
    table: {
      borderWidth: 1,
      borderColor: colors.border,
      marginVertical: 16,
      borderRadius: 8,
      overflow: "hidden",
    },
    th: {
      fontFamily: "Poppins-SemiBold",
      fontSize: 14,
      backgroundColor: colors.backgroundSecondary,
      padding: 12,
    },
    td: {
      fontFamily: "Poppins-Regular",
      fontSize: 14,
      padding: 12,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    hr: {
      backgroundColor: colors.border,
      height: 1,
      marginVertical: 24,
    },
    em: {
      fontFamily: "Poppins-Italic",
    },
    strong: {
      fontFamily: "Poppins-Bold",
    },
    link: {
      color: colors.accent,
      textDecorationLine: "underline",
    },
    bullet_list: {
      marginVertical: 8,
    },
    ordered_list: {
      marginVertical: 8,
    },
    list_item: {
      marginBottom: 8,
    },
  };

  if (loading) {
    return (
      <>
        <StatusBar style={isDark ? "light" : "dark"} />
        <ThemedBackground>
          <SafeAreaView edges={["top", "left", "right"]} style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.accent} />
          </SafeAreaView>
        </ThemedBackground>
      </>
    );
  }

  return (
    <>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ThemedBackground>
        <SafeAreaView edges={["top", "left", "right"]} style={styles.safeArea}>
          {/* Header */}
          <Animated.View entering={FadeIn.duration(300)} style={styles.header}>
            <TouchableOpacity
              style={[
                styles.backButton,
                { backgroundColor: colors.surface, borderRadius: radius.md, ...shadows.sm },
              ]}
              onPress={() => router.replace("/learn")}
            >
              <ArrowLeft size={20} color={colors.textPrimary} />
              <Text style={[styles.backLabel, { color: colors.textPrimary }]}>Back</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={100}
          >
            <Animated.View entering={FadeIn.duration(400).delay(100)}>
              <Markdown style={markdownStyles}>{article?.content}</Markdown>
            </Animated.View>

            <View style={styles.footer}>
              <Button onPress={() => router.back()} variant="secondary">
                Back to Learning Center
              </Button>
            </View>
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
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  footer: {
    marginTop: 32,
    alignItems: "center",
  },
});
