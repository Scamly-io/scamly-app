import Button from "@/components/Button";
import FeedbackDetailModal, { type FeedbackDetailItem } from "@/components/FeedbackDetailModal";
import NativeMenu from "@/components/NativeMenu";
import NewFeedbackItemModal from "@/components/NewFeedbackItemModal";
import {
  SwiftGlassCloseIconButton,
  SwiftGlassComposerPill,
  SwiftGlassMenu,
} from "@/components/SwiftGlassChrome";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { getFeedbackWallRefreshSignal } from "@/utils/feedbackWallRefresh";
import {
  trackFeedbackItemOpened,
  trackFeedbackReportSubmitted,
  trackFeedbackVote,
  trackFeedbackWallComposerOpened,
  trackFeedbackWallOpened,
} from "@/utils/analytics";
import { captureDataFetchError } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import { useFocusEffect } from "@react-navigation/native";
import {
  ArrowDownUp,
  ChevronDown,
  ChevronRight,
  CirclePlus,
  Flag,
  Heart,
  MessageCircle,
  X,
} from "lucide-react-native";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type feedbackRequest = {
  id: string;
  title?: string | null;
  description?: string | null;
  content?: string | null;
  posted_by?: string | null;
  status: string;
  created_at: string;
  vote_count: number;
  comment_count: number;
  user_has_voted: boolean;
};

const PAGE_LIMIT = 20;

type FilterOption = "all" | "mine";
type SortOption = "newest" | "most_liked" | "most_comments";

const FILTER_OPTIONS: { label: string; value: FilterOption }[] = [
  { label: "All Feedback", value: "all" },
  { label: "My Feedback", value: "mine" },
];

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Newest", value: "newest" },
  { label: "Most Liked", value: "most_liked" },
  { label: "Most Comments", value: "most_comments" },
];

const REPORT_REASONS = [
  "Spam / Promotional content",
  "Fraud / Scam / Misleading",
  "Harassment / Abuse",
  "Hate Speech / Discrimination",
  "Off-topic / Irrelevant",
  "Inappropriate / NSFW content",
  "Other",
] as const;

function feedbackReportReasonKey(reason: string): string {
  const keys: Record<string, string> = {
    "Spam / Promotional content": "spam",
    "Fraud / Scam / Misleading": "fraud",
    "Harassment / Abuse": "harassment",
    "Hate Speech / Discrimination": "hate_speech",
    "Off-topic / Irrelevant": "off_topic",
    "Inappropriate / NSFW content": "nsfw",
    "Other": "other",
  };
  return keys[reason] ?? "other";
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function getInitials(name: string | null | undefined): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

function formatRelativeDate(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffMs = now - date;
  const diffMin = Math.floor(diffMs / 60_000);
  const diffHr = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);
  const diffWeeks = Math.floor(diffDays / 7);
  const diffMonths = Math.floor(diffDays / 30);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffWeeks < 5) return `${diffWeeks}w ago`;
  return `${diffMonths}mo ago`;
}

function AvatarCircle({
  name,
  size = 28,
}: {
  name: string | null | undefined;
  size?: number;
}) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.accentMuted,
        },
      ]}
    >
      <Text
        style={[
          styles.avatarText,
          { color: colors.accent, fontSize: size * 0.38 },
        ]}
      >
        {getInitials(name)}
      </Text>
    </View>
  );
}

function HeartButton({
  voted,
  count,
  onPress,
}: {
  voted: boolean;
  count: number;
  onPress: () => void;
}) {
  const { colors } = useTheme();
  const scale = useSharedValue(1);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={() => {
        scale.value = withSpring(1.25, { damping: 15, stiffness: 300 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 15, stiffness: 300 });
      }}
      style={[styles.iconButton, animatedStyle]}
      hitSlop={8}
    >
      <Heart
        size={18}
        color={voted ? "#EF4444" : colors.textTertiary}
        fill={voted ? "#EF4444" : "transparent"}
      />
      <Text
        style={[
          styles.iconButtonText,
          { color: voted ? "#EF4444" : colors.textTertiary },
        ]}
      >
        {count}
      </Text>
    </AnimatedPressable>
  );
}

