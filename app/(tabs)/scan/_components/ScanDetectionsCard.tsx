import Card from "@/components/Card";
import { useTheme } from "@/theme";
import type { ThemeColors } from "@/theme";
import type { ScanResult } from "@/utils/shared/types";
import { ChevronDown, ChevronUp, ShieldCheck, TriangleAlert, XCircle } from "lucide-react-native";
import { useMemo } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export type DetectionSeverityIconVariant = "default" | "clipboard";

type Props = {
  detections: ScanResult["detections"];
  expandedDetections: Set<number>;
  onToggleExpanded: (index: number) => void;
  /** Clipboard quick scan uses shield for low severity; main scan uses triangle. */
  severityIconVariant?: DetectionSeverityIconVariant;
};

function SeverityIcon({
  severity,
  colors,
  variant,
}: {
  severity: string;
  colors: ThemeColors;
  variant: DetectionSeverityIconVariant;
}) {
  if (variant === "clipboard") {
    switch (severity) {
      case "low":
        return <ShieldCheck size={20} color={colors.success} />;
      case "medium":
        return <TriangleAlert size={20} color={colors.warning} />;
      case "high":
        return <XCircle size={20} color={colors.error} />;
      default:
        return null;
    }
  }
  switch (severity) {
    case "low":
      return <TriangleAlert size={20} color={colors.success} />;
    case "medium":
      return <TriangleAlert size={20} color={colors.warning} />;
    case "high":
      return <XCircle size={20} color={colors.error} />;
    default:
      return null;
  }
}

/**
 * Expandable “Key Detections” list from a scan result.
 */
export default function ScanDetectionsCard({
  detections,
  expandedDetections,
  onToggleExpanded,
  severityIconVariant = "default",
}: Props) {
  const { colors, radius } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          marginBottom: 16,
        },
        title: {
          fontFamily: "Poppins-SemiBold",
          fontSize: 18,
          marginBottom: 14,
          color: colors.textPrimary,
        },
        list: {
          gap: 10,
        },
        wrapper: {
          overflow: "hidden",
          backgroundColor: colors.backgroundSecondary,
          borderRadius: radius.lg,
        },
        item: {
          flexDirection: "row",
          alignItems: "center",
          gap: 12,
          padding: 14,
          backgroundColor: colors.backgroundSecondary,
        },
        description: {
          fontFamily: "Poppins-SemiBold",
          fontSize: 14,
          flex: 1,
          lineHeight: 20,
          color: colors.textPrimary,
        },
        detailsContainer: {
          paddingVertical: 12,
          paddingLeft: 46,
          paddingRight: 14,
          borderTopWidth: 1,
          borderTopColor: colors.border,
        },
        detailsText: {
          fontFamily: "Poppins-Regular",
          fontSize: 14,
          lineHeight: 20,
          color: colors.textSecondary,
        },
      }),
    [colors, radius.lg]
  );

  return (
    <Card style={styles.card} pressable={false}>
      <Text style={styles.title}>Key Detections</Text>
      <View style={styles.list}>
        {detections.map((detection, index) => {
          const isExpanded = expandedDetections.has(index);
          return (
            <View key={index} style={styles.wrapper}>
              <TouchableOpacity
                style={styles.item}
                onPress={() => onToggleExpanded(index)}
                activeOpacity={0.7}
              >
                <SeverityIcon severity={detection.severity} colors={colors} variant={severityIconVariant} />
                <Text style={styles.description} numberOfLines={isExpanded ? undefined : 1}>
                  {detection.description}
                </Text>
                {isExpanded ? (
                  <ChevronUp size={20} color={colors.textSecondary} />
                ) : (
                  <ChevronDown size={20} color={colors.textSecondary} />
                )}
              </TouchableOpacity>
              {isExpanded ? (
                <View style={styles.detailsContainer}>
                  <Text style={styles.detailsText}>{detection.details}</Text>
                </View>
              ) : null}
            </View>
          );
        })}
      </View>
    </Card>
  );
}
