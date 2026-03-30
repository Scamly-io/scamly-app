import { defaultShimmerColors } from "@/utils/react-native-shimmer-text/colors";
import { ShimmerTextProps, textSizes } from "@/utils/react-native-shimmer-text/types";
import MaskedView from "@react-native-masked-view/masked-view";
import React from "react";
import { StyleSheet, Text, useColorScheme, View } from "react-native";
import Animated from "react-native-reanimated";

export function ShimmerText({
  children,
  style,
  shimmerStyle,
  containerStyle,
  duration = 3,
  bold = true,
  highlightWidth,
  direction = "ltr",
  angle = 100,
  width,
  height,
  size = "md",
  colors,
}: ShimmerTextProps) {
  const gradientBackground = "experimental_backgroundImage" as const;
  const systemColorScheme = useColorScheme() ?? "light";
  const currentColors = {
    ...defaultShimmerColors[systemColorScheme],
    ...colors?.[systemColorScheme],
  };
  const sizeConfig = textSizes[size];
  const defaultWidth =
    width ?? Math.max((children?.length || 0) * sizeConfig.fontSize * 0.6, 100);
  const defaultHeight =
    height ?? sizeConfig.height ?? sizeConfig.fontSize * 1.2;

  const shimmerColors = currentColors.shimmer;

  const hw = Math.max(0, Math.min(100, highlightWidth ?? NaN));
  const startStop = Number.isFinite(hw) ? 50 - hw / 2 : 46;
  const endStop = Number.isFinite(hw) ? 50 + hw / 2 : 54;

  return (
    <View
      style={[
        styles.shimmerContainer,
        { width: defaultWidth, height: defaultHeight },
        containerStyle,
      ]}
    >
      <MaskedView
        style={[styles.mask, { width: defaultWidth, height: defaultHeight }]}
        maskElement={
          <Text
            style={[
              styles.label,
              { color: currentColors.text, fontSize: sizeConfig.fontSize },
              style,
              { fontWeight: bold ? "bold" : "normal" },
            ]}
          >
            {children || ""}
          </Text>
        }
      >
        <Animated.View
          style={[
            styles.gradient,
            {
              [gradientBackground]: `linear-gradient(${angle}deg, ${shimmerColors.start} ${startStop}%, ${shimmerColors.middle} 50%, ${shimmerColors.end} ${endStop}%)`,
            } as any,
            {
              animationName: {
                from: {
                  transform: [
                    { translateX: direction === "ltr" ? "-25%" : "25%" },
                  ],
                },
                to: {
                  transform: [
                    { translateX: direction === "ltr" ? "25%" : "-25%" },
                  ],
                },
              },
              animationDuration: `${duration}s`,
              animationIterationCount: "infinite",
              animationTimingFunction: "linear",
            } as any,
            shimmerStyle,
          ]}
        />
      </MaskedView>
    </View>
  );
}

export default ShimmerText;

const styles = StyleSheet.create({
  shimmerContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  mask: {
    overflow: "hidden",
  },
  gradient: {
    flex: 1,
    width: "300%",
    marginHorizontal: "-100%",
  },
  label: {
    textAlign: "center",
  },
});