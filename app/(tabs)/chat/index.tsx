import Button from "@/components/Button";
import Card from "@/components/Card";
import ThemedBackground from "@/components/ThemedBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { ChatError, createConversationID, deleteConversationId } from "@/utils/ai/chat";
import { trackFeatureOpened, trackUserVisibleError } from "@/utils/analytics";
import { captureChatError, captureDataFetchError } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { Link, router } from "expo-router";
import { Clock3, Lock, MessageCircle, Plus, Trash2 } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn, FadeInDown, FadeInRight } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

type Chat = {
  id: string;
  created_at: string;
  last_message: string | null;
};

export default function ChatIndex() {
  const { colors, radius, shadows, isDark } = useTheme();
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [loading, setLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(true);
  const [isFreePlan, setIsFreePlan] = useState(false);

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    const date = new Date(iso);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const formatTime = (iso?: string) => {
    if (!iso) return "";
    const date = new Date(iso);
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  };

  const fetchSubscriptionPlan = async () => {
    setPlanLoading(true);
    if (!user) {
      trackUserVisibleError("chat", "session_invalid", false);
      setPlanLoading(false);
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_plan")
      .eq("id", user.id)
      .single();

    if (profileError) {
      trackUserVisibleError("chat", "profile_fetch_failed", false);
      captureDataFetchError(profileError, "chat", "fetch_profile", "critical");
      Alert.alert("Error", "There is an issue with your account. Please log out and try again.");
      setPlanLoading(false);
      return null;
    }

    setIsFreePlan(profile.subscription_plan === "free");
    setPlanLoading(false);
    return profile.subscription_plan;
  };

  const fetchChats = async () => {
    setLoading(true);

    if (!user) {
      trackUserVisibleError("chat", "session_invalid", false);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("chats")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      captureDataFetchError(error, "chat", "fetch_chats", "critical");
    } else {
      setChats(data || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    
    fetchSubscriptionPlan().then(() => fetchChats());

    const channel = supabase
      .channel("chats-changes")
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chats" }, (payload) => {
        setChats((prev) =>
          prev.map((chat) => (chat.id === payload.new.id ? { ...chat, ...payload.new } : chat))
        );
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useFocusEffect(
    React.useCallback(() => {
      // Track feature discovery when chat tab is focused
      trackFeatureOpened("chat");
      if (user) {
        fetchSubscriptionPlan().then(() => fetchChats());
      }
    }, [user])
  );

  const sortedChats = useMemo(() => {
    return [...chats].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [chats]);

  async function createNewChat() {
    if (isFreePlan) {
      Alert.alert("Feature Locked", "This feature is not available on free accounts.");
      return;
    }
    if (!user) {
      trackUserVisibleError("chat", "session_invalid", false);
      Alert.alert("Error", "No user found");
      return;
    }

    const { data, error } = await supabase
      .from("chats")
      .insert([{ user_id: user.id }])
      .select()
      .single();

    if (error) {
      trackUserVisibleError("chat", "chat_create_failed", true);
      captureChatError(error, "create_chat");
      Alert.alert("Error", "Could not create new chat");
      return null;
    }

    setChats([...chats, data]);
    router.push(`/chat/${data.id}`);

    try {
      await createConversationID(data.id);
    } catch (err) {
      // Error is already captured in chat.ts
      // Show user-friendly error based on error type
      if (err instanceof ChatError) {
        Alert.alert("Error", "There was an error setting up your chat. Please exit and try again.");
      } else {
        trackUserVisibleError("chat", "cid_create_failed", false);
        captureChatError(err, "create_conversation_id");
        Alert.alert("Error", "There was an error creating your new chat. Please exit and try again.");
      }
    }
  }

  async function deleteChat(chatId: string) {
    if (isFreePlan) {
      Alert.alert("Feature Locked", "This feature is not available on free accounts.");
      return;
    }
    Alert.alert("Delete Chat", "Are you sure you want to delete this chat?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          // Optimistically remove from UI
          const previousChats = chats;
          setChats((prevChats) => prevChats.filter((chat) => chat.id !== chatId));

          try {
            // deleteConversationId handles both OpenAI cleanup and Supabase deletion
            await deleteConversationId(chatId);
          } catch (err) {
            // Restore chats on failure
            setChats(previousChats);
            
            // Error is already captured in chat.ts for ChatError instances
            if (err instanceof ChatError) {
              Alert.alert("Error", "Could not delete chat. Please try again.");
            } else {
              trackUserVisibleError("chat", "chat_delete_failed", true);
              captureChatError(err, "delete_chat");
              Alert.alert("Error", "Could not delete chat");
            }
          }
        },
      },
    ]);
  }

  return (
    <ThemedBackground>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>AI Chat</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Discuss scams, fraud, and cyber crime
            </Text>
          </View>
          <TouchableOpacity
            onPress={createNewChat}
            style={[
              styles.newChatButton,
              {
                backgroundColor: colors.accent,
                borderRadius: radius.full,
                opacity: isFreePlan ? 0.5 : 1,
              },
            ]}
            disabled={isFreePlan}
          >
            <Plus size={20} color={colors.textInverse} />
          </TouchableOpacity>
        </Animated.View>

        {/* Content */}
        <View style={styles.content}>
          {loading || planLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.accent} />
            </View>
          ) : sortedChats.length === 0 ? (
            <Animated.View entering={FadeIn.duration(400)}>
              <Card style={styles.emptyState} pressable={false}>
                <View
                  style={[styles.emptyIconContainer, { backgroundColor: colors.accentMuted }]}
                >
                  <MessageCircle size={32} color={colors.accent} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                  No conversations yet
                </Text>
                <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                  Start a new chat to get tailored guidance on scams and fraud
                </Text>
                <Button
                  onPress={createNewChat}
                  disabled={isFreePlan}
                  icon={<Plus size={18} color={colors.textInverse} />}
                  style={{ marginTop: 8 }}
                >
                  Start chatting
                </Button>
              </Card>
            </Animated.View>
          ) : (
            <FlatList
              data={sortedChats}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
              renderItem={({ item, index }) => (
                <Animated.View entering={FadeInRight.duration(300).delay(index * 50)}>
                  <Card style={styles.chatCard}>
                    {isFreePlan ? (
                      <View style={styles.chatCardBody}>
                        <View style={styles.chatCardHeader}>
                          <Text style={[styles.chatDate, { color: colors.textPrimary }]}>
                            {formatDate(item.created_at)}
                          </Text>
                          <View
                            style={[styles.chatPill, { backgroundColor: colors.accentMuted }]}
                          >
                            <Text style={[styles.chatPillText, { color: colors.accent }]}>
                              Saved
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[styles.chatMessage, { color: colors.textSecondary }]}
                          numberOfLines={2}
                        >
                          {item.last_message || "No messages yet"}
                        </Text>
                        <View style={styles.chatCardFooter}>
                          <Clock3 size={14} color={colors.textTertiary} />
                          <Text style={[styles.chatTime, { color: colors.textTertiary }]}>
                            {formatTime(item.created_at)}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <Link href={`/chat/${item.id}`} asChild>
                        <Pressable style={styles.chatCardBody}>
                          <View style={styles.chatCardHeader}>
                            <Text style={[styles.chatDate, { color: colors.textPrimary }]}>
                              {formatDate(item.created_at)}
                            </Text>
                            <View
                              style={[styles.chatPill, { backgroundColor: colors.accentMuted }]}
                            >
                              <Text style={[styles.chatPillText, { color: colors.accent }]}>
                                Saved
                              </Text>
                            </View>
                          </View>
                          <Text
                            style={[styles.chatMessage, { color: colors.textSecondary }]}
                            numberOfLines={2}
                          >
                            {item.last_message || "No messages yet"}
                          </Text>
                          <View style={styles.chatCardFooter}>
                            <Clock3 size={14} color={colors.textTertiary} />
                            <Text style={[styles.chatTime, { color: colors.textTertiary }]}>
                              {formatTime(item.created_at)}
                            </Text>
                          </View>
                        </Pressable>
                      </Link>
                    )}
                    <TouchableOpacity
                      onPress={() => deleteChat(item.id)}
                      style={[
                        styles.deleteButton,
                        {
                          backgroundColor: colors.errorMuted,
                          borderRadius: radius.md,
                          opacity: isFreePlan ? 0.5 : 1,
                        },
                      ]}
                      disabled={isFreePlan}
                    >
                      <Trash2 size={18} color={colors.error} />
                    </TouchableOpacity>
                  </Card>
                </Animated.View>
              )}
            />
          )}

          {/* Lock Overlay */}
          {isFreePlan && !planLoading && (
            <View style={[styles.lockOverlay, { backgroundColor: "rgba(0,0,0,0.7)" }]}>
              <Lock size={40} color="white" />
              <Text style={styles.lockTitle}>Feature Locked</Text>
              <Text style={styles.lockSubtitle}>
                Scamly's advanced AI chat model is not available on free accounts.
              </Text>
            </View>
          )}
        </View>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 28,
  },
  headerSubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    marginTop: 2,
  },
  newChatButton: {
    width: 48,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    position: "relative",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
    gap: 12,
  },
  emptyIconContainer: {
    width: 72,
    height: 72,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 18,
    textAlign: "center",
  },
  emptySubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  listContent: {
    paddingBottom: 24,
  },
  chatCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  chatCardBody: {
    flex: 1,
    gap: 8,
  },
  chatCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  chatDate: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 14,
  },
  chatPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chatPillText: {
    fontFamily: "Poppins-Medium",
    fontSize: 11,
  },
  chatMessage: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  chatCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  chatTime: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
  },
  deleteButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  lockOverlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    paddingHorizontal: 32,
    borderRadius: 20,
  },
  lockTitle: {
    color: "white",
    fontFamily: "Poppins-Bold",
    fontSize: 20,
    textAlign: "center",
  },
  lockSubtitle: {
    color: "rgba(255,255,255,0.8)",
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
