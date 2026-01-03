import { useTheme } from "@/theme";
import { memo, useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";
import Markdown from "react-native-markdown-display";

export type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at?: string;
};

type Props = {
  message: ChatMessage;
};

const MessageBlock = memo(function MessageBlock({ message }: Props) {
  const { colors, radius } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isAssistant = message.role === "assistant";

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const timestamp = useMemo(() => {
    if (!message.created_at) return "";
    return new Date(message.created_at).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
  }, [message.created_at]);

  const markdownStyles = {
    body: [styles.assistantText, { color: colors.textPrimary }],
    paragraph: [styles.assistantText, { color: colors.textPrimary }],
    text: [styles.assistantText, { color: colors.textPrimary }],
    heading1: [styles.heading, { color: colors.textPrimary }],
    heading2: [styles.heading, { color: colors.textPrimary }],
    heading3: [styles.heading, { color: colors.textPrimary }],
    bullet_list: styles.list,
    ordered_list: styles.list,
    list_item: styles.listItem,
    code_inline: [styles.inlineCode, { backgroundColor: colors.accentMuted }],
    code_block: [styles.codeBlock, { backgroundColor: colors.surfaceElevated }],
    fence: [styles.codeBlock, { backgroundColor: colors.surfaceElevated }],
    link: [styles.link, { color: colors.accent }],
  };

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <View
        style={[
          styles.avatar,
          {
            backgroundColor: isAssistant ? colors.accentMuted : colors.border,
            borderRadius: radius.sm,
          },
        ]}
      >
        <Text style={[styles.avatarLabel, { color: isAssistant ? colors.accent : colors.textSecondary }]}>
          {isAssistant ? "AI" : "You"}
        </Text>
      </View>
      <View
        style={[
          styles.bubble,
          {
            backgroundColor: isAssistant ? colors.backgroundSecondary : colors.surface,
            borderColor: colors.border,
            borderRadius: radius.lg,
          },
        ]}
      >
        <View style={styles.headerRow}>
          <Text
            style={[
              styles.role,
              { color: isAssistant ? colors.accent : colors.textSecondary },
            ]}
          >
            {isAssistant ? "Scamly" : "You"}
          </Text>
          {timestamp ? (
            <Text style={[styles.timestamp, { color: colors.textTertiary }]}>{timestamp}</Text>
          ) : null}
        </View>
        {isAssistant ? (
          <Markdown style={markdownStyles}>{message.content}</Markdown>
        ) : (
          <Text style={[styles.userText, { color: colors.textPrimary }]}>{message.content}</Text>
        )}
      </View>
    </Animated.View>
  );
});

export default MessageBlock;

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
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
  bubble: {
    flex: 1,
    padding: 14,
    gap: 6,
    borderWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  role: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontFamily: "Poppins-Bold",
  },
  timestamp: {
    fontFamily: "Poppins-Regular",
    fontSize: 11,
  },
  userText: {
    fontFamily: "Poppins-Regular",
    fontSize: 15,
    lineHeight: 22,
  },
  assistantText: {
    fontFamily: "Poppins-Regular",
    fontSize: 15,
    lineHeight: 22,
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
