import Card from "@/components/Card";
import { useTheme } from "@/theme";
import { TriangleAlert } from "lucide-react-native";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

type Props = {
  message: string;
  footer?: ReactNode;
};

/**
 * Warning card when the model could not produce a confident scan result.
 */
export default function ScanFailureCard({ message, footer }: Props) {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        card: {
          marginBottom: 16,
          borderWidth: 1,
          borderColor: "transparent",
          backgroundColor: colors.warningMuted,
        },
        header: {
          flexDirection: "row",
          alignItems: "center",
          gap: 10,
          marginBottom: 8,
        },
        title: {
          fontFamily: "Poppins-SemiBold",
          fontSize: 16,
          color: colors.warning,
        },
        reason: {
          fontFamily: "Poppins-Regular",
          fontSize: 14,
          lineHeight: 20,
          color: colors.textPrimary,
        },
      }),
    [colors]
  );

  return (
    <Card style={styles.card} pressable={false}>
      <View style={styles.header}>
        <TriangleAlert size={20} color={colors.warning} />
        <Text style={styles.title}>We couldn&apos;t complete this scan</Text>
      </View>
      <Text style={styles.reason}>{message}</Text>
      {footer}
    </Card>
  );
}
