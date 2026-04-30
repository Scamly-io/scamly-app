import ChatChromeIconButton from "./chat-chrome-icon-button";
import { useTheme } from "@/theme";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { Image } from "expo-image";
import { ImagePlus, Send, X } from "lucide-react-native";
import type { ReactNode } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";

/** Single-line-ish min height; padding keeps the row visually slim */
const MIN_INPUT_HEIGHT = 30;
const MAX_INPUT_HEIGHT = 148;
const THUMB = 72;

export type ChatComposerAttachment = {
  id: string;
  uri: string;
  mimeType?: string;
  /** Present when attachments are ready for storage upload (`expo-image-picker` + `base64: true`). */
  base64: string;
};

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  /** When using the default plus button, keep it inert (e.g. free plan). */
  plusDisabled?: boolean;
  onPressPlus?: () => void;
  /** When set, replaces the default plus `ChatChromeIconButton` (e.g. wrap with `NativeMenu`). */
  plusSlot?: ReactNode;
  attachments?: ChatComposerAttachment[];
  onRemoveAttachment?: (id: string) => void;
  /** Links to `KeyboardGestureArea` (`textInputNativeID`) from react-native-keyboard-controller on iOS */
  composerNativeID?: string;
};

/**
 * Plus sits outside the message field glass (same chrome as header icon buttons). Composer uses
 * min/max height + scroll — no per-keystroke height state (keyboard stability).
 */
export default function ChatGlassInputBar({
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
}: Props) {
  const { colors, radius } = useTheme();
  const hasAtt = attachments.length > 0;
  const canSend = (value.trim().length > 0 || hasAtt) && !disabled;

  const attachmentStrip = hasAtt ? (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.attachScrollContent}
      >
        {attachments.map((a) => (
          <View key={a.id} style={styles.thumbWrap}>
            <Image source={{ uri: a.uri }} style={[styles.thumb, { borderRadius: radius.md }]} contentFit="cover" />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Remove attachment"
              onPress={() => (onRemoveAttachment ? onRemoveAttachment(a.id) : undefined)}
              hitSlop={10}
              style={({ pressed }) => [
                styles.thumbRemove,
                { opacity: pressed ? 0.85 : 1, backgroundColor: "rgba(0,0,0,0.45)" },
              ]}
            >
              <X size={16} color="#fff" strokeWidth={2.5} />
            </Pressable>
          </View>
        ))}
      </ScrollView>
    ) : null;

  const divider = hasAtt ? (
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
    ) : null;

  const fieldInner = (
    <View style={styles.fieldColumn}>
      {attachmentStrip}
      {divider}
      <View
        style={[
          styles.textCluster,
          {
            borderRadius: radius.xl,
            backgroundColor: "transparent",
          },
        ]}
      >
        <TextInput
          nativeID={composerNativeID}
          style={[styles.input, { color: colors.textPrimary }]}
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
            style={({ pressed }) => [styles.sendInside, { opacity: pressed ? 0.65 : 1 }]}
          >
            <Send size={22} color={colors.accent} strokeWidth={2} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const useGlass =
    Platform.OS === "ios" && typeof isGlassEffectAPIAvailable === "function" && isGlassEffectAPIAvailable();

  const messageField = useGlass ? (
    <GlassView
      style={[styles.glassOuter, { borderRadius: radius["2xl"], flex: 1 }]}
      glassEffectStyle="regular"
      colorScheme="auto"
    >
      {fieldInner}
    </GlassView>
  ) : (
    <View
      style={[
        styles.fallbackOuter,
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
    <View style={styles.row}>
      <View style={styles.plusSlotWrap}>
        {plusSlot ?? (
          <ChatChromeIconButton
            accessibilityLabel="Insert image"
            onPress={onPressPlus}
            bg={colors.surface}
            disabled={plusDisabled}
          >
            <ImagePlus size={22} color={colors.textPrimary} strokeWidth={2} />
          </ChatChromeIconButton>
        )}
      </View>

      {messageField}
    </View>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: MAX_INPUT_HEIGHT,
  },
  sendInside: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 0,
    paddingLeft: 4,
  },
});
