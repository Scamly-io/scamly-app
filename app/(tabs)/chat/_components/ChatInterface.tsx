import Button from "@/components/Button";
import ThemedBackground from "@/components/ThemedBackground";
import type { Message as StoreMessage } from "@/store/chatStore";
import { useChatStore } from "@/store/chatStore";
import { useTheme } from "@/theme";
import { getAiChatEdgeFunctionUrl } from "@/utils/ai/chat";
import { streamAssistantMessage } from "@/utils/ai/consumeAssistantStream";
import {
  createSignedUrlsForChatImages,
  joinImageIdCsv,
  normalizePickerBase64,
  uploadChatImages,
} from "@/utils/chat/chatImages";
import {
  buildInitialChatRowPayload,
  insertInitialChatRow,
  needsInitialChatRowInsert,
} from "@/utils/chat/chatInitialRow";
import { openNewChatSession } from "@/utils/chat/chatNav";
import { trackUserVisibleError } from "@/utils/shared/analytics";
import { captureChatError } from "@/utils/shared/sentry";
import { supabase } from "@/utils/shared/supabase";
import { DrawerActions, useNavigation } from "@react-navigation/native";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { router, useFocusEffect } from "expo-router";
import { ImagePlus, Menu, Plus, Send, X } from "lucide-react-native";
import type { ReactNode } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Alert, BackHandler, FlatList, Keyboard, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView, KeyboardGestureArea } from "react-native-keyboard-controller";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import uuid from "react-native-uuid";
import MessageBlock, { type ChatMessage } from "./MessageBlock";
import ThinkingIndicator from "./ThinkingIndicator";

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

function isIosGlassAvailable(): boolean {
  return Platform.OS === "ios" && typeof isGlassEffectAPIAvailable === "function" && isGlassEffectAPIAvailable();
}

function ChatChromeIconButtonLocal({
  children,
  onPress,
  accessibilityLabel,
  bg,
  disabled,
}: {
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  bg: string;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const iosGlass = isIosGlassAvailable();

  const inner = (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        chromeStyles.chromeBtnInner,
        { opacity: disabled ? 0.35 : pressed ? 0.75 : 1 },
      ]}
    >
      {children}
    </Pressable>
  );

  if (iosGlass) {
    return (
      <GlassView style={chromeStyles.chromeGlass} glassEffectStyle="regular" colorScheme="auto">
        {inner}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        chromeStyles.chromeFallback,
        Platform.OS === "android"
          ? {
              backgroundColor: colors.surface,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border,
            }
          : { backgroundColor: bg },
      ]}
    >
      {inner}
    </View>
  );
}

function ChatGlassPillButtonLocal({
  label,
  icon,
  onPress,
  accessibilityLabel,
  bg,
  labelColor,
  disabled,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  bg: string;
  labelColor: string;
  disabled?: boolean;
}) {
  const { colors } = useTheme();
  const iosGlass = isIosGlassAvailable();

  const inner = (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        pillStyles.inner,
        { opacity: disabled ? 0.35 : pressed ? 0.75 : 1 },
      ]}
    >
      {icon}
      <Text style={[pillStyles.label, { color: labelColor }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );

  if (iosGlass) {
    return (
      <GlassView style={pillStyles.glass} glassEffectStyle="regular" colorScheme="auto">
        {inner}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        pillStyles.fallback,
        Platform.OS === "android"
          ? {
              backgroundColor: colors.surface,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: colors.border,
            }
          : { backgroundColor: bg },
      ]}
    >
      {inner}
    </View>
  );
}

type ChatComposerAttachment = {
  id: string;
  uri: string;
  mimeType?: string;
  base64: string;
};