export type FeedbackWallModalProps = {
  visible: boolean;
  onClose: () => void;
  /** Analytics: origin surface (default `home`). */
  entryPoint?: string;
};

export default function FeedbackWallModal({
  visible,
  onClose,
  entryPoint = "home",
}: FeedbackWallModalProps) {
  const { colors, radius, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();

  const [feedbacks, setFeedbacks] = useState<feedbackRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);
  const lastRefreshSignalRef = useRef(getFeedbackWallRefreshSignal());

  const [filter, setFilter] = useState<FilterOption>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [showPill, setShowPill] = useState(false);
  const showPillRef = useRef(false);
  const feedbackBtnBottom = useRef(0);

  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [newFeedbackVisible, setNewFeedbackVisible] = useState(false);
  const [detailFeedback, setDetailFeedback] = useState<FeedbackDetailItem | null>(null);
  const [focusCommentOnDetailOpen, setFocusCommentOnDetailOpen] = useState(false);

  const closeReportModal = () => {
    setReportTargetId(null);
    setReportReason(null);
  };

  const handleConfirmReport = async () => {
    if (!user || !reportTargetId || !reportReason) return;
    setReportSubmitting(true);
    const { error } = await supabase
      .from("feedback_reports")
      .insert({
        feedback_id: reportTargetId,
        user_id: user.id,
        reason: reportReason,
      });
    if (error) {
      Alert.alert("Error", "Failed to submit report. Please try again.");
    } else {
      trackFeedbackReportSubmitted(
        reportTargetId,
        feedbackReportReasonKey(reportReason),
      );
      Alert.alert("Reported", "Thanks for helping keep the community safe.");
    }
    setReportSubmitting(false);
    closeReportModal();
  };

  const fetchAllFeedbacks = useCallback(
    async (offset: number, append: boolean) => {
      const { data, error } = await supabase.rpc("get_feedback_items", {
        page_limit: PAGE_LIMIT,
        page_offset: offset,
      });
      if (error) {
        console.error(error);
        captureDataFetchError(error, "feedback_wall", "fetch_feedback_list", "critical");
        Alert.alert("Error", "Failed to load feedback.");
        return;
      }
      const raw: feedbackRequest[] = data ?? [];
      const results = raw.filter((f) => f.status !== "under_review");
      if (append) {
        setFeedbacks((prev) => [...prev, ...results]);
      } else {
        setFeedbacks(results);
      }
      setHasMore(raw.length === PAGE_LIMIT);
    },
    [],
  );

  const fetchMyFeedbacks = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from("feedback_wall")
      .select("id, title, description, title, posted_by, status, created_at")
      .eq("user_id", user.id)
      .neq("status", "under_review")
      .order("created_at", { ascending: false });

    if (error || !data) {
      if (error) {
        captureDataFetchError(error, "feedback_wall", "fetch_my_feedback", "critical");
      }
      Alert.alert("Error", "Failed to load your feedback.");
      console.error(error);
      setFeedbacks([]);
      setHasMore(false);
      return;
    }

    if (data.length === 0) {
      setFeedbacks([]);
      setHasMore(false);
      return;
    }

    const ids = data.map((d) => d.id);
    const [votesRes, commentsRes, userVotesRes] = await Promise.all([
      supabase.from("feedback_likes").select("feedback_id").in("feedback_id", ids),
      supabase
        .from("feedback_comments")
        .select("feedback_id")
        .in("feedback_id", ids),
      supabase
        .from("feedback_likes")
        .select("feedback_id")
        .in("feedback_id", ids)
        .eq("user_id", user.id),
    ]);

    const voteCounts = new Map<string, number>();
    (votesRes.data ?? []).forEach((v) => {
      voteCounts.set(v.feedback_id, (voteCounts.get(v.feedback_id) ?? 0) + 1);
    });
    const commentCounts = new Map<string, number>();
    (commentsRes.data ?? []).forEach((c) => {
      commentCounts.set(
        c.feedback_id,
        (commentCounts.get(c.feedback_id) ?? 0) + 1,
      );
    });
    const userVotes = new Set(
      (userVotesRes.data ?? []).map((v) => v.feedback_id),
    );

    const enriched: feedbackRequest[] = data.map((item) => ({
      ...item,
      vote_count: voteCounts.get(item.id) ?? 0,
      comment_count: commentCounts.get(item.id) ?? 0,
      user_has_voted: userVotes.has(item.id),
    }));

    setFeedbacks(enriched);
    setHasMore(false);
  }, [user]);

  const refetchForCurrentFilter = useCallback(async () => {
    offsetRef.current = 0;
    if (filter === "mine") {
      await fetchMyFeedbacks();
    } else {
      await fetchAllFeedbacks(0, false);
    }
  }, [filter, fetchAllFeedbacks, fetchMyFeedbacks]);

  useEffect(() => {
    if (visible) {
      trackFeedbackWallOpened(entryPoint);
    }
  }, [visible, entryPoint]);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    (async () => {
      if (!hasLoadedOnceRef.current) {
        setLoading(true);
      }
      await refetchForCurrentFilter();
      if (active) {
        hasLoadedOnceRef.current = true;
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [refetchForCurrentFilter, visible]);

  useFocusEffect(
    useCallback(() => {
      if (!visible) return;
      const signal = getFeedbackWallRefreshSignal();
      if (signal === lastRefreshSignalRef.current) return;
      lastRefreshSignalRef.current = signal;
      void refetchForCurrentFilter();
    }, [visible, refetchForCurrentFilter]),
  );

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore || filter === "mine") return;
    setLoadingMore(true);
    const newOffset = offsetRef.current + PAGE_LIMIT;
    offsetRef.current = newOffset;
    await fetchAllFeedbacks(newOffset, true);
    setLoadingMore(false);
  };

  const sortedFeedbacks = useMemo(() => {
    const sorted = [...feedbacks];
    switch (sortBy) {
      case "most_liked":
        sorted.sort((a, b) => b.vote_count - a.vote_count);
        break;
      case "most_comments":
        sorted.sort((a, b) => b.comment_count - a.comment_count);
        break;
      case "newest":
      default:
        sorted.sort(
          (a, b) =>
            new Date(b.created_at).getTime() -
            new Date(a.created_at).getTime(),
        );
        break;
    }
    return sorted;
  }, [feedbacks, sortBy]);

  const handleVote = async (feedbackId: string, currentlyVoted: boolean) => {
    if (!user) return;
    setFeedbacks((prev) =>
      prev.map((f) =>
        f.id === feedbackId
          ? {
              ...f,
              user_has_voted: !currentlyVoted,
              vote_count: f.vote_count + (currentlyVoted ? -1 : 1),
            }
          : f,
      ),
    );
    if (currentlyVoted) {
      const { error } = await supabase
        .from("feedback_likes")
        .delete()
        .match({ feedback_id: feedbackId, user_id: user.id });
      if (error) {
        setFeedbacks((prev) =>
          prev.map((f) =>
            f.id === feedbackId
              ? { ...f, user_has_voted: true, vote_count: f.vote_count + 1 }
              : f,
          ),
        );
        Alert.alert("Error", "Failed to remove your vote.");
      } else {
        trackFeedbackVote(feedbackId, "unlike");
      }
    } else {
      const { error } = await supabase
        .from("feedback_likes")
        .insert({ feedback_id: feedbackId, user_id: user.id });
      if (error) {
        setFeedbacks((prev) =>
          prev.map((f) =>
            f.id === feedbackId
              ? { ...f, user_has_voted: false, vote_count: f.vote_count - 1 }
              : f,
          ),
        );
        Alert.alert("Error", "Failed to save your vote.");
      } else {
        trackFeedbackVote(feedbackId, "like");
      }
    }
  };

  const handleScroll = useCallback((e: { nativeEvent: { contentOffset: { y: number } } }) => {
    const y = e.nativeEvent.contentOffset.y;
    const shouldShow =
      y > feedbackBtnBottom.current && feedbackBtnBottom.current > 0;
    if (shouldShow !== showPillRef.current) {
      showPillRef.current = shouldShow;
      setShowPill(shouldShow);
    }
  }, []);

  const filterLabel =
    FILTER_OPTIONS.find((f) => f.value === filter)?.label ?? "All Feedback";

  const navigateToDetail = (item: feedbackRequest, focusComment = false) => {
    trackFeedbackItemOpened(item.id);
    setDetailFeedback({
      id: item.id,
      title: item.title ?? item.content ?? "",
      description: item.description ?? "",
      posted_by: item.posted_by ?? "",
      created_at: item.created_at,
      vote_count: item.vote_count,
      user_has_voted: item.user_has_voted,
    });
    setFocusCommentOnDetailOpen(focusComment);
  };

  const ListHeader = () => (
    <View style={{ paddingTop: 8 }}>
      <View style={styles.controlsRow}>
        {SwiftGlassMenu({
          options: FILTER_OPTIONS,
          onSelect: (val) => setFilter(val as FilterOption),
          glassTrigger: {
            variant: "filter",
            title: filterLabel,
            textColor: colors.textPrimary,
            iconColor: colors.textSecondary,
          },
        }) ?? (
          <NativeMenu
            trigger={
              <View
                style={[
                  styles.dropdownTrigger,
                  {
                    backgroundColor: isDark ? colors.accentMuted : colors.surface,
                    boxShadow: isDark
                      ? "0px 2px 8px rgba(0, 0, 0, 0.35)"
                      : "0px 2px 8px rgba(0, 0, 0, 0.12)",
                  },
                ]}
              >
                <Text
                  style={[styles.dropdownLabel, { color: colors.textPrimary }]}
                >
                  {filterLabel}
                </Text>
                <ChevronDown size={16} color={colors.textSecondary} />
              </View>
            }
            options={FILTER_OPTIONS}
            onSelect={(val) => setFilter(val as FilterOption)}
          />
        )}
        {SwiftGlassMenu({
          options: SORT_OPTIONS,
          onSelect: (val) => setSortBy(val as SortOption),
          glassTrigger: { variant: "sortIcons", iconColor: colors.textSecondary },
        }) ?? (
          <NativeMenu
            trigger={
              <View
                style={[
                  styles.dropdownTrigger,
                  {
                    backgroundColor: isDark ? colors.accentMuted : colors.surface,
                    boxShadow: isDark
                      ? "0px 2px 8px rgba(0, 0, 0, 0.35)"
                      : "0px 2px 8px rgba(0, 0, 0, 0.12)",
                  },
                ]}
              >
                <ArrowDownUp size={16} color={colors.textSecondary} />
                <ChevronDown size={14} color={colors.textSecondary} />
              </View>
            }
            options={SORT_OPTIONS}
            onSelect={(val) => setSortBy(val as SortOption)}
          />
        )}
      </View>

      <Pressable
        onPress={() => {
          trackFeedbackWallComposerOpened();
          setNewFeedbackVisible(true);
        }}
        style={[
          styles.feedbackBanner,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            borderRadius: radius.xl,
          },
        ]}
        onLayout={(e) => {
          feedbackBtnBottom.current =
            e.nativeEvent.layout.y + e.nativeEvent.layout.height;
        }}
      >
        <View
          style={[
            styles.feedbackBannerIcon,
            { backgroundColor: colors.accentMuted },
          ]}
        >
          <CirclePlus size={20} color={colors.accent} />
        </View>
        <Text
          style={[styles.feedbackBannerText, { color: colors.textPrimary }]}
        >
          Give Feedback
        </Text>
        <View style={{ flex: 1 }} />
        <ChevronRight size={20} color={colors.textTertiary} />
      </Pressable>
    </View>
  );

  const renderItem = ({
    item,
    index,
  }: {
    item: feedbackRequest;
    index: number;
  }) => {
    const isFirst = index === 0;
    const isLast = index === sortedFeedbacks.length - 1;

    return (
      <Animated.View
        entering={FadeInDown.duration(300).delay(Math.min(index * 50, 500))}
      >
        <View
          style={[
            styles.feedbackListSegment,
            {
              backgroundColor: colors.surface,
              borderColor: colors.borderStrong,
              borderTopLeftRadius: isFirst ? radius.xl : 0,
              borderTopRightRadius: isFirst ? radius.xl : 0,
              borderBottomLeftRadius: isLast ? radius.xl : 0,
              borderBottomRightRadius: isLast ? radius.xl : 0,
              borderTopWidth: isFirst ? 1 : 0,
              borderBottomWidth: isLast ? 1 : 0,
            },
          ]}
        >
          <Pressable
            onPress={() => navigateToDetail(item)}
            style={styles.feedbackItem}
          >
            <Text
              style={[styles.itemTitle, { color: colors.textPrimary }]}
              numberOfLines={2}
            >
              {item.title ?? item.content ?? "Untitled"}
            </Text>
            {!!item.description && (
              <Text
                style={[styles.itemDescription, { color: colors.textSecondary }]}
                numberOfLines={2}
              >
                {item.description}
              </Text>
            )}
            <View style={styles.itemFooter}>
              <View style={styles.itemFooterLeft}>
                <AvatarCircle name={item.posted_by} size={28} />
                <View>
                  <Text
                    style={[styles.posterName, { color: colors.textPrimary }]}
                    numberOfLines={1}
                  >
                    {item.posted_by ?? "Anonymous"}
                  </Text>
                  <Text style={[styles.posterDate, { color: colors.textTertiary }]}>
                    {formatRelativeDate(item.created_at)}
                  </Text>
                </View>
              </View>
              <View style={styles.itemFooterRight}>
                <Pressable
                  onPress={() => setReportTargetId(item.id)}
                  hitSlop={8}
                  style={styles.iconButton}
                >
                  <Flag size={14} color={colors.textTertiary} />
                </Pressable>
                <Pressable
                  onPress={() => navigateToDetail(item, true)}
                  hitSlop={8}
                  style={styles.iconButton}
                >
                  <MessageCircle size={16} color={colors.textTertiary} />
                  <Text
                    style={[
                      styles.iconButtonText,
                      { color: colors.textTertiary },
                    ]}
                  >
                    {item.comment_count}
                  </Text>
                </Pressable>
                <HeartButton
                  voted={item.user_has_voted}
                  count={item.vote_count}
                  onPress={() => handleVote(item.id, item.user_has_voted)}
                />
              </View>
            </View>
          </Pressable>
          {!isLast && (
            <View style={[styles.divider, { backgroundColor: colors.borderStrong }]} />
          )}
        </View>
      </Animated.View>
    );
  };

  const renderFooter = () => {
    if (filter === "mine" || !hasMore) return null;
    return (
      <View style={styles.loadMoreContainer}>
        {loadingMore ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Pressable
            onPress={handleLoadMore}
            style={[
              styles.loadMoreButton,
              {
                backgroundColor: colors.accentMuted,
                borderRadius: radius.md,
              },
            ]}
          >
            <Text style={[styles.loadMoreText, { color: colors.accent }]}>
              Load more
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <View
          style={[
            styles.header,
            {
              borderBottomColor: colors.divider,
              backgroundColor: colors.background,
              paddingTop:
                Platform.OS === "android" ? insets.top + 16 : undefined,
            },
          ]}
        >
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
            Feedback
          </Text>
          {SwiftGlassCloseIconButton({
            onPress: onClose,
            hostStyle: styles.headerAction,
          }) ?? (
            <Pressable onPress={onClose} hitSlop={8} style={styles.headerAction}>
              <X size={20} color={colors.textSecondary} />
            </Pressable>
          )}
        </View>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={sortedFeedbacks}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            ListHeaderComponent={ListHeader}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text
                  style={[styles.emptyText, { color: colors.textSecondary }]}
                >
                  {filter === "mine"
                    ? "You haven't submitted any feedback yet."
                    : "No feedback yet. Be the first!"}
                </Text>
              </View>
            }
            contentContainerStyle={styles.listContent}
            style={styles.list}
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            nestedScrollEnabled
          />
        )}

        {showPill && (
          <Animated.View
            entering={FadeIn.duration(200)}
            exiting={FadeOut.duration(200)}
            style={[
              styles.floatingPill,
              {
                bottom: insets.bottom + 18,
                borderRadius: radius.full,
              },
            ]}
          >
            {SwiftGlassComposerPill({
              label: "Give Feedback",
              onPress: () => {
                trackFeedbackWallComposerOpened();
                setNewFeedbackVisible(true);
              },
              tintHex: colors.accent,
              titleColorHex: colors.textInverse,
            }) ?? (
              <Pressable
                onPress={() => {
                  trackFeedbackWallComposerOpened();
                  setNewFeedbackVisible(true);
                }}
                style={[
                  styles.floatingPillInner,
                  {
                    backgroundColor: colors.accent,
                    borderRadius: radius.full,
                    boxShadow: `0px 4px 20px ${isDark ? "rgba(167, 139, 250, 0.5)" : "rgba(124, 92, 252, 0.4)"}`,
                  },
                ]}
              >
                <CirclePlus size={20} color={colors.textInverse} />
                <Text
                  style={[styles.floatingPillText, { color: colors.textInverse }]}
                >
                  Give Feedback
                </Text>
              </Pressable>
            )}
          </Animated.View>
        )}
      </View>

      <FeedbackDetailModal
        visible={detailFeedback !== null}
        item={detailFeedback}
        focusComment={focusCommentOnDetailOpen}
        onClose={() => {
          setDetailFeedback(null);
          setFocusCommentOnDetailOpen(false);
        }}
      />

      <NewFeedbackItemModal
        visible={newFeedbackVisible}
        onClose={() => setNewFeedbackVisible(false)}
      />

      {/* Report modal */}
      <Modal
        visible={reportTargetId !== null}
        transparent
        animationType="fade"
        onRequestClose={closeReportModal}
      >
        <Pressable style={styles.modalOverlay} onPress={closeReportModal}>
          <Pressable
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.surface,
                borderRadius: radius["2xl"],
              },
            ]}
            onPress={() => {}}
          >
            <View style={styles.modalHeader}>
              <Text
                style={[styles.modalTitle, { color: colors.textPrimary }]}
              >
                Report Feedback
              </Text>
              <Pressable onPress={closeReportModal} hitSlop={8}>
                <X size={20} color={colors.textSecondary} />
              </Pressable>
            </View>

            <Text
              style={[
                styles.modalDescription,
                { color: colors.textSecondary },
              ]}
            >
              Why are you reporting this?
            </Text>

            <NativeMenu
              trigger={
                <View
                  style={[
                    styles.reasonTrigger,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.reasonTriggerText,
                      {
                        color: reportReason
                          ? colors.textPrimary
                          : colors.textTertiary,
                      },
                    ]}
                    numberOfLines={1}
                  >
                    {reportReason ?? "Select a reason..."}
                  </Text>
                  <ChevronDown size={18} color={colors.textTertiary} />
                </View>
              }
              options={REPORT_REASONS.map((r) => ({ label: r, value: r }))}
              onSelect={(val) => setReportReason(val)}
            />

            <Button
              onPress={handleConfirmReport}
              fullWidth
              disabled={!reportReason}
              loading={reportSubmitting}
              variant="danger"
              style={styles.confirmButton}
            >
              Confirm
            </Button>
          </Pressable>
        </Pressable>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
  },
  headerAction: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "Poppins-Medium",
    fontSize: 15,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  controlsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    marginTop: 8,
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  dropdownLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 17,
  },
  feedbackBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  feedbackBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackBannerText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 15,
  },
  feedbackItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  feedbackListSegment: {
    borderLeftWidth: 1,
    borderRightWidth: 1,
    overflow: "hidden",
  },
  itemTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    lineHeight: 23,
  },
  itemDescription: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 20,
    marginTop: 2,
  },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  itemFooterLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
  },
  itemFooterRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  posterName: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
    lineHeight: 17,
  },
  posterDate: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
    lineHeight: 15,
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Poppins-SemiBold",
  },
  iconButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 2,
  },
  iconButtonText: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
  },
  divider: {
    height: 1.25,
  },
  loadMoreContainer: {
    alignItems: "center",
    paddingVertical: 16,
  },
  loadMoreButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  loadMoreText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
  },
  floatingPill: {
    position: "absolute",
    alignSelf: "center",
  },
  floatingPillInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
  },
  floatingPillText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 15,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Poppins-SemiBold",
  },
  modalDescription: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  reasonTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1,
  },
  reasonTriggerText: {
    fontFamily: "Poppins-Regular",
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  confirmButton: {
    marginTop: 20,
  },
});
