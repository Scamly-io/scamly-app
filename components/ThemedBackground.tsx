import { useTheme } from "@/theme";
import { ReactNode } from "react";
import { StyleSheet, View, ViewStyle, useWindowDimensions } from "react-native";
import Svg, { Defs, Ellipse, RadialGradient, Stop } from "react-native-svg";

type ThemedBackgroundProps = {
  children: ReactNode;
  style?: ViewStyle;
  variant?: "default" | "subtle";
};

function LightGlows({ width: W, height: H }: { width: number; height: number }) {
  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFillObject}>
      <Defs>
        {/* Warm peach → light yellow → lavender */}
        <RadialGradient id="lg1" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FFE9D6" stopOpacity="0.72" />
          <Stop offset="38%" stopColor="#FDEDB9" stopOpacity="0.46" />
          <Stop offset="68%" stopColor="#F8F0FF" stopOpacity="0.20" />
          <Stop offset="100%" stopColor="#F8F0FF" stopOpacity="0" />
        </RadialGradient>
        {/* Lavender → pink → warm peach */}
        <RadialGradient id="lg2" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#F8F0FF" stopOpacity="0.62" />
          <Stop offset="40%" stopColor="#FCF0F6" stopOpacity="0.40" />
          <Stop offset="72%" stopColor="#FFE9D6" stopOpacity="0.16" />
          <Stop offset="100%" stopColor="#FFE9D6" stopOpacity="0" />
        </RadialGradient>
        {/* Soft pink → lavender */}
        <RadialGradient id="lg3" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#FCF0F6" stopOpacity="0.50" />
          <Stop offset="50%" stopColor="#F8F0FF" stopOpacity="0.26" />
          <Stop offset="100%" stopColor="#FFE9D6" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx={W * 0.30} cy={H * 0.18} rx={W * 0.72} ry={H * 0.40} fill="url(#lg1)" />
      <Ellipse cx={W * 0.72} cy={H * 0.26} rx={W * 0.55} ry={H * 0.36} fill="url(#lg2)" opacity={0.85} />
      <Ellipse cx={W * 0.50} cy={H * 0.32} rx={W * 0.46} ry={H * 0.30} fill="url(#lg3)" opacity={0.70} />
    </Svg>
  );
}

function DarkGlows({ width: W, height: H }: { width: number; height: number }) {
  return (
    <Svg width={W} height={H} style={StyleSheet.absoluteFillObject}>
      <Defs>
        {/* Violet → lavender → cyan */}
        <RadialGradient id="dg1" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#7C5CFC" stopOpacity="0.24" />
          <Stop offset="42%" stopColor="#A78BFA" stopOpacity="0.14" />
          <Stop offset="72%" stopColor="#22D3EE" stopOpacity="0.06" />
          <Stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
        </RadialGradient>
        {/* Cyan → violet → pink */}
        <RadialGradient id="dg2" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#22D3EE" stopOpacity="0.16" />
          <Stop offset="42%" stopColor="#7C5CFC" stopOpacity="0.18" />
          <Stop offset="72%" stopColor="#EC4899" stopOpacity="0.08" />
          <Stop offset="100%" stopColor="#EC4899" stopOpacity="0" />
        </RadialGradient>
        {/* Pink → violet */}
        <RadialGradient id="dg3" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor="#EC4899" stopOpacity="0.12" />
          <Stop offset="48%" stopColor="#7C5CFC" stopOpacity="0.14" />
          <Stop offset="100%" stopColor="#22D3EE" stopOpacity="0" />
        </RadialGradient>
      </Defs>
      <Ellipse cx={W * 0.28} cy={H * 0.16} rx={W * 0.72} ry={H * 0.40} fill="url(#dg1)" />
      <Ellipse cx={W * 0.72} cy={H * 0.24} rx={W * 0.58} ry={H * 0.38} fill="url(#dg2)" opacity={0.78} />
      <Ellipse cx={W * 0.50} cy={H * 0.30} rx={W * 0.48} ry={H * 0.32} fill="url(#dg3)" opacity={0.66} />
    </Svg>
  );
}

export default function ThemedBackground({
  children,
  style,
  variant = "default",
}: ThemedBackgroundProps) {
  const { colors, isDark } = useTheme();
  const { width, height } = useWindowDimensions();

  if (variant === "subtle") {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }, style]}>
        {children}
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }, style]}>
      <View pointerEvents="none" style={styles.glowContainer}>
        {isDark
          ? <DarkGlows width={width} height={height} />
          : <LightGlows width={width} height={height} />
        }
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  glowContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
});
