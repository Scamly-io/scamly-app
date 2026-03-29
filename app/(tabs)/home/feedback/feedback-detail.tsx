import ThemedBackground from "@/components/ThemedBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { supabase } from "@/utils/supabase";
import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Heart, MessageCircle, Send } from "lucide-react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Comment = {
  id: string;
  user_id: string;
  feedback_id: string;
  content: string;
  posted_by: string;
  created_at: string;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const logo = require("@/assets/images/page-images/icon.png");

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

export default function FeedbackDetail() {
  const { colors, radius } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    id: string;
    title: string;
    description: string;
    posted_by: string;
    created_at: string;
    vote_count: string;
    comment_count: string;
    user_has_voted: string;
    focusComment: string;
  }>();

  const feedbackId = params.id;
  const title = params.title || "Untitled";
  const description = params.description || "";
  const postedBy = params.posted_by || "";
  const createdAt = params.created_at || "";
  const shouldFocusComment = params.focusComment === "true";

  const [voteCount, setVoteCount] = useState(Number(params.vote_count) || 0);
  const [voted, setVoted] = useState(params.user_has_voted === "true");
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(true);
  const [commentText, setCommentText] = useState("");
  const [posting, setPosting] = useState(false);
  const inputBarBottomPadding = Platform.OS === "ios" ? insets.bottom + 8 : 8;

  const commentInputRef = useRef<TextInput>(null);

  const voteScale = useSharedValue(1);
  const voteAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: voteScale.value }],
  }));

  const fetchComments = useCallback(async () => {
    const { data, error } = await supabase
      .from("feedback_comments")
      .select("*")
      .eq("feedback_id", feedbackId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setComments(data);
    }
    setLoadingComments(false);
  }, [feedbackId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  useEffect(() => {
    if (shouldFocusComment && !loadingComments) {
      setTimeout(() => {
        commentInputRef.current?.focus();
      }, 400);
    }
  }, [shouldFocusComment, loadingComments]);

  const handleVote = async () => {
    if (!user) return;
    const wasVoted = voted;
    setVoted(!wasVoted);
    setVoteCount((c) => c + (wasVoted ? -1 : 1));

    if (wasVoted) {
      const { error } = await supabase
        .from("feedback_likes")
        .delete()
        .match({ feedback_id: feedbackId, user_id: user.id });
      if (error) {
        setVoted(true);
        setVoteCount((c) => c + 1);
        Alert.alert("Error", "Failed to remove your vote.");
      }
    } else {
      const { error } = await supabase
        .from("feedback_likes")
        .insert({ feedback_id: feedbackId, user_id: user.id });
      if (error) {
        setVoted(false);
        setVoteCount((c) => c - 1);
        Alert.alert("Error", "Failed to save your vote.");
      }
    }
  };

  const handlePostComment = async () => {
    if (!user || !commentText.trim()) return;
    setPosting(true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("first_name")
      .eq("id", user.id)
      .single();

    const { error } = await supabase.from("feedback_comments").insert({
      feedback_id: feedbackId,
      user_id: user.id,
      content: commentText.trim(),
      posted_by: profile?.first_name ?? "Anonymous",
    });

    if (error) {
      Alert.alert("Error", "Failed to post comment.");
    } else {
      setCommentText("");
      await fetchComments();
    }
    setPosting(false);
  };

  const renderComment = ({
    item,
    index,
  }: {
    item: Comment;
    index: number;
  }) => (
    <Animated.View
      entering={FadeInDown.duration(250).delay(Math.min(index * 40, 400))}
    >
      <View style={styles.commentItem}>
        <View style={styles.commentHeader}>
          <View style={styles.commentAuthorRow}>
            <AvatarCircle name={item.posted_by} size={24} />
            <Text
              style={[styles.commentAuthor, { color: colors.textPrimary }]}
            >
              {item.posted_by}
            </Text>
          </View>
          <Text style={[styles.commentTime, { color: colors.textTertiary }]}>
            {formatRelativeDate(item.created_at)}
          </Text>
        </View>
        <Text style={[styles.commentContent, { color: colors.textSecondary }]}>
          {item.content}
        </Text>
      </View>
      <View
        style={[styles.commentDivider, { backgroundColor: colors.divider }]}
      />
    </Animated.View>
  );

  const ListHeader = () => (
    <View style={styles.detailSection}>
      <Text style={[styles.detailTitle, { color: colors.textPrimary }]}>
        {title}
      </Text>

      {!!description && (
        <Text
          style={[styles.detailDescription, { color: colors.textSecondary }]}
        >
          {description}
        </Text>
      )}

      <View style={styles.detailPosterRow}>
        <AvatarCircle name={postedBy} size={32} />
        <View>
          <Text style={[styles.detailPosterName, { color: colors.textPrimary }]}>
            {postedBy || "Anonymous"}
          </Text>
          {!!createdAt && (
            <Text
              style={[styles.detailPosterDate, { color: colors.textTertiary }]}
            >
              {formatRelativeDate(createdAt)}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.detailStats}>
        <AnimatedPressable
          onPress={handleVote}
          onPressIn={() => {
            voteScale.value = withSpring(1.15, {
              damping: 15,
              stiffness: 300,
            });
          }}
          onPressOut={() => {
            voteScale.value = withSpring(1, { damping: 15, stiffness: 300 });
          }}
          style={[
            styles.statPill,
            voteAnimatedStyle,
            {
              backgroundColor: voted
                ? "rgba(239, 68, 68, 0.12)"
                : colors.accentMuted,
              borderRadius: radius.md,
            },
          ]}
          hitSlop={4}
        >
          <Heart
            size={16}
            color={voted ? "#EF4444" : colors.textSecondary}
            fill={voted ? "#EF4444" : "transparent"}
          />
          <Text
            style={[
              styles.statText,
              { color: voted ? "#EF4444" : colors.textSecondary },
            ]}
          >
            {voteCount}
          </Text>
        </AnimatedPressable>

        <View
          style={[
            styles.statPill,
            {
              backgroundColor: colors.accentMuted,
              borderRadius: radius.md,
            },
          ]}
        >
          <MessageCircle size={16} color={colors.textSecondary} />
          <Text style={[styles.statText, { color: colors.textSecondary }]}>
            {comments.length}
          </Text>
        </View>
      </View>

      <View
        style={[
          styles.sectionDivider,
          { backgroundColor: colors.divider },
        ]}
      />

      <Text style={[styles.commentsHeading, { color: colors.textPrimary }]}>
        Comments
      </Text>
    </View>
  );

  return (
    <ThemedBackground>
      {/* Fixed header */}
      <View
        style={[
          styles.fixedHeader,
          { paddingTop: insets.top + 8, backgroundColor: colors.background },
        ]}
      >
        <Pressable
          onPress={() => router.back()}
          hitSlop={8}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color={colors.textPrimary} />
        </Pressable>
        <Image source={logo} style={styles.logo} contentFit="contain" />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
        keyboardVerticalOffset={0}
      >
        {loadingComments ? (
          <View style={[styles.centered, { paddingTop: insets.top + 80 }]}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            renderItem={renderComment}
            ListHeaderComponent={ListHeader}
            contentContainerStyle={[
              styles.listContent,
              { paddingTop: insets.top + 52 },
            ]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              <View style={styles.emptyComments}>
                <Text
                  style={[styles.emptyText, { color: colors.textTertiary }]}
                >
                  No comments yet. Be the first to share your thoughts!
                </Text>
              </View>
            }
          />
        )}

        {/* Comment input */}
        <View
          style={[
            styles.inputBar,
            {
              borderTopColor: colors.divider,
              backgroundColor: colors.background,
              paddingBottom: inputBarBottomPadding,
            },
          ]}
        >
          <View style={styles.inputBarInner}>
            <TextInput
              ref={commentInputRef}
              style={[
                styles.commentInput,
                {
                  color: colors.textPrimary,
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radius.md,
                },
              ]}
              placeholder="Add a comment..."
              placeholderTextColor={colors.textTertiary}
              value={commentText}
              onChangeText={setCommentText}
              maxLength={500}
              multiline
            />
            <Pressable
              onPress={handlePostComment}
              disabled={!commentText.trim() || posting}
              hitSlop={8}
              style={[
                styles.sendButton,
                {
                  backgroundColor:
                    commentText.trim() && !posting
                      ? colors.accent
                      : colors.accentMuted,
                  borderRadius: radius.md,
                },
              ]}
            >
              {posting ? (
                <ActivityIndicator size="small" color={colors.textInverse} />
              ) : (
                <Send
                  size={18}
                  color={
                    commentText.trim()
                      ? colors.textInverse
                      : colors.textTertiary
                  }
                />
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },
  fixedHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  backButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  logo: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  headerSpacer: {
    width: 32,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  detailSection: {
    marginBottom: 8,
  },
  detailTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 22,
    lineHeight: 30,
    marginBottom: 8,
  },
  detailDescription: {
    fontFamily: "Poppins-Regular",
    fontSize: 15,
    lineHeight: 23,
    marginBottom: 16,
  },
  detailPosterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  detailPosterName: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    lineHeight: 18,
  },
  detailPosterDate: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  detailStats: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  statText: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
  },
  sectionDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  commentsHeading: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
    marginBottom: 12,
  },
  commentItem: {
    paddingVertical: 12,
  },
  commentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  commentAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  commentAuthor: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 13,
  },
  commentTime: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
  },
  commentContent: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 21,
    marginLeft: 32,
  },
  commentDivider: {
    height: StyleSheet.hairlineWidth,
  },
  emptyComments: {
    paddingVertical: 24,
    alignItems: "center",
  },
  emptyText: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    textAlign: "center",
  },
  inputBar: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputBarInner: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  commentInput: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 100,
  },
  sendButton: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  avatar: {
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontFamily: "Poppins-SemiBold",
  },
});
