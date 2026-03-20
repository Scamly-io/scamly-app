import { useTheme } from "@/theme";
import { ReactNode } from "react";
import { Pressable, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

type CardProps = {
  children: ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  disabled?: boolean;
  variant?: "default" | "elevated" | "outlined";
  pressable?: boolean;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function Card({
  children,
  style,
  onPress,
  disabled = false,
  variant = "default",
  pressable = true,
}: CardProps) {
  const { colors, shadows, radius } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (pressable && onPress && !disabled) {
      scale.value = withSpring(0.98, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const getVariantStyle = (): ViewStyle => {
    switch (variant) {
      case "elevated":
        return {
          backgroundColor: colors.surface,
          ...shadows.lg,
        };
      case "outlined":
        return {
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
        };
      default:
        return {
          backgroundColor: colors.surface,
          ...shadows.md,
        };
    }
  };

  const cardStyle: ViewStyle = {
    borderRadius: radius.xl,
    padding: 16,
    ...getVariantStyle(),
    opacity: disabled ? 0.5 : 1,
  };

  if (onPress) {
    return (
      <AnimatedPressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        style={[cardStyle, animatedStyle, style]}
      >
        {children}
      </AnimatedPressable>
    );
  }

  return (
    <Animated.View style={[cardStyle, style]}>
      {children}
    </Animated.View>
  );
}


