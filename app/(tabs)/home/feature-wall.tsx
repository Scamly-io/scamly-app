import Button from "@/components/Button";
import Card from "@/components/Card";
import ThemedBackground from "@/components/ThemedBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { supabase } from "@/utils/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { ChevronDown, Flag, Heart, Plus, X } from "lucide-react-native";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type FeatureRequest = {
  id: string;
  title?: string | null;
  description?: string | null;
  content?: string | null;
  status: string;
  created_at: string;
  vote_count: number;
  user_has_voted: boolean;
};

const PAGE_LIMIT = 20;

const REPORT_REASONS = [
  "Spam / Promotional content",
  "Fraud / Scam / Misleading",
  "Harassment / Abuse",
  "Hate Speech / Discrimination",
  "Off-topic / Irrelevant",
  "Inappropriate / NSFW content",
  "Other",
] as const;

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

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

  const handlePressIn = () => {
    scale.value = withSpring(1.25, { damping: 15, stiffness: 300 });
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[styles.heartButton, animatedStyle]}
      hitSlop={8}
    >
      <Heart
        size={20}
        color={voted ? "#EF4444" : colors.textTertiary}
        fill={voted ? "#EF4444" : "transparent"}
      />
      <Text
        style={[
          styles.voteCount,
          { color: voted ? "#EF4444" : colors.textSecondary },
        ]}
      >
        {count}
      </Text>
    </AnimatedPressable>
  );
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function FeatureWall() {
  const { colors, radius } = useTheme();
  const { user } = useAuth();
  const [features, setFeatures] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const offsetRef = useRef(0);

  const fetchFeatures = useCallback(
    async (offset: number, append: boolean) => {
      const { data, error } = await supabase.rpc("get_feature_requests", {
        page_limit: PAGE_LIMIT,
        page_offset: offset,
      });

      if (error) {
        Alert.alert("Error", "Failed to load feature requests.");
        return;
      }

      const raw: FeatureRequest[] = data ?? [];
      const results = raw.filter((f) => f.status !== "under_review");
      if (append) {
        setFeatures((prev) => [...prev, ...results]);
      } else {
        setFeatures(results);
      }
      setHasMore(raw.length === PAGE_LIMIT);
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        setLoading(true);
        offsetRef.current = 0;
        await fetchFeatures(0, false);
        if (active) setLoading(false);
      })();
      return () => {
        active = false;
      };
    }, [fetchFeatures]),
  );

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const newOffset = offsetRef.current + PAGE_LIMIT;
    offsetRef.current = newOffset;
    await fetchFeatures(newOffset, true);
    setLoadingMore(false);
  };

  const handleVote = async (featureId: string, currentlyVoted: boolean) => {
    if (!user) return;

    setFeatures((prev) =>
      prev.map((f) =>
        f.id === featureId
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
        .from("feature_votes")
        .delete()
        .match({ feature_id: featureId, user_id: user.id });

      if (error) {
        setFeatures((prev) =>
          prev.map((f) =>
            f.id === featureId
              ? { ...f, user_has_voted: true, vote_count: f.vote_count + 1 }
              : f,
          ),
        );
        Alert.alert("Error", "Failed to remove your vote. Please try again.");
      }
    } else {
      const { error } = await supabase
        .from("feature_votes")
        .insert({ feature_id: featureId, user_id: user.id });

      if (error) {
        setFeatures((prev) =>
          prev.map((f) =>
            f.id === featureId
              ? { ...f, user_has_voted: false, vote_count: f.vote_count - 1 }
              : f,
          ),
        );
        Alert.alert("Error", "Failed to save your vote. Please try again.");
      }
    }
  };

  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState<string | null>(null);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reasonPickerOpen, setReasonPickerOpen] = useState(false);

  const closeReportModal = () => {
    setReportTargetId(null);
    setReportReason(null);
    setReasonPickerOpen(false);
  };

  const handleConfirmReport = async () => {
    if (!user || !reportTargetId || !reportReason) return;
    setReportSubmitting(true);
    const { error } = await supabase
      .from("feature_reports")
      .insert({ feature_id: reportTargetId, user_id: user.id, reason: reportReason });

    if (error) {
      Alert.alert("Error", "Failed to submit report. Please try again.");
    } else {
      Alert.alert("Reported", "Thanks for helping keep the community safe.");
    }
    setReportSubmitting(false);
    closeReportModal();
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: FeatureRequest;
    index: number;
  }) => (
    <Animated.View
      entering={FadeInDown.duration(300).delay(Math.min(index * 50, 500))}
    >
      <Card style={styles.featureCard}>
        <View style={styles.featureContent}>
          <Text
            style={[styles.featureTitle, { color: colors.textPrimary }]}
            numberOfLines={2}
          >
            {item.title ?? item.content ?? "Untitled feature"}
          </Text>
          {!!item.description && (
            <Text
              style={[styles.featureDescription, { color: colors.textSecondary }]}
            >
              {item.description}
            </Text>
          )}
          <View style={styles.featureMeta}>
            <View style={styles.featureMetaLeft}>
              <Text style={[styles.featureDate, { color: colors.textTertiary }]}>
                {formatDate(item.created_at)}
              </Text>
              <Pressable
                onPress={() => setReportTargetId(item.id)}
                hitSlop={8}
                style={styles.flagButton}
              >
                <Flag size={12} color={colors.error} />
                <Text style={[styles.flagText, { color: colors.error }]}>
                  Report
                </Text>
              </Pressable>
            </View>
            <HeartButton
              voted={item.user_has_voted}
              count={item.vote_count}
              onPress={() => handleVote(item.id, item.user_has_voted)}
            />
          </View>
        </View>
      </Card>
    </Animated.View>
  );

  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <View style={styles.loadMoreContainer}>
        {loadingMore ? (
          <ActivityIndicator size="small" color={colors.accent} />
        ) : (
          <Pressable
            onPress={handleLoadMore}
            style={[
              styles.loadMoreButton,
              { backgroundColor: colors.accentMuted, borderRadius: radius.md },
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
    <ThemedBackground>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.divider }]}>
          <View style={styles.headerTextContainer}>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>
              Feature Requests
            </Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              See and post public feature requests for Scamly
            </Text>
          </View>
          <Pressable
            onPress={() => router.back()}
            hitSlop={8}
            style={styles.closeButton}
          >
            <X size={22} color={colors.textPrimary} />
          </Pressable>
        </View>

        {/* Content */}
        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={colors.accent} />
          </View>
        ) : features.length === 0 ? (
          <View style={styles.centered}>
            <Text
              style={[styles.emptyText, { color: colors.textSecondary }]}
            >
              No feature requests yet. Be the first!
            </Text>
          </View>
        ) : (
          <FlatList
            data={features}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            ListFooterComponent={renderFooter}
          />
        )}

        {/* Bottom button */}
        <View
          style={[
            styles.bottomBar,
            { borderTopColor: colors.divider, backgroundColor: colors.background },
          ]}
        >
          <SafeAreaView edges={["bottom"]}>
            <Button
              onPress={() => router.push("/home/new-feature-request")}
              fullWidth
              icon={<Plus size={18} color={colors.textInverse} />}
            >
              Add Feature Request
            </Button>
          </SafeAreaView>
        </View>
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
                { backgroundColor: colors.surface, borderRadius: radius["2xl"] },
              ]}
              onPress={() => {}}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: colors.textPrimary }]}>
                  Report Feature
                </Text>
                <Pressable onPress={closeReportModal} hitSlop={8}>
                  <X size={20} color={colors.textSecondary} />
                </Pressable>
              </View>

              <Text style={[styles.modalDescription, { color: colors.textSecondary }]}>
                Why are you reporting this feature request?
              </Text>

              {/* Reason dropdown */}
              <Pressable
                onPress={() => setReasonPickerOpen(!reasonPickerOpen)}
                style={[
                  styles.dropdown,
                  {
                    backgroundColor: colors.backgroundSecondary,
                    borderColor: colors.border,
                    borderRadius: radius.md,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.dropdownText,
                    { color: reportReason ? colors.textPrimary : colors.textTertiary },
                  ]}
                  numberOfLines={1}
                >
                  {reportReason ?? "Select a reason..."}
                </Text>
                <ChevronDown size={18} color={colors.textTertiary} />
              </Pressable>

              {reasonPickerOpen && (
                <ScrollView
                  style={[
                    styles.reasonList,
                    {
                      backgroundColor: colors.backgroundSecondary,
                      borderColor: colors.border,
                      borderRadius: radius.md,
                    },
                  ]}
                >
                  {REPORT_REASONS.map((reason) => (
                    <Pressable
                      key={reason}
                      style={({ pressed }) => [
                        styles.reasonOption,
                        {
                          backgroundColor: pressed
                            ? colors.pressedOverlay
                            : "transparent",
                          borderBottomColor: colors.divider,
                        },
                      ]}
                      onPress={() => {
                        setReportReason(reason);
                        setReasonPickerOpen(false);
                      }}
                    >
                      <Text style={[styles.reasonOptionText, { color: colors.textPrimary }]}>
                        {reason}
                      </Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}

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
      </SafeAreaView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: '#000000'
  },
  headerTextContainer: {
    flex: 1,
    paddingRight: 12,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  headerTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 17,
  },
  headerSubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    lineHeight: 19,
    marginTop: 2,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 40,
  },
  emptyText: {
    fontFamily: "Poppins-Medium",
    fontSize: 15,
    textAlign: "center",
  },
  listContent: {
    padding: 20,
    paddingBottom: 100,
    gap: 12,
  },
  featureCard: {
    padding: 16,
  },
  featureContent: {
    gap: 4,
  },
  featureTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 15,
    lineHeight: 22,
  },
  featureDescription: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    lineHeight: 19,
  },
  featureMeta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
  },
  featureMetaLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureDate: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
  },
  flagButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    padding: 2,
  },
  flagText: {
    fontFamily: "Poppins-Medium",
    fontSize: 12,
  },
  heartButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: 4,
  },
  voteCount: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
  },
  loadMoreContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  loadMoreButton: {
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  loadMoreText: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
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
  dropdown: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    height: 50,
    borderWidth: 1,
  },
  dropdownText: {
    fontFamily: "Poppins-Regular",
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  reasonList: {
    maxHeight: 220,
    borderWidth: 1,
    marginTop: 8,
  },
  reasonOption: {
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  reasonOptionText: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
  },
  confirmButton: {
    marginTop: 20,
  },
});
