import ChatInputBar from "@/components/ChatInputBar";
import MessageBlock, { ChatMessage } from "@/components/MessageBlock";
import ThemedBackground from "@/components/ThemedBackground";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import { useTheme } from "@/theme";
import { ChatError, generateResponse } from "@/utils/ai/chat";
import { trackUserVisibleError } from "@/utils/analytics";
import { captureDataFetchError } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import uuid from "react-native-uuid";

const THINKING_TOKEN = "__thinking__";

export default function ChatDetail() {
  const { colors, radius, shadows, isDark } = useTheme();
  const { id: chatId } = useLocalSearchParams<{ id: string }>();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [createdAt, setCreatedAt] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [input, setInput] = useState<string>("");
  const [conversationId, setConversationId] = useState<string>("");
  const [planLoading, setPlanLoading] = useState<boolean>(true);
  const [isFreePlan, setIsFreePlan] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>("");

  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  useEffect(() => {
    const fetchSubscriptionPlan = async () => {
      setPlanLoading(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        captureDataFetchError(userError || new Error("No user found"), "chat", "get_user", "critical");
        trackUserVisibleError("chat", "session_invalid", false);
        Alert.alert("Error", "No user found");
        setPlanLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("subscription_plan")
        .eq("id", user.id)
        .single();

      if (profileError) {
        captureDataFetchError(profileError, "chat", "fetch_profile", "critical");
        trackUserVisibleError("chat", "profile_fetch_failed", false);
        Alert.alert("Error", "There is an issue with your account. Please log out and try again.");
        setPlanLoading(false);
        return;
      }

      setIsFreePlan(profile.subscription_plan === "free");
      setPlanLoading(false);
    };

    fetchSubscriptionPlan();
  }, []);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!chatId) return;
      if (isFreePlan || planLoading) return;

      setLoading(true);

      const [fetchCid, fetchMessages, fetchDate] = await Promise.all([
        supabase.from("chats").select("openai_conversation_id").eq("id", chatId).single(),
        supabase
          .from("messages")
          .select("id, role, content, created_at")
          .eq("chat_id", chatId)
          .order("created_at", { ascending: true }),
        supabase.from("chats").select("created_at").eq("id", chatId).single(),
      ]);

      if (!fetchCid.error) setConversationId(fetchCid.data.openai_conversation_id);
      if (!fetchMessages.error) setMessages(fetchMessages.data || []);
      if (!fetchDate.error) setCreatedAt(fetchDate.data.created_at);

      setLoading(false);
    };

    fetchMessages();
  }, [chatId, isFreePlan, planLoading]);

  const renderItem = useCallback(
    ({ item }: { item: ChatMessage }) => {
      if (item.role === "assistant" && item.content === THINKING_TOKEN) {
        return (
          <View style={styles.thinkingRow}>
            <View
              style={[styles.avatar, { backgroundColor: colors.accentMuted, borderRadius: radius.sm }]}
            >
              <Text style={[styles.avatarLabel, { color: colors.accent }]}>AI</Text>
            </View>
            <ThinkingIndicator />
          </View>
        );
      }
      return <MessageBlock message={item} />;
    },
    [colors, radius.sm]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(timeout);
  }, [messages]);

  // Scroll to bottom when keyboard opens
  useEffect(() => {
    const keyboardEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const subscription = Keyboard.addListener(keyboardEvent, () => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });

    return () => subscription.remove();
  }, []);

  function displayErrorMessage(typingMessage: ChatMessage, errorMessage: string) {
    setMessages((prev) => {
      return prev.map((msg) =>
        msg.id === typingMessage.id
          ? { ...msg, content: errorMessage }
          : msg
      );
    });
  }

  function getErrorMessage(error: unknown): string {
    if (error instanceof ChatError) {
      switch (error.stage) {
        case "subscription_check":
          return "Sorry, I couldn't verify your account. Please try again.";
        case "db_write":
          return "Sorry, I couldn't save your message. Please check your connection and try again.";
        case "ai_response":
          return "Sorry, I encountered an error generating a response. Please try again.";
        default:
          return "Sorry, something went wrong. Please try again later.";
      }
    }
    return "Sorry, something went wrong. Please try again later.";
  }

  async function processMessage() {
    if (isFreePlan) {
      Alert.alert("Upgrade required", "AI Chat is available on paid plans.");
      return;
    }
    const content = input.trim();
    if (!content) return;

    const userMessage = {
      id: uuid.v4().toString(),
      role: "user" as const,
      content,
      created_at: new Date().toISOString(),
    };

    const typingMessage = {
      id: uuid.v4().toString(),
      role: "assistant" as const,
      content: THINKING_TOKEN,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage, typingMessage]);
    setInput("");

    try {
      const response = await generateResponse(content, chatId, conversationId, userId);

      setMessages((prev) => {
        return prev.map((msg) =>
          msg.id === typingMessage.id ? { ...msg, content: response } : msg
        );
      });
    } catch (error) {
      // Error is already captured to Sentry and tracked in PostHog by chat.ts
      // Just display the appropriate error message to the user
      const errorMessage = getErrorMessage(error);
      displayErrorMessage(typingMessage, errorMessage);
    }
  }

  if (loading || planLoading) {
    return (
      <ThemedBackground>
        <SafeAreaView edges={["top", "bottom", "left", "right"]} style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </SafeAreaView>
      </ThemedBackground>
    );
  }

  if (isFreePlan) {
    return (
      <ThemedBackground>
        <SafeAreaView edges={["top", "bottom", "left", "right"]} style={styles.lockContainer}>
          <Text style={[styles.lockTitle, { color: colors.textPrimary }]}>
            AI Chat is for paid plans
          </Text>
          <Text style={[styles.lockSubtitle, { color: colors.textSecondary }]}>
            Upgrade to continue this conversation
          </Text>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.accentMuted }]}
            onPress={() => router.push("/chat")}
          >
            <ArrowLeft size={18} color={colors.accent} />
            <Text style={[styles.backLabel, { color: colors.accent }]}>Back to Chats</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </ThemedBackground>
    );
  }

  return (
    <ThemedBackground>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={-20}
      >
        <SafeAreaView edges={["top", "bottom", "left", "right"]} style={styles.container}>
          <Animated.View
            entering={FadeIn.duration(300)}
            style={[
              styles.sheet,
              {
                backgroundColor: isDark ? colors.surface : colors.surface,
                borderRadius: radius["2xl"],
                ...shadows.lg,
              },
            ]}
          >
            {/* Header */}
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={[
                  styles.backButton,
                  { backgroundColor: colors.backgroundSecondary, borderRadius: radius.md },
                ]}
                onPress={() => router.push("/chat")}
              >
                <ArrowLeft size={18} color={colors.textPrimary} />
                <Text style={[styles.backLabel, { color: colors.textPrimary }]}>Chats</Text>
              </TouchableOpacity>
              <Text style={[styles.timestamp, { color: colors.textTertiary }]}>
                {new Date(createdAt || "").toLocaleDateString()}
              </Text>
            </View>

            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.textPrimary }]}>Chat with Scamly</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Get advice on scams, fraud, and cyber safety
              </Text>
            </View>

            {/* Messages */}
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItem}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
              contentContainerStyle={styles.listContent}
              removeClippedSubviews
              initialNumToRender={20}
              maxToRenderPerBatch={20}
              windowSize={7}
              ListEmptyComponent={
                <View
                  style={[styles.emptyState, { backgroundColor: colors.accentMuted, borderRadius: radius.lg }]}
                >
                  <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>
                    No messages yet
                  </Text>
                  <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                    Ask a question to get personalised guidance from Scamly
                  </Text>
                </View>
              }
            />
          </Animated.View>

          {/* Input */}
          <View style={styles.inputWrapper}>
            <ChatInputBar
              value={input}
              onChangeText={setInput}
              onSend={processMessage}
              placeholder="Ask Scamly about scams, fraud, or cyber crime..."
              disabled={planLoading}
            />
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  lockContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  lockTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 20,
    textAlign: "center",
  },
  lockSubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 16,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  sheet: {
    flex: 1,
    padding: 16,
    marginTop: 8,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
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
  timestamp: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
  },
  titleRow: {
    marginBottom: 16,
  },
  title: {
    fontFamily: "Poppins-Bold",
    fontSize: 20,
  },
  subtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    marginTop: 2,
  },
  listContent: {
    paddingBottom: 16,
    paddingVertical: 8,
    gap: 14,
  },
  thinkingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 11,
  },
  emptyState: {
    padding: 20,
    gap: 6,
  },
  emptyTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 16,
  },
  emptySubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 20,
  },
  inputWrapper: {
    marginTop: 8,
    paddingBottom: 4,
  },
});
