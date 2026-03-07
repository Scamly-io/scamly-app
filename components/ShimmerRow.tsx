import { useTheme } from "@/theme";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from "react-native-reanimated";

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

const SHIMMER_WIDTH = 120;

interface ShimmerRowProps {
  text: string;
  isActive: boolean;
  isVisible: boolean;
}

export default function ShimmerRow({ text, isActive, isVisible }: ShimmerRowProps) {
  const { colors } = useTheme();
  const translateX = useSharedValue(-SHIMMER_WIDTH);

  useEffect(() => {
    if (isActive) {
      translateX.value = -SHIMMER_WIDTH;
      translateX.value = withRepeat(
        withTiming(300, { duration: 1400, easing: Easing.inOut(Easing.ease) }),
        -1,
        false
      );
    }
  }, [isActive]);

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  if (!isVisible) return null;

  return (
    <View style={styles.row}>
      <View
        style={[
          styles.shimmerContainer,
          isActive && { overflow: "hidden" as const },
        ]}
      >
        <Text
          style={[
            styles.text,
            { color: isActive ? colors.textSecondary : colors.textPrimary },
          ]}
        >
          {text}
        </Text>
        {isActive && (
          <AnimatedLinearGradient
            colors={["transparent", colors.accentMuted, "transparent"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[styles.shimmerGradient, shimmerStyle]}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    marginBottom: 6,
  },
  shimmerContainer: {
    position: "relative",
    borderRadius: 6,
    alignSelf: "flex-start",
    paddingVertical: 2,
    paddingHorizontal: 4,
  },
  text: {
    fontFamily: "Poppins-Medium",
    fontSize: 14,
    lineHeight: 20,
  },
  shimmerGradient: {
    ...StyleSheet.absoluteFillObject,
    width: SHIMMER_WIDTH,
    borderRadius: 6,
  },
});
