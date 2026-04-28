import { GlassView, isGlassEffectAPIAvailable } from "expo-glass-effect";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { ReactNode } from "react";
import { useTheme } from "@/theme";

type Props = {
  /** Label displayed next to the icon (truncates on narrow layouts). */
  label: string;
  icon: ReactNode;
  onPress: () => void;
  accessibilityLabel: string;
  /** Fallback background when glass is unavailable (Android / older iOS). */
  bg: string;
  /** Primary text colour for the label */
  labelColor: string;
  disabled?: boolean;
};

/**
 * Horizontal glass “pill” control matching {@link ChatChromeIconButton} iOS behaviour.
 */
export default function ChatGlassPillButton({
  label,
  icon,
  onPress,
  accessibilityLabel,
  bg,
  labelColor,
  disabled,
}: Props) {
  const { colors } = useTheme();
  const iosGlass =
    Platform.OS === "ios" &&
    typeof isGlassEffectAPIAvailable === "function" &&
    isGlassEffectAPIAvailable();

  const inner = (
    <Pressable
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.inner,
        { opacity: disabled ? 0.35 : pressed ? 0.75 : 1 },
      ]}
    >
      {icon}
      <Text style={[styles.label, { color: labelColor }]} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );

  if (iosGlass) {
    return (
      <GlassView style={styles.glass} glassEffectStyle="regular" colorScheme="auto">
        {inner}
      </GlassView>
    );
  }

  return (
    <View
      style={[
        styles.fallback,
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
