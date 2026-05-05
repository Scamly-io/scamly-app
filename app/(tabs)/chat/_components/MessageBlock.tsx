import { useChatStore } from "@/store/chatStore";
import { useTheme } from "@/theme";
import { createSignedUrlsForChatImages, parseImageIdCsv } from "@/utils/chat/chatImages";
import { supabase } from "@/utils/shared/supabase";
import Markdown from "@ronradtke/react-native-markdown-display";
import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import ChatImageStack from "./ChatImageStack";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
  imageId?: string | string[] | null;
  imageUrls?: string[];
};

type Props = {
  message: ChatMessage;
  /** Required to resolve private bucket URLs for user image attachments. */
  viewerUserId?: string;
};

type UseHydrateMessageImageUrlsArgs = {
  messageId: string;
  userId: string;
  imageId: string | string[] | null | undefined;
  /** Already resolved (e.g. just after send); skips network. */
  prefetchedUrls: string[] | undefined;
};

function useHydrateMessageImageUrlsLocal({
  messageId,
  userId,
  imageId,
  prefetchedUrls,
}: UseHydrateMessageImageUrlsArgs): { displayUrls: string[]; showLoadingGhost: boolean } {
  const filenames = useMemo(() => parseImageIdCsv(imageId ?? null), [imageId]);
  const hasIds = filenames.length > 0;

  const [fetchedUrls, setFetchedUrls] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const prefetchKey = prefetchedUrls && prefetchedUrls.length > 0 ? prefetchedUrls.join("\0") : "";

  useEffect(() => {
    if (prefetchKey) setLoading(false);
  }, [prefetchKey]);

  useEffect(() => {
    setFetchedUrls([]);
  }, [imageId, messageId]);

  useEffect(() => {
    if (!hasIds || !userId) return;
    if (prefetchKey) return;

    let cancelled = false;
    setLoading(true);

    void (async () => {
      const ids = parseImageIdCsv(imageId ?? null);
      const { urls, error } = await createSignedUrlsForChatImages(supabase, userId, ids);
      if (cancelled) return;
      setLoading(false);
      if (error || urls.length === 0) return;
      setFetchedUrls(urls);
      useChatStore.getState().patchMessage(messageId, { imageUrls: urls });
    })();

    return () => {
      cancelled = true;
    };
  }, [hasIds, userId, messageId, imageId, prefetchKey]);

  const displayUrls = prefetchKey.length > 0 ? (prefetchedUrls as string[]) : fetchedUrls;
  const showLoadingGhost = hasIds && displayUrls.length === 0 && loading;

  return { displayUrls, showLoadingGhost };
}

const UserAttachmentBlock = memo(function UserAttachmentBlock({
  message,
  viewerUserId,
}: {
  message: ChatMessage;
  viewerUserId: string;
}) {
  const { colors, radius } = useTheme();
  const hasIds = parseImageIdCsv(message.imageId ?? null).length > 0;
  const { displayUrls, showLoadingGhost } = useHydrateMessageImageUrlsLocal({
    messageId: message.id,
    userId: viewerUserId,
    imageId: message.imageId,
    prefetchedUrls: message.imageUrls,
  });

  if (!hasIds && !showLoadingGhost) return null;

  return (
    <>
      {showLoadingGhost ? (
        <View
          style={[
            styles.imageGhost,
            {
              backgroundColor: colors.surfaceElevated,
              borderColor: colors.border,
              borderRadius: radius.lg,
            },
          ]}
        >
          <ActivityIndicator size="small" color={colors.accent} />
        </View>
      ) : null}
      {displayUrls.length > 0 ? <ChatImageStack imageUrls={displayUrls} /> : null}
    </>
  );
});

const MessageBlock = memo(function MessageBlock({ message, viewerUserId }: Props) {
  const { colors, radius } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const { width } = useWindowDimensions();
  const userBubbleMaxWidth = Math.round(width * 0.7);

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const markdownStyles = useMemo(
    () => ({
      body: StyleSheet.flatten([styles.assistantText, { color: colors.textPrimary }]),
      paragraph: StyleSheet.flatten([styles.assistantText, { color: colors.textPrimary }]),
      text: StyleSheet.flatten([styles.assistantText, { color: colors.textPrimary }]),
      heading1: StyleSheet.flatten([styles.heading, { color: colors.textPrimary }]),
      heading2: StyleSheet.flatten([styles.heading, { color: colors.textPrimary }]),
      heading3: StyleSheet.flatten([styles.heading, { color: colors.textPrimary }]),
      bullet_list: styles.list,
      ordered_list: styles.list,
      list_item: styles.listItem,
      code_inline: StyleSheet.flatten([styles.inlineCode, { backgroundColor: colors.accentMuted }]),
      code_block: StyleSheet.flatten([styles.codeBlock, { backgroundColor: colors.surfaceElevated }]),
      fence: StyleSheet.flatten([styles.codeBlock, { backgroundColor: colors.surfaceElevated }]),
      link: StyleSheet.flatten([styles.link, { color: colors.accent }]),
    }),
    [colors.accent, colors.accentMuted, colors.surfaceElevated, colors.textPrimary]
  );

  if (message.role === "assistant") {
    return (
      <Animated.View style={[styles.assistantOuter, { opacity: fadeAnim }]}>
        <View style={styles.assistantInner}>
          <Markdown style={markdownStyles}>{message.content}</Markdown>
        </View>
      </Animated.View>
    );
  }

  return (
    <Animated.View style={[styles.userOuter, { opacity: fadeAnim }]}>
      <View style={styles.userColumn}>
        {message.role === "user" && viewerUserId ? (
          <UserAttachmentBlock message={message} viewerUserId={viewerUserId} />
        ) : null}
        {message.content.trim() !== "" ? (
          <View
            style={[
              styles.userBubble,
              {
                maxWidth: userBubbleMaxWidth,
                borderRadius: radius.xl,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.userText, { color: colors.textPrimary }]} selectable>
              {message.content}
            </Text>
          </View>
        ) : null}
      </View>
    </Animated.View>
  );
});

export default MessageBlock;

const styles = StyleSheet.create({
  assistantOuter: {
    width: "100%",
    paddingVertical: 8,
  },
  assistantInner: {
    width: "100%",
    paddingRight: 4,
  },
  userOuter: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingVertical: 6,
  },
  userColumn: {
    maxWidth: "100%",
    alignItems: "flex-end",
    gap: 8,
  },
  imageGhost: {
    width: 120,
    height: 168,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 0,
  },
  userBubble: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  userText: {
    fontFamily: "Poppins-Regular",
    fontSize: 16,
    lineHeight: 23,
  },
  assistantText: {
    fontFamily: "Poppins-Regular",
    fontSize: 16,
    lineHeight: 24,
  },
  heading: {
    fontFamily: "Poppins-Bold",
    marginTop: 10,
    marginBottom: 4,
  },
  list: {
    marginVertical: 6,
  },
  listItem: {
    flexDirection: "row",
    marginBottom: 6,
  },
  inlineCode: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    fontFamily: "Menlo",
    fontSize: 14,
  },
  codeBlock: {
    padding: 10,
    borderRadius: 10,
    overflow: "hidden",
    fontFamily: "Menlo",
    fontSize: 14,
    lineHeight: 20,
  },
  link: {
    textDecorationLine: "underline",
  },
});
