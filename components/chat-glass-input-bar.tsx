import { useTheme } from "@/theme";
import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { Plus, Send } from "lucide-react-native";
import { useCallback, useState } from "react";
import type { NativeSyntheticEvent, TextInputContentSizeChangeEventData } from "react-native";
import { Platform, Pressable, StyleSheet, TextInput, View } from "react-native";

const MIN_INPUT_HEIGHT = 44;
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
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
  const canSend = value.trim().length > 0 && !disabled;

  const scrollEnabled = inputHeight >= MAX_INPUT_HEIGHT;

  const isEmpty = value.length === 0;

  const onContentSizeChange = useCallback(
    (e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>) => {
      const raw = Math.min(
        MAX_INPUT_HEIGHT,
        Math.max(MIN_INPUT_HEIGHT, Math.round(e.nativeEvent.contentSize.height + 18))
      );
      setInputHeight((prev) => (Math.abs(prev - raw) <= 4 ? prev : raw));
    },
    []
  );

  /** Lock height to MIN when there's no text. Multiline TextInput on iOS reports oscillating heights from
   *  the simulator's measure pass while idle — we don't need a height value when empty. */
  const resolvedHeight = isEmpty ? MIN_INPUT_HEIGHT : scrollEnabled ? MAX_INPUT_HEIGHT : inputHeight;

  const inner = (
    <View style={styles.row}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add attachment"
        hitSlop={10}
        onPress={onPressPlus}
        style={[
          styles.plusButton,
          {
            backgroundColor: colors.backgroundSecondary,
            borderRadius: radius.full,
          },
        ]}
      >
        <Plus size={22} color={colors.textPrimary} strokeWidth={2} />
      </Pressable>

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
          style={[
            styles.input,
            {
              color: colors.textPrimary,
              height: resolvedHeight,
            },
          ]}
          placeholder={placeholder ?? "Message Scamly..."}
          placeholderTextColor={colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          multiline
          scrollEnabled={scrollEnabled}
          editable={!disabled}
          blurOnSubmit={false}
          returnKeyType="default"
          textAlignVertical="top"
          onContentSizeChange={onContentSizeChange}
        />
        {canSend ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send message"
            onPress={onSend}
            style={[
              styles.sendInside,
              {
                backgroundColor: colors.accent,
                borderRadius: radius.full,
              },
            ]}
          >
            <Send size={18} color={colors.textInverse} />
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  const useGlass =
    Platform.OS === "ios" && typeof isGlassEffectAPIAvailable === "function" && isGlassEffectAPIAvailable();

  if (useGlass) {
    return (
      <GlassView
        style={[styles.glassOuter, { borderRadius: radius["2xl"] }]}
        glassEffectStyle="regular"
        colorScheme="auto"
      >
        {inner}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        styles.fallbackOuter,
        {
          backgroundColor: colors.surface,
          borderColor: colors.border,
          borderRadius: radius["2xl"],
        },
      ]}
    >
      {inner}
    </View>
  );
}

const styles = StyleSheet.create({
  glassOuter: {
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fallbackOuter: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 10,
  },
  plusButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  textCluster: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    backgroundColor: "transparent",
  },
  input: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: 16,
    lineHeight: 22,
    paddingVertical: 6,
    paddingHorizontal: 0,
    minHeight: MIN_INPUT_HEIGHT - 16,
    maxHeight: MAX_INPUT_HEIGHT,
  },
  sendInside: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
});
