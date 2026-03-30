import { TextStyle, ViewStyle } from "react-native";

export interface WebShimmerStyle {
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundRepeat?: string;
  backgroundPosition?: string;
  WebkitBackgroundClip?: string;
  backgroundClip?: string;
  animationName?: string;
  animationDuration?: string;
  animationIterationCount?: number | "infinite";
  animationTimingFunction?: string;
  animation?: string;
  experimental_backgroundImage?: string;
}

export interface WebAnimationStyle extends ViewStyle {
  animationName?: string;
  animationDuration?: string;
  animationIterationCount?: number | "infinite";
  animationTimingFunction?: string;
}

export type TextSize =
  | "xs"
  | "sm"
  | "md"
  | "lg"
  | "xl"
  | "2xl"
  | "3xl"
  | "4xl"
  | "5xl"
  | "7xl"
  | "9xl";

export interface ShimmerColors {
  text: string;
  shimmer: {
    start: string;
    middle: string;
    end: string;
  };
}

export interface ShimmerTextProps {
  children?: string;
  style?: TextStyle;
  shimmerStyle?: ViewStyle | WebShimmerStyle;
  containerStyle?: ViewStyle;
  duration?: number;
  bold?: boolean;
  highlightWidth?: number;
  direction?: "ltr" | "rtl";
  angle?: number;
  size?: TextSize;
  colors?: {
    light?: Partial<ShimmerColors>;
    dark?: Partial<ShimmerColors>;
  };
  width?: number;
  height?: number;
}

export const textSizes: Record<
  TextSize,
  { fontSize: number; height?: number }
> = {
  xs: { fontSize: 12, height: 16 },
  sm: { fontSize: 14, height: 20 },
  md: { fontSize: 16, height: 24 },
  lg: { fontSize: 18, height: 28 },
  xl: { fontSize: 20, height: 32 },
  "2xl": { fontSize: 24, height: 36 },
  "3xl": { fontSize: 30, height: 42 },
  "4xl": { fontSize: 36, height: 50 },
  "5xl": { fontSize: 48, height: 64 },
  "7xl": { fontSize: 72, height: 90 },
  "9xl": { fontSize: 128, height: 150 },
};