import Button from "@/components/Button";
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
import {
  createSignedUrlsForChatImages,
  joinImageIdCsv,
  normalizePickerBase64,
  uploadChatImages,
} from "@/utils/chat-images";
import {
  buildInitialChatRowPayload,
  insertInitialChatRow,
  needsInitialChatRowInsert,
} from "@/utils/chat-initial-row";
import { openNewChatSession } from "@/utils/chat-nav";
import { captureChatError } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { ImagePlus, Menu, Plus, X } from "lucide-react-native";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, BackHandler, FlatList, Keyboard, Platform, StyleSheet, Text, TextInput, View } from "react-native";
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
  /** Shown in empty state when `isFreePlan`; opens RevenueCat paywall from parent. */
  onOpenPaywall?: () => void | Promise<void>;
  paywallLoading?: boolean;
};

function toBlockMessage(m: StoreMessage): ChatMessage {
  return {
    id: m.id,
    role: m.role,
    content: m.content,
    imageId: m.imageId,
    imageUrls: m.imageUrls,
  };
}

const MessageRow = memo(
  function MessageRow({ item, viewerUserId }: { item: StoreMessage; viewerUserId: string }) {
    if (item.role === "assistant" && item.streaming && item.content.trim() === "") {
      return (
        <View style={messageRowStyles.thinkingWrap}>
          <ThinkingIndicator variant="plain" />
        </View>
      );
    }
    return <MessageBlock message={toBlockMessage(item)} viewerUserId={viewerUserId} />;
  },
  (prev, next) =>
    prev.item.id === next.item.id &&
    prev.item.content === next.item.content &&
    prev.item.streaming === next.item.streaming &&
    prev.item.role === next.item.role &&
    prev.item.imageId === next.item.imageId &&
    (prev.item.imageUrls?.join("\0") ?? "") === (next.item.imageUrls?.join("\0") ?? "")
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
  onOpenPaywall,
  paywallLoading = false,
}: ChatInterfaceProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const messages = useChatStore((s) => s.messages);
  const isStreaming = useChatStore((s) => s.isStreaming);

  const [input, setInput] = useState("");
  const [pendingAttachments, setPendingAttachments] = useState<
    { id: string; uri: string; mimeType?: string; base64: string }[]
  >([]);

  useEffect(() => {
    setPendingAttachments([]);
  }, [routeChatSegment]);

  const flatListRef = useRef<FlatList<StoreMessage>>(null);

  /**
   * Inverted list: data is reverse-chronological (newest first) so the latest turn
   * sits next to the input, matching iMessage-style layout.
   */
  const listData = useMemo(() => [...messages].reverse(), [messages]);

  const goHome = useCallback(() => {
    Keyboard.dismiss();
    // Replace the current `/chat/[id]` with `/chat?exit=1`. The chat stack is now just
    // the index route; index sees `exit=1` and redirects to `/home`, leaving the chat
    // stack cleared for next time the tab is opened.
    router.replace("/chat?exit=1");
  }, []);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener("hardwareBackPress", () => {
        goHome();
        return true;
      });
      return () => sub.remove();
    }, [goHome])
  );

  const openDrawer = useCallback(() => {
    navigation.dispatch(DrawerActions.openDrawer());
  }, [navigation]);

  const startNewChat = useCallback(() => {
    navigation.dispatch(DrawerActions.closeDrawer());
    Keyboard.dismiss();
    TextInput.State.blurTextInput();
    openNewChatSession();
  }, [navigation]);

  /** Inverted + newest-first: staying “pinned” means offset 0 */
  const scrollToPinnedEnd = useCallback((animated: boolean) => {
    if (listData.length === 0) return;
    flatListRef.current?.scrollToOffset({ offset: 0, animated });
  }, [listData.length]);

  useEffect(() => {
    scrollToPinnedEnd(false);
  }, [listData.length, scrollToPinnedEnd]);

  const interactionLocked = isFreePlan;

  const removeAttachment = useCallback((id: string) => {
    setPendingAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  const pickImages = useCallback(async () => {
    Keyboard.dismiss();
    TextInput.State.blurTextInput();

    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Photos", "Allow photo library access to attach images.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.85,
      base64: true,
    });
    if (result.canceled) return;

    const added = result.assets
      .map((a) => {
        const base64 = normalizePickerBase64(a.base64 ?? undefined);
        if (!base64) return null;
        return {
          id: uuid.v4().toString(),
          uri: a.uri,
          mimeType: a.mimeType ?? undefined,
          base64,
        };
      })
      .filter((x): x is NonNullable<typeof x> => x != null);

    if (added.length === 0) {
      Alert.alert(
        "Couldn't read images",
        "We couldn't load the photo data. Try choosing different images or slightly lower resolution."
      );
      return;
    }
    if (added.length < result.assets.length) {
      Alert.alert(
        "Some images skipped",
        "One or more photos could not be prepared for upload. The rest were added."
      );
    }

    setPendingAttachments((prev) => [...prev, ...added]);
  }, []);

  const imagePickerSlot = useMemo(() => {
    if (interactionLocked) return undefined;
    if (planLoading || isStreaming) {
      return (
        <ChatChromeIconButton
          accessibilityLabel="Insert image"
          onPress={() => {}}
          bg={colors.surface}
          disabled
        >
          <ImagePlus size={22} color={colors.textPrimary} strokeWidth={2} />
        </ChatChromeIconButton>
      );
    }
    return (
      <ChatChromeIconButton
        accessibilityLabel="Insert image"
        onPress={() => void pickImages()}
        bg={colors.surface}
      >
        <ImagePlus size={22} color={colors.textPrimary} strokeWidth={2} />
      </ChatChromeIconButton>
    );
  }, [colors.surface, colors.textPrimary, interactionLocked, isStreaming, pickImages, planLoading]);

  const sendWithStreaming = useCallback(async () => {
    if (isFreePlan || planLoading) return;
    const trimmed = input.trim();
    const pending = pendingAttachments;
    if ((!trimmed && pending.length === 0) || isStreaming) return;

    let imageIdCsv: string | undefined;
    let imageUrlsForEdge: string[] | undefined;
    let imageIdsForEdge: string[] | null = null;

    if (pending.length > 0) {
      const up = await uploadChatImages(
        supabase,
        userId,
        pending.map((p) => ({
          uri: p.uri,
          base64: p.base64,
          mimeType: p.mimeType,
        })),
        () => uuid.v4().toString()
      );
      if (up.error || up.filenames.length === 0) {
        Alert.alert("Couldn't upload images", up.error || "Please try again.");
        return;
      }
      imageIdCsv = joinImageIdCsv(up.filenames);
      imageIdsForEdge = [...up.filenames];
      const signed = await createSignedUrlsForChatImages(supabase, userId, up.filenames);
      if (signed.error || signed.urls.length === 0) {
        Alert.alert("Couldn't prepare images", signed.error || "Please try again.");
        return;
      }
      imageUrlsForEdge = signed.urls;
    }

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
          lastMessage: trimmed || (pending.length ? "Image" : ""),
        })
      );
      if (!rowResult.ok) {
        trackUserVisibleError("chat", "chat_row_insert_failed", true);
        Alert.alert("Couldn't start chat", rowResult.message || "Please try again.");
        return;
      }
      useChatStore.getState().setChatRowPersistedInDb(true);
    }

    const conversationIdForPost = useChatStore.getState().activeConversationId;

    const userMsg: StoreMessage = {
      id: uuid.v4().toString(),
      role: "user",
      content: trimmed,
      imageId: imageIdCsv,
      imageUrls: imageUrlsForEdge,
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
    setPendingAttachments([]);

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
          imageUrls: imageUrlsForEdge ?? null,
          /** Storage filenames under `chat-images/{userId}/…`; edge persists to `messages.image_id` (e.g. joined CSV). */
          imageIds: imageIdsForEdge,
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
  }, [
    input,
    pendingAttachments,
    isFreePlan,
    planLoading,
    isStreaming,
    userId,
    routeChatSegment,
  ]);

  const renderItem = useCallback(
    ({ item }: { item: StoreMessage }) => (
      <MessageRow item={item} viewerUserId={userId} />
    ),
    [userId]
  );

  const listEmpty = useMemo(
    () =>
      interactionLocked && onOpenPaywall ? (
        <View style={styles.emptyBlock}>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>
            Discuss complex scams{'\n'}Get personalised advice.
          </Text>
          <Text style={[styles.greetingSub, { color: colors.textSecondary, marginBottom: 30 }]}>
            Ask any question about scams, or describe your situation for personalised advice.{'\n'}Only available to Premium users.
          </Text>
          <Button
            onPress={() => void onOpenPaywall()}
            loading={paywallLoading}
                style={styles.paywallButton}
          >
            Unlock AI Scam Chat
          </Button>
        </View>
      ) : (
        <View style={styles.emptyBlock}>
          <Text style={[styles.greeting, { color: colors.textPrimary }]}>How can I help?</Text>
          <Text style={[styles.greetingSub, { color: colors.textSecondary }]}>
            Ask about scams, fraud, phishing, or what to do next if something feels off.
          </Text>
        </View>
      ),
    [
      interactionLocked,
      onOpenPaywall,
      paywallLoading,
      colors.textPrimary,
      colors.textSecondary,
    ]
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
                  disabled={interactionLocked}
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
                  disabled={interactionLocked}
                />
              </View>
            </View>
            <View style={styles.headerColEnd}>
              <ChatChromeIconButton
                accessibilityLabel="Close chat"
                onPress={goHome}
                bg={colors.surface}
              >
                <X size={22} color={colors.textPrimary} strokeWidth={2} />
              </ChatChromeIconButton>
            </View>
          </View>

          {/*
            One KeyboardAvoidingView for list + composer. `KeyboardGestureArea` wraps both the
            inverted list and the composer so `textInputNativeID` targets a subtree that includes
            the actual `TextInput` (required on iOS).
          */}
          <KeyboardAvoidingView behavior="padding" style={styles.flex} keyboardVerticalOffset={35}>
            <View style={styles.flex}>
              <KeyboardGestureArea style={styles.flex} textInputNativeID={CHAT_COMPOSER_NATIVE_ID}>
                <View style={styles.keyboardGestureColumn}>
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
                      disabled={planLoading || isStreaming || interactionLocked}
                      plusDisabled={planLoading || isStreaming || interactionLocked}
                      plusSlot={imagePickerSlot}
                      attachments={pendingAttachments}
                      onRemoveAttachment={removeAttachment}
                    />
                  </View>
                </View>
              </KeyboardGestureArea>
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
  keyboardGestureColumn: {
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
  paywallButton: {
    alignSelf: "center",
    minWidth: 236,
  },
  inputShell: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
});
