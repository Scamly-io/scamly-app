import { useTheme } from "@/theme";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

type Props = {
  /** Plain dots only — no pill background (matches full-width assistant layout). */
  variant?: "default" | "plain";
};

export default function ThinkingIndicator({ variant = "default" }: Props) {
  const { colors } = useTheme();
  const dot1 = useSharedValue(0.3);
  const dot2 = useSharedValue(0.3);
  const dot3 = useSharedValue(0.3);

  useEffect(() => {
    const duration = 400;
    dot1.value = withRepeat(
      withTiming(1, { duration }),
      -1,
      true
    );
    dot2.value = withDelay(
      150,
      withRepeat(withTiming(1, { duration }), -1, true)
    );
    dot3.value = withDelay(
      300,
      withRepeat(withTiming(1, { duration }), -1, true)
    );
  }, [dot1, dot2, dot3]);

  const dot1Style = useAnimatedStyle(() => ({
    opacity: dot1.value,
    transform: [{ scale: 0.8 + dot1.value * 0.2 }],
  }));

  const dot2Style = useAnimatedStyle(() => ({
    opacity: dot2.value,
    transform: [{ scale: 0.8 + dot2.value * 0.2 }],
  }));

  const dot3Style = useAnimatedStyle(() => ({
    opacity: dot3.value,
    transform: [{ scale: 0.8 + dot3.value * 0.2 }],
  }));

  const isPlain = variant === "plain";

  return (
    <View style={!isPlain ? [styles.container, { backgroundColor: colors.backgroundSecondary }] : styles.plain}>
      <Animated.View style={[styles.dot, { backgroundColor: colors.accent }, dot1Style]} />
      <Animated.View style={[styles.dot, { backgroundColor: colors.accent }, dot2Style]} />
      <Animated.View style={[styles.dot, { backgroundColor: colors.accent }, dot3Style]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 16,
    gap: 6,
  },
  plain: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