function ChatGlassInputBarLocal({
  value,
  onChangeText,
  onSend,
  placeholder,
  disabled,
  plusDisabled = false,
  onPressPlus = () => {},
  plusSlot,
  attachments = [],
  onRemoveAttachment,
  composerNativeID,
}: {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  plusDisabled?: boolean;
  onPressPlus?: () => void;
  plusSlot?: ReactNode;
  attachments?: ChatComposerAttachment[];
  onRemoveAttachment?: (id: string) => void;
  composerNativeID?: string;
}) {
  const { colors, radius } = useTheme();
  const hasAtt = attachments.length > 0;
  const canSend = (value.trim().length > 0 || hasAtt) && !disabled;

  const attachmentStrip = hasAtt ? (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={composerStyles.attachScrollContent}
    >
      {attachments.map((a) => (
        <View key={a.id} style={composerStyles.thumbWrap}>
          <Image source={{ uri: a.uri }} style={[composerStyles.thumb, { borderRadius: radius.md }]} contentFit="cover" />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove attachment"
            onPress={() => (onRemoveAttachment ? onRemoveAttachment(a.id) : undefined)}
            hitSlop={10}
            style={({ pressed }) => [
              composerStyles.thumbRemove,
              { opacity: pressed ? 0.85 : 1, backgroundColor: "rgba(0,0,0,0.45)" },
            ]}
          >
            <X size={16} color="#fff" strokeWidth={2.5} />
          </Pressable>
        </View>
      ))}
    </ScrollView>
  ) : null;

  const divider = hasAtt ? <View style={[composerStyles.divider, { backgroundColor: colors.border }]} /> : null;

  const fieldInner = (
    <View style={composerStyles.fieldColumn}>
      {attachmentStrip}
      {divider}
      <View style={[composerStyles.textCluster, { borderRadius: radius.xl, backgroundColor: "transparent" }]}>
        <TextInput
          nativeID={composerNativeID}
          style={[composerStyles.input, { color: colors.textPrimary }]}
          placeholder={placeholder ?? "Message Scamly..."}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          multiline
          scrollEnabled
          editable={!disabled}
          blurOnSubmit={false}
          returnKeyType="default"
          textAlignVertical="top"
          underlineColorAndroid="transparent"
        />
        {canSend ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            onPress={onSend}
            hitSlop={12}
            style={({ pressed }) => [composerStyles.sendInside, { opacity: pressed ? 0.65 : 1 }]}
          >
            <Send size={22} color={colors.accent} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const useGlass = isIosGlassAvailable();
  const messageField = useGlass ? (
    <GlassView
      style={[composerStyles.glassOuter, { borderRadius: radius["2xl"], flex: 1 }]}
      glassEffectStyle="regular"
      colorScheme="auto"
    >
      {fieldInner}
    </GlassView>
  ) : (
    <View
      style={[
        composerStyles.fallbackOuter,
        {
          flex: 1,
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderWidth: StyleSheet.hairlineWidth,
          borderRadius: radius["2xl"],
        },
      ]}
    >
      {fieldInner}
    </View>
  );

  return (
    <View style={composerStyles.row}>
      <View style={composerStyles.plusSlotWrap}>
        {plusSlot ?? (
          <ChatChromeIconButtonLocal
            accessibilityLabel="Insert image"
            onPress={onPressPlus}
            bg={colors.surface}
            disabled={plusDisabled}
          >
            <ImagePlus size={22} color={colors.textPrimary} strokeWidth={2} />
          </ChatChromeIconButtonLocal>
        )}
      </View>
      {messageField}
    </View>
  );
}

const MIN_INPUT_HEIGHT = 30;
const THUMB = 72;

const chromeStyles = StyleSheet.create({
  chromeGlass: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
  },
  chromeFallback: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
  },
  chromeBtnInner: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
});

const pillStyles = StyleSheet.create({
  glass: {
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    alignSelf: "flex-start",
    maxWidth: 200,
  },
  fallback: {
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
    alignSelf: "flex-start",
    maxWidth: 200,
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    height: 44,
    justifyContent: "center",
  },
  label: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    flexShrink: 1,
  },
});

const composerStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  plusSlotWrap: {
    flexShrink: 0,
    alignSelf: "flex-end",
    zIndex: 6,
  },
  fieldColumn: {
    alignSelf: "stretch",
    minWidth: 0,
  },
  attachScrollContent: {
    paddingTop: 8,
    paddingBottom: 4,
    paddingHorizontal: 4,
    gap: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  thumbWrap: {
    position: "relative",
    width: THUMB,
    height: THUMB,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
  },
  thumbRemove: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 6,
    opacity: 0.9,
  },
  glassOuter: {
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 0,
  },
  fallbackOuter: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minWidth: 0,
  },
  textCluster: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    minHeight: MIN_INPUT_HEIGHT,
    backgroundColor: "transparent",
  },
  input: {
    flexGrow: 1,
    flexShrink: 1,
    minWidth: 0,
    fontFamily: "Poppins-Regular",
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 2,
    paddingHorizontal: 0,
    minHeight: MIN_INPUT_HEIGHT - 14,
    maxHeight: 148,
  },
  sendInside: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 1,
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
        <ChatChromeIconButtonLocal
          accessibilityLabel="Insert image"
          onPress={() => {}}
          bg={colors.surface}
          disabled
        >
          <ImagePlus size={22} color={colors.textPrimary} strokeWidth={2} />
        </ChatChromeIconButtonLocal>
      );
    }
    return (
      <ChatChromeIconButtonLocal
        accessibilityLabel="Insert image"
        onPress={() => void pickImages()}
        bg={colors.surface}
      >
        <ImagePlus size={22} color={colors.textPrimary} strokeWidth={2} />
      </ChatChromeIconButtonLocal>
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
                <ChatChromeIconButtonLocal
                  accessibilityLabel="Open chat history"
                  onPress={openDrawer}
                  bg={colors.surface}
                  disabled={interactionLocked}
                >
                  <Menu size={22} color={colors.textPrimary} strokeWidth={2} />
                </ChatChromeIconButtonLocal>
                <ChatGlassPillButtonLocal
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
              <ChatChromeIconButtonLocal
                accessibilityLabel="Close chat"
                onPress={goHome}
                bg={colors.surface}
              >
                <X size={22} color={colors.textPrimary} strokeWidth={2} />
              </ChatChromeIconButtonLocal>
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
                    <ChatGlassInputBarLocal
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
