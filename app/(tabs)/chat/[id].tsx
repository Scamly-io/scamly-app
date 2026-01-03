import ChatInputBar from "@/components/ChatInputBar";
import ThemedBackground from "@/components/ThemedBackground";
import MessageBlock, { ChatMessage } from "@/components/MessageBlock";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import { useTheme } from "@/theme";
import { supabase } from "@/utils/supabase";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
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
        console.error("No user:", userError);
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
        console.error("Error fetching user profile:", profileError);
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
    [colors]
  );

  useEffect(() => {
    const timeout = setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(timeout);
  }, [messages]);

  function displayErrorMessage(typingMessage: ChatMessage) {
    setMessages((prev) => {
      return prev.map((msg) =>
        msg.id === typingMessage.id
          ? { ...msg, content: "Sorry, I encountered an error. Please try again later." }
          : msg
      );
    });
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
      const res = await fetch(
        `https://27ui2kcryi.execute-api.ap-southeast-2.amazonaws.com/dev/get-ai-response`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, chatId, conversationId, userId }),
        }
      );

      if (!res.ok) {
        displayErrorMessage(typingMessage);
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();

      setMessages((prev) => {
        return prev.map((msg) =>
          msg.id === typingMessage.id ? { ...msg, content: data.fullText } : msg
        );
      });
    } catch (error) {
      console.error("Error getting response from lambda: ", error);
      displayErrorMessage(typingMessage);
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
