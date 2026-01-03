import { useTheme } from "@/theme";
import { ReactNode } from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { LinearGradient } from "expo-linear-gradient";

type ThemedBackgroundProps = {
  children: ReactNode;
  style?: ViewStyle;
  variant?: "default" | "subtle";
};

export default function ThemedBackground({ 
  children, 
  style,
  variant = "default" 
}: ThemedBackgroundProps) {
  const { colors, isDark } = useTheme();

  if (variant === "subtle" || isDark) {
    // In dark mode or subtle variant, use solid background
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, style]}>
        {children}
      </View>
    );
  }

  // Light mode default: very subtle gradient
  return (
    <LinearGradient
      colors={[colors.background, colors.backgroundSecondary]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.container, style]}
    >
      {children}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

