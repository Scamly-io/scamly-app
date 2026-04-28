import { useTheme } from "@/theme";
import Markdown from "@ronradtke/react-native-markdown-display";
import { memo, useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, Text, useWindowDimensions, View } from "react-native";

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
