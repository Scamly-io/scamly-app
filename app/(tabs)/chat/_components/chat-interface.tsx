import ChatChromeIconButton from "@/components/chat-chrome-icon-button";
import ChatGlassInputBar from "@/components/chat-glass-input-bar";
import ChatHistoryDrawer from "@/components/chat-history-drawer";
import MessageBlock, { type ChatMessage } from "@/components/MessageBlock";
import ThemedBackground from "@/components/ThemedBackground";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import type { Message as StoreMessage } from "@/store/chatStore";
import { useChatStore } from "@/store/chatStore";
import { useTheme } from "@/theme";
import { ChatError, deleteConversationId, getAiChatEdgeFunctionUrl } from "@/utils/ai/chat";
import { trackUserVisibleError } from "@/utils/analytics";
import {
  clearChatHistoryCache,
  getChatHistoryCache,
  setChatHistoryCache,
} from "@/utils/chat-history-cache";
import { captureChatError, captureDataFetchError } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { Menu, X } from "lucide-react-native";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, BackHandler, FlatList, Platform, StyleSheet, Text, View } from "react-native";
import { KeyboardAvoidingView, KeyboardGestureArea } from "react-native-keyboard-controller";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import uuid from "react-native-uuid";

/** `TextInput.nativeID` + `KeyboardGestureArea` `textInputNativeID` (iOS) */
const CHAT_COMPOSER_NATIVE_ID = "scamly-chat-composer";

export type ChatInterfaceProps = {
  routeChatSegment: string;
  headerDateLabel: string;
  userId: string;
  isFreePlan: boolean;
  planLoading: boolean;
};

function toBlockMessage(m: StoreMessage): ChatMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
  };
}

async function consumeAssistantStream(
  response: Response,
  appendChunk: (s: string) => void
): Promise<void> {
  const body = response.body;
  if (!body) return;

  const reader = body.getReader();
  const decoder = new TextDecoder();
  const contentType = response.headers.get("content-type") ?? "";

  if (contentType.includes("text/event-stream")) {
    let carry = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      carry += decoder.decode(value, { stream: true });
      let boundary = carry.indexOf("\n\n");
      while (boundary !== -1) {
        const frame = carry.slice(0, boundary);
        carry = carry.slice(boundary + 2);
        boundary = carry.indexOf("\n\n");
        const lines = frame.split(/\r?\n/);
        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed.startsWith("data:")) continue;
          const payload = trimmed.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const parsed = JSON.parse(payload) as Record<string, unknown>;
            const chunk =
              (typeof parsed.text === "string" && parsed.text) ||
              (typeof parsed.delta === "string" && parsed.delta) ||
              (typeof parsed.content === "string" && parsed.content) ||
              "";
            if (chunk) appendChunk(chunk);
          } catch {
            appendChunk(payload);
          }
        }
      }
    }
    if (carry.trim()) {
      const lines = carry.split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload && payload !== "[DONE]") appendChunk(payload);
      }
    }
    return;
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (chunk) appendChunk(chunk);
  }
}

