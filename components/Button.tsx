import { useTheme } from "@/theme";
import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, ViewStyle, TextStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = {
  children: ReactNode;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
};

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export default function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
}: ButtonProps) {
  const { colors, radius, shadows } = useTheme();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (!disabled && !loading) {
      scale.value = withSpring(0.96, { damping: 15, stiffness: 300 });
    }
  };

  const handlePressOut = () => {
    scale.value = withSpring(1, { damping: 15, stiffness: 300 });
  };

  const getSizeStyle = (): { container: ViewStyle; text: TextStyle } => {
    switch (size) {
      case "sm":
        return {
          container: { paddingVertical: 8, paddingHorizontal: 14 },
          text: { fontSize: 14 },
        };
      case "lg":
        return {
          container: { paddingVertical: 16, paddingHorizontal: 24 },
          text: { fontSize: 17 },
        };
      default:
        return {
          container: { paddingVertical: 12, paddingHorizontal: 20 },
          text: { fontSize: 15 },
        };
    }
  };

  const getVariantStyle = (): { container: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case "secondary":
        return {
          container: {
            backgroundColor: colors.accentMuted,
          },
          text: { color: colors.accent },
        };
      case "ghost":
        return {
          container: {
            backgroundColor: "transparent",
          },
          text: { color: colors.accent },
        };
      case "danger":
        return {
          container: {
            backgroundColor: colors.error,
            ...shadows.md,
          },
          text: { color: colors.textInverse },
        };
      default:
        return {
          container: {
            backgroundColor: colors.accent,
            ...shadows.md,
          },
          text: { color: colors.textInverse },
        };
    }
  };

  const sizeStyle = getSizeStyle();
  const variantStyle = getVariantStyle();

  const containerStyle: ViewStyle = {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: radius.lg,
    opacity: disabled || loading ? 0.6 : 1,
    ...sizeStyle.container,
    ...variantStyle.container,
    ...(fullWidth && { width: "100%" }),
  };

  const textStyle: TextStyle = {
    fontFamily: "Poppins-SemiBold",
    ...sizeStyle.text,
    ...variantStyle.text,
  };

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      style={[containerStyle, animatedStyle, style]}
    >
      {loading ? (
        <ActivityIndicator color={variantStyle.text.color} size="small" />
      ) : (
        <>
          {icon}
          <Text style={textStyle}>{children}</Text>
        </>
      )}
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({});

