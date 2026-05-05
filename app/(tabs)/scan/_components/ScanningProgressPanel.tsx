import ShimmerText from "@/components/ShimmerText";
import { useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { Image, StyleSheet, Text, View } from "react-native";

function shimmerColorsSpec(colors: ThemeColors) {
  return {
    light: {
      text: colors.textSecondary,
      shimmer: {
        start: colors.textSecondary,
        middle: colors.accentMuted,
        end: colors.textSecondary,
      },
    },
    dark: {
      text: colors.textSecondary,
      shimmer: {
        start: colors.textSecondary,
        middle: colors.accentMuted,
        end: colors.textSecondary,
      },
    },
  } as const;
}

type Props = {
  thumbnailUri: string;
  scanPhase: "scanning" | "complete";
  scanStage: number;
  stageTexts: readonly [string, string, string];
  /** Shown when `scanPhase === "complete"` (e.g. actions or “Scan complete” copy). */
  completeSlot: ReactNode;
};

const SHIMMER_ROW_STYLE = StyleSheet.create({
  rowMargin: { marginBottom: 6 },
  shimmerAlign: { alignItems: "flex-start" as const },
  shimmerText: { fontFamily: "Poppins-Medium", textAlign: "left" as const },
});

/**
 * Compact header during scan: thumbnail plus staged progress copy (shimmer while active).
 */
export default function ScanningProgressPanel({
  thumbnailUri,
  scanPhase,
  scanStage,
  stageTexts,
  completeSlot,
}: Props) {
  const { colors, radius } = useTheme();
  const shimmerSpec = useMemo(() => shimmerColorsSpec(colors), [colors]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scanningHeader: {
          flexDirection: "row",
          alignItems: "flex-start",
          gap: 14,
        },
        thumbnailImage: {
          width: 56,
          height: 74,
          borderRadius: radius.md,
          backgroundColor: colors.backgroundSecondary,
        },
        scanningTextContainer: {
          flex: 1,
          paddingTop: 2,
        },
        scanningStageText: {
          fontFamily: "Poppins-Medium",
          fontSize: 14,
          lineHeight: 20,
          color: colors.textPrimary,
        },
      }),
    [colors.backgroundSecondary, colors.textPrimary, radius.md]
  );

  return (
    <View style={styles.scanningHeader}>
      <Image source={{ uri: thumbnailUri }} style={styles.thumbnailImage} />
      <View style={styles.scanningTextContainer}>
        {scanPhase === "scanning" ? (
          <View>
            <View style={SHIMMER_ROW_STYLE.rowMargin}>
              {scanStage === 0 ? (
                <ShimmerText
                  size="sm"
                  bold={false}
                  duration={1.4}
                  containerStyle={SHIMMER_ROW_STYLE.shimmerAlign}
                  style={SHIMMER_ROW_STYLE.shimmerText}
                  colors={shimmerSpec}
                >
                  {stageTexts[0]}
                </ShimmerText>
              ) : (
                <Text style={styles.scanningStageText}>{stageTexts[0]}</Text>
              )}
            </View>
            {scanStage >= 1 ? (
              <View style={SHIMMER_ROW_STYLE.rowMargin}>
                {scanStage === 1 ? (
                  <ShimmerText
                    size="sm"
                    bold={false}
                    duration={1.4}
                    containerStyle={SHIMMER_ROW_STYLE.shimmerAlign}
                    style={SHIMMER_ROW_STYLE.shimmerText}
                    colors={shimmerSpec}
                  >
                    {stageTexts[1]}
                  </ShimmerText>
                ) : (
                  <Text style={styles.scanningStageText}>{stageTexts[1]}</Text>
                )}
              </View>
            ) : null}
            {scanStage >= 2 ? (
              <View style={SHIMMER_ROW_STYLE.rowMargin}>
                <ShimmerText
                  size="sm"
                  bold={false}
                  duration={1.4}
                  containerStyle={SHIMMER_ROW_STYLE.shimmerAlign}
                  style={SHIMMER_ROW_STYLE.shimmerText}
                  colors={shimmerSpec}
                >
                  {stageTexts[2]}
                </ShimmerText>
              </View>
            ) : null}
          </View>
        ) : (
          completeSlot
        )}
      </View>
    </View>
  );
}
