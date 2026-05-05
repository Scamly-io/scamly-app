import Card from "@/components/Card";
import { useTheme } from "@/theme";
import { Shield } from "lucide-react-native";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

const DEFAULT_TIPS = [
  "Never share passwords or financial information via text or email.",
  "Verify the sender through official channels.",
  "Be wary of urgent requests or threats.",
  "Check URL details carefully before clicking links.",
] as const;

/**
 * Post-result tips card (“Stay Safe”) shown on the Scan tab and Clipboard scan.
 */
export default function ScanStaySafeTipsCard() {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          marginBottom: 24,
          backgroundColor: colors.accentMuted,
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
        },
        title: {
          fontFamily: "Poppins-SemiBold",
          fontSize: 17,
          color: colors.textPrimary,
        },
        list: {
          gap: 10,
        },
        tipRow: {
          flexDirection: "row",
          gap: 10,
        },
        bullet: {
          fontFamily: "Poppins-Bold",
          fontSize: 16,
          color: colors.accent,
        },
        tipText: {
          fontFamily: "Poppins-Regular",
          fontSize: 14,
          flex: 1,
          lineHeight: 20,
          color: colors.textSecondary,
        },
      }),
    [colors]
  );

  return (
    <Card style={styles.card} pressable={false}>
      <View style={styles.header}>
        <Shield size={20} color={colors.accent} />
        <Text style={styles.title}>Stay Safe</Text>
      </View>
      <View style={styles.list}>
        {DEFAULT_TIPS.map((tip, index) => (
          <View key={index} style={styles.tipRow}>
            <Text style={styles.bullet}>•</Text>
            <Text style={styles.tipText}>{tip}</Text>
          </View>
        ))}
      </View>
    </Card>
  );
}
