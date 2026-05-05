import Card from "@/components/Card";
import { useTheme } from "@/theme";
import type { ScanResult } from "@/utils/shared/types";
import { CheckCircle, TriangleAlert } from "lucide-react-native";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

/**
 * Foreground token for scan result header / confidence emphasis from `risk_level`.
 */
function scanRiskForeground(riskLevel: string, colors: ReturnType<typeof useTheme>["colors"]): string {
  switch (riskLevel) {
    case "low":
      return colors.success;
    case "medium":
      return colors.warning;
    case "high":
      return colors.error;
    default:
      return colors.textSecondary;
  }
}

/**
 * Muted background behind the risk summary card from `risk_level`.
 */
function scanRiskBackground(riskLevel: string, colors: ReturnType<typeof useTheme>["colors"]): string {
  switch (riskLevel) {
    case "low":
      return colors.successMuted;
    case "medium":
      return colors.warningMuted;
    case "high":
      return colors.errorMuted;
    default:
      return colors.backgroundSecondary;
  }
}

/**
 * User-facing headline for the risk summary card.
 * @param fallback - Used when `riskLevel` is not low/medium/high (e.g. clipboard uses \"Scan Result\").
 */
function scanResultHeadline(riskLevel: string, fallback = "Result"): string {
  switch (riskLevel) {
    case "low":
      return "Looks Safe";
    case "medium":
      return "Possibly a Scam";
    case "high":
      return "Likely a Scam";
    default:
      return fallback;
  }
}

type Props = {
  result: ScanResult;
  /** Clipboard uses a different default headline for unknown risk levels. */
  unknownHeadlineFallback?: string;
};

/**
 * Risk level, confidence, and short advisory for a successful scan.
 */
export default function ScanResultSummaryCard({
  result,
  unknownHeadlineFallback = "Result",
}: Props) {
  const { colors, isDark } = useTheme();
  const fg = scanRiskForeground(result.risk_level, colors);
  const bg = scanRiskBackground(result.risk_level, colors);
  const headline = scanResultHeadline(result.risk_level, unknownHeadlineFallback);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          marginBottom: 16,
          backgroundColor: bg,
        },
        header: {
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 8,
        },
        titleRow: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
        },
        title: {
          fontFamily: "Poppins-Bold",
          fontSize: 20,
          color: fg,
        },
        confidenceText: {
          fontFamily: "Poppins-Bold",
          fontSize: 26,
          color: fg,
        },
        resultDetails: {
          flexDirection: "row",
          justifyContent: "space-between",
          marginBottom: 16,
        },
        meta: {
          fontFamily: "Poppins-Regular",
          fontSize: 14,
          color: colors.textSecondary,
        },
        warningBox: {
          padding: 14,
          borderRadius: 12,
          backgroundColor: isDark ? colors.surface : "rgba(255,255,255,0.6)",
        },
        warningText: {
          fontFamily: "Poppins-Regular",
          fontSize: 14,
          lineHeight: 20,
          color: colors.textPrimary,
        },
      }),
    [bg, colors, fg, isDark]
  );

  return (
    <Card style={styles.card} pressable={false}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          {result.is_scam ? (
            <TriangleAlert size={24} color={fg} />
          ) : (
            <CheckCircle size={24} color={fg} />
          )}
          <Text style={styles.title}>{headline}</Text>
        </View>
        <Text style={styles.confidenceText}>{result.confidence}%</Text>
      </View>
      <View style={styles.resultDetails}>
        <Text style={styles.meta}>
          {result.risk_level.charAt(0).toUpperCase() + result.risk_level.slice(1)} risk detected
        </Text>
        <Text style={styles.meta}>Confidence</Text>
      </View>
      <View style={styles.warningBox}>
        <Text style={styles.warningText}>
          {result.is_scam
            ? "Do not respond or click any links. Report and delete this message immediately."
            : "This looks safe. But always verify the sender before responding."}
        </Text>
      </View>
    </Card>
  );
}