const MessageRow = memo(
  function MessageRow({ item }: { item: StoreMessage }) {
    if (item.role === "assistant" && item.streaming && item.content.trim() === "") {
      return (
        <View style={messageRowStyles.thinkingWrap}>
          <ThinkingIndicator variant="plain" />
        </View>
      );
    }
    return <MessageBlock message={toBlockMessage(item)} />;
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.content === next.item.content &&
    prev.item.streaming === next.item.streaming &&
    prev.item.role === next.item.role
);

const messageRowStyles = StyleSheet.create({
  thinkingWrap: {
    width: "100%",
    paddingVertical: 10,
    alignItems: "flex-start",
  },
});

export default function ChatInterface({
  routeChatSegment,
  headerDateLabel,
  userId,
  isFreePlan,
  planLoading,
}: ChatInterfaceProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const activeConversationId = useChatStore((s) => s.activeConversationId);

  const [input, setInput] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [historyChats, setHistoryChats] = useState<{ id: string; created_at: string }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const flatListRef = useRef<FlatList<StoreMessage>>(null);

  const currentDrawerChatId = useMemo(() => {
    if (routeChatSegment === "new") {
      return activeConversationId ?? "";
    }
    return routeChatSegment;
  }, [routeChatSegment, activeConversationId]);

  const menuDisabled = routeChatSegment === "new" && !activeConversationId;

  /**
   * Inverted list: data is reverse-chronological (newest first) so the latest turn
   * sits next to the input, matching iMessage-style layout.
   */
  const listData = useMemo(() => [...messages].reverse(), [messages]);

  const exitHome = useCallback(() => {
    router.replace("/chat");
  }, []);

  const confirmExitChat = useCallback(() => {
    Alert.alert("Leave chat?", "You can return anytime from the Chat tab.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => {
          clearChatHistoryCache();
          exitHome();
        },
      },
    ]);
  }, [exitHome]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        confirmExitChat();
        return true;
      });
      return () => sub.remove();
    }, [confirmExitChat])
  );

  const loadChatHistoryForDrawer = useCallback(async () => {
    const cached = getChatHistoryCache();
    if (cached) {
      setHistoryChats(cached);
      return;
    }
    if (!userId) return;
    setHistoryLoading(true);
    const { data, error } = await supabase
      .from("chats")
      .select("id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setHistoryLoading(false);
    if (error) {
      captureDataFetchError(error, "chat", "fetch_chats_drawer", "critical");
      return;
    }
    const rows = data ?? [];
    setChatHistoryCache(rows);
    setHistoryChats(rows);
  }, [userId]);

  const openDrawer = useCallback(() => {
    setDrawerOpen(true);
    void loadChatHistoryForDrawer();
  }, [loadChatHistoryForDrawer]);

  /** Inverted + newest-first: staying “pinned” means offset 0 */
  const scrollToPinnedEnd = useCallback((animated: boolean) => {
    if (listData.length === 0) return;
    flatListRef.current?.scrollToOffset({ offset: 0, animated });
  }, [listData.length]);

  useEffect(() => {
    scrollToPinnedEnd(false);
  }, [listData.length, scrollToPinnedEnd]);

  const sendWithStreaming = useCallback(async () => {
    if (isFreePlan || planLoading) return;
    const trimmed = input.trim();
    if (!trimmed || isStreaming) return;

    const conversationIdForPost = useChatStore.getState().activeConversationId;

    const userMsg: StoreMessage = {
      id: uuid.v4().toString(),
      role: "user",
      content: trimmed,
    };
    const assistantMsg: StoreMessage = {
      id: uuid.v4().toString(),
      role: "assistant",
      content: "",
      streaming: true,
    };

    const store = useChatStore.getState();
    store.addMessage(userMsg);
    store.addMessage(assistantMsg);
    store.setStreaming(true);
    setInput("");

    try {
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    } catch {
      /* ignore */
    }

    try {
      let edgeUrl: string;
      try {
        edgeUrl = getAiChatEdgeFunctionUrl();
      } catch {
        store.failLastAssistant("Chat is not configured.");
        store.setStreaming(false);
        trackUserVisibleError("chat", "send_message_env", true);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) {
        store.failLastAssistant("Please sign in again.");
        store.setStreaming(false);
        trackUserVisibleError("chat", "session_invalid", false);
        return;
      }

      const response = await fetch(edgeUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "sendMessage",
          message: trimmed,
          conversationId: conversationIdForPost ?? null,
          userId,
          ...(routeChatSegment !== "new" ? { chatId: routeChatSegment } : {}),
        }),
      });

      const headerConversationId =
        response.headers.get("x-conversation-id") ?? response.headers.get("X-Conversation-Id");

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(errText || `Request failed (${response.status})`);
      }

      if (headerConversationId) {
        const prev = useChatStore.getState().activeConversationId;
        if (!prev) {
          useChatStore.getState().setConversationId(headerConversationId);
          router.replace(`/chat/${headerConversationId}`);
        } else {
          useChatStore.getState().setConversationId(headerConversationId);
        }
      }

      await consumeAssistantStream(response, (chunk) => {
        useChatStore.getState().appendToLastMessage(chunk);
      });

      useChatStore.getState().completeLastAssistantMessage();
    } catch (err) {
      captureChatError(err, "send_message_stream");
      trackUserVisibleError("chat", "send_message_failed", true);
      const msg =
        err instanceof Error ? err.message : "Sorry, something went wrong. Please try again.";
      useChatStore.getState().failLastAssistant(
        msg.length > 280 ? "Sorry, something went wrong. Please try again." : msg
      );
      useChatStore.getState().setStreaming(false);
    }
  }, [input, isFreePlan, planLoading, isStreaming, userId, routeChatSegment]);

  const renderItem = useCallback(
    ({ item }: { item: StoreMessage }) => <MessageRow item={item} />,
    []
  );

  const listEmpty = useMemo(
    () => (
      <View style={styles.emptyBlock}>
        <Text style={[styles.greeting, { color: colors.textPrimary }]}>How can Scamly help?</Text>
        <Text style={[styles.greetingSub, { color: colors.textSecondary }]}>
          Ask about scams, fraud, phishing, or what to do next if something feels off.
        </Text>
      </View>
    ),
    [colors.textPrimary, colors.textSecondary]
  );

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.flex} edges={["top", "left", "right"]}>
        <View style={styles.flex}>
          {/* Fixed header — keep height stable (no flex growth) */}
          <View style={[styles.headerRow, { height: HEADER_HEIGHT }]}>
            <ChatChromeIconButton
              accessibilityLabel="Open chat history"
              onPress={openDrawer}
              bg={colors.backgroundSecondary}
              disabled={menuDisabled}
            >
              <Menu size={22} color={colors.textPrimary} strokeWidth={2} />
            </ChatChromeIconButton>

            <Text style={[styles.headerDate, { color: colors.textTertiary }]} selectable>
              {headerDateLabel}
            </Text>

            <ChatChromeIconButton
              accessibilityLabel="Close chat"
              onPress={confirmExitChat}
              bg={colors.backgroundSecondary}
            >
              <X size={22} color={colors.textPrimary} strokeWidth={2} />
            </ChatChromeIconButton>
          </View>

          {/*
            One KeyboardAvoidingView for list + composer so overlap math matches the full column
            below the header (messages stay readable). Wrapping only the FlatList broke avoidance
            because the measured frame didn’t include the composer strip. Jitter stays fixed by *not*
            driving composer height from onContentSizeChange (see ChatGlassInputBar).
          */}
          <KeyboardAvoidingView behavior="padding" style={styles.flex} keyboardVerticalOffset={35}>
            <View style={styles.flex}>
              <KeyboardGestureArea style={styles.flex} textInputNativeID={CHAT_COMPOSER_NATIVE_ID}>
                <FlatList
                  ref={flatListRef}
                  style={styles.flex}
                  data={listData}
                  inverted
                  keyExtractor={(item) => item.id}
                  renderItem={renderItem}
                  keyboardShouldPersistTaps="handled"
                  keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
                  contentContainerStyle={[
                    styles.listContent,
                    listData.length === 0 ? styles.listEmptyGrow : undefined,
                  ]}
                  ListEmptyComponent={listEmpty}
                  removeClippedSubviews={listData.length > 24}
                  onContentSizeChange={() => scrollToPinnedEnd(false)}
                  initialNumToRender={15}
                  maxToRenderPerBatch={15}
                  windowSize={10}
                />
              </KeyboardGestureArea>

              <View
                style={[
                  styles.inputShell,
                  {
                    paddingBottom: Math.max(insets.bottom, 10),
                  },
                ]}
              >
                <ChatGlassInputBar
                  composerNativeID={CHAT_COMPOSER_NATIVE_ID}
                  value={input}
                  onChangeText={setInput}
                  onSend={sendWithStreaming}
                  placeholder="Message Scamly..."
                  disabled={planLoading || isStreaming}
                />
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </SafeAreaView>

      <ChatHistoryDrawer
        visible={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        chats={historyChats}
        loading={historyLoading}
        currentChatId={currentDrawerChatId}
        onSelectChat={(id) => router.replace(`/chat/${id}`)}
        onDeleteChat={(targetId) => {
          Alert.alert("Delete chat", "This conversation will be permanently deleted.", [
            { text: "Cancel", style: "cancel" },
            {
              text: "Delete",
              style: "destructive",
              onPress: async () => {
                try {
                  await deleteConversationId(targetId);
                  const cached = getChatHistoryCache();
                  if (cached) {
                    setChatHistoryCache(cached.filter((c) => c.id !== targetId));
                  }
                  setHistoryChats((prev) => prev.filter((c) => c.id !== targetId));
                  if (targetId === currentDrawerChatId || targetId === routeChatSegment) {
                    clearChatHistoryCache();
                    useChatStore.getState().resetSession();
                    router.replace("/chat/new");
                  }
                } catch (err) {
                  if (err instanceof ChatError) {
                    Alert.alert("Error", "Could not delete chat. Please try again.");
                  } else {
                    trackUserVisibleError("chat", "chat_delete_failed", true);
                    Alert.alert("Error", "Could not delete chat.");
                  }
                }
              },
            },
          ]);
        }}
      />
    </ThemedBackground>
  );
}

const HEADER_HEIGHT = 56;

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    minHeight: 0,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  headerDate: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    flex: 1,
    textAlign: "center",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 4,
  },
  listEmptyGrow: {
    flexGrow: 1,
    justifyContent: "center",
  },
  emptyBlock: {
    alignSelf: "center",
    maxWidth: 340,
    gap: 10,
    paddingHorizontal: 12,
  },
  greeting: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 24,
    lineHeight: 32,
    textAlign: "center",
  },
  greetingSub: {
    fontFamily: "Poppins-Regular",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
  },
  inputShell: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
