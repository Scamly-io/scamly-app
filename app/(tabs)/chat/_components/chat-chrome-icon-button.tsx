import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import type { ReactNode } from "react";
import { useTheme } from "@/theme";

type Props = {
  children: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  bg: string;
  disabled?: boolean;
};

export default function ChatChromeIconButton({
  children,
  onPress,
  accessibilityLabel,
  bg,
  disabled,
}: Props) {
  const { colors } = useTheme();
  const iosGlass =
    Platform.OS === "ios" && typeof isGlassEffectAPIAvailable === "function" && isGlassEffectAPIAvailable();

  const inner = (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.chromeBtnInner,
        { opacity: disabled ? 0.35 : pressed ? 0.75 : 1 },
      ]}
    >
      {children}
    </Pressable>
  );

  if (iosGlass) {
    return (
      <GlassView style={styles.chromeGlass} glassEffectStyle="regular" colorScheme="auto">
        {inner}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        styles.chromeFallback,
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

const styles = StyleSheet.create({
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
