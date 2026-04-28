import ChatChromeIconButton from "@/components/chat-chrome-icon-button";
import ChatGlassInputBar from "@/components/chat-glass-input-bar";
import ChatGlassPillButton from "@/components/chat-glass-pill-button";
import MessageBlock, { type ChatMessage } from "@/components/MessageBlock";
import ThemedBackground from "@/components/ThemedBackground";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import type { Message as StoreMessage } from "@/store/chatStore";
import { useChatStore } from "@/store/chatStore";
import { useTheme } from "@/theme";
import { getAiChatEdgeFunctionUrl } from "@/utils/ai/chat";
import { streamAssistantMessage } from "@/utils/ai/consume-assistant-stream";
import { trackUserVisibleError } from "@/utils/analytics";
import { clearChatHistoryCache } from "@/utils/chat-history-cache";
import {
  buildInitialChatRowPayload,
  insertInitialChatRow,
  needsInitialChatRowInsert,
} from "@/utils/chat-initial-row";
import { captureChatError } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { router, useFocusEffect } from "expo-router";
import { Menu, Plus, X } from "lucide-react-native";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, BackHandler, FlatList, Keyboard, Platform, StyleSheet, Text, View } from "react-native";
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
  const navigation = useNavigation();
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);

  const [input, setInput] = useState("");

  const flatListRef = useRef<FlatList<StoreMessage>>(null);

  /**
   * Inverted list: data is reverse-chronological (newest first) so the latest turn
   * sits next to the input, matching iMessage-style layout.
   */
  const listData = useMemo(() => [...messages].reverse(), [messages]);

  const exitHome = useCallback(() => {
    router.replace("/chat");
  }, []);

  const confirmExitChat = useCallback(() => {
    Keyboard.dismiss();
    Alert.alert("Leave chat?", "You can return anytime from the Chat tab.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: () => {
          Keyboard.dismiss();
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

  const openDrawer = useCallback(() => {
    navigation.dispatch(DrawerActions.openDrawer());
  }, [navigation]);

  const startNewChat = useCallback(() => {
    navigation.dispatch(DrawerActions.closeDrawer());
    const newId = uuid.v4().toString();
    useChatStore.getState().resetSession();
    router.replace(`/chat/${newId}`);
  }, [navigation]);

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

    const beforeSend = useChatStore.getState();
    if (
      needsInitialChatRowInsert({
        chatRowPersistedInDb: beforeSend.chatRowPersistedInDb,
        messageCount: beforeSend.messages.length,
      })
    ) {
      const rowResult = await insertInitialChatRow(
        supabase,
        buildInitialChatRowPayload({
          chatId: routeChatSegment,
          userId,
          lastMessage: trimmed,
        })
      );
      if (!rowResult.ok) {
        trackUserVisibleError("chat", "chat_row_insert_failed", true);
        Alert.alert("Couldn't start chat", rowResult.message || "Please try again.");
        return;
      }
      useChatStore.getState().setChatRowPersistedInDb(true);
    }

    /** AI thread id from edge only — null until `X-Conversation-Id` on a prior response */
    const conversationIdForPost = useChatStore.getState().activeConversationId;
    console.log("conversationIdForPost", conversationIdForPost);

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

      await streamAssistantMessage({
        url: edgeUrl,
        token,
        body: {
          action: "sendMessage",
          message: trimmed,
          conversationId: conversationIdForPost ?? null,
          userId,
          chatId: routeChatSegment,
        },
        onConversationId: (id) => {
          useChatStore.getState().setConversationId(id);
        },
        onChunk: (chunk) => {
          useChatStore.getState().appendToLastMessage(chunk);
        },
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
        <Text style={[styles.greeting, { color: colors.textPrimary }]}>How can I help?</Text>
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
          <View style={[styles.headerRow, { minHeight: HEADER_HEIGHT }]}>
            <View style={styles.headerColStart}>
              <View style={styles.headerLeftActions}>
                <ChatChromeIconButton
                  accessibilityLabel="Open chat history"
                  onPress={openDrawer}
                  bg={colors.surface}
                >
                  <Menu size={22} color={colors.textPrimary} strokeWidth={2} />
                </ChatChromeIconButton>
                <ChatGlassPillButton
                  label="New chat"
                  icon={<Plus size={18} color={colors.textPrimary} strokeWidth={2} />}
                  onPress={startNewChat}
                  accessibilityLabel="Start a new chat"
                  bg={colors.surface}
                  labelColor={colors.textPrimary}
                />
              </View>
            </View>
            <Text
              style={[styles.headerDate, { color: colors.textTertiary }]}
              numberOfLines={1}
              selectable
            >
              {headerDateLabel}
            </Text>
            <View style={styles.headerColEnd}>
              <ChatChromeIconButton
                accessibilityLabel="Close chat"
                onPress={confirmExitChat}
                bg={colors.surface}
              >
                <X size={22} color={colors.textPrimary} strokeWidth={2} />
              </ChatChromeIconButton>
            </View>
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
                  keyboardDismissMode={Platform.OS === "ios" ? "none" : "on-drag"}
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
    paddingHorizontal: 16,
  },
  headerColStart: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerColEnd: {
    flex: 1,
    minWidth: 0,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  headerLeftActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerDate: {
    fontFamily: "Poppins-Regular",
    fontSize: 12,
    flexShrink: 0,
    maxWidth: 120,
    textAlign: "center",
    paddingHorizontal: 4,
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
