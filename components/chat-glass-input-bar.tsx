import ChatChromeIconButton from "@/components/chat-chrome-icon-button";
import { useTheme } from "@/theme";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { Plus, Send } from "lucide-react-native";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";

/** Single-line-ish min height; padding keeps the row visually slim */
const MIN_INPUT_HEIGHT = 30;
const MAX_INPUT_HEIGHT = 148;

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder?: string;
  disabled?: boolean;
  onPressPlus?: () => void;
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
  onPressPlus = () => {},
  composerNativeID,
}: Props) {
  const { colors, radius } = useTheme();
  const canSend = value.trim().length > 0 && !disabled;

  const fieldInner = (
    <View
      style={[
        styles.textCluster,
        {
          borderRadius: radius.xl,
          backgroundColor: Platform.OS === "android" ? colors.backgroundSecondary : "transparent",
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
          borderRadius: radius["2xl"],
        },
      ]}
    >
      {fieldInner}
    </View>
  );

  return (
    <View style={styles.row}>
      <ChatChromeIconButton
        accessibilityLabel="Add attachment"
        onPress={onPressPlus}
        bg={colors.backgroundSecondary}
      >
        <Plus size={22} color={colors.textPrimary} strokeWidth={2} />
      </ChatChromeIconButton>

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
  /** No vertical `flex` here — `flex: 1` in a column parent stretches this row to fill GlassView and
   *  stops multiline `TextInput` from sizing to its content on iOS. */
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
  /** `flex: 1` shorthand can prevent vertical growth; grow only on the row axis via flexGrow + minWidth. */
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
