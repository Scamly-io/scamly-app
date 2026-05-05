import { useTheme } from "@/theme";
import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

const DISCLAIMER_BODY =
  "This tool uses AI to analyze content for potential scams. Results are generated automatically and may not always reflect the full context. Always use your own judgment and verify through official sources.";

/**
 * Legal / expectation-setting copy shown below scan results on the Scan tab and onboarding.
 */
export default function ScanDisclaimer() {
  const { colors } = useTheme();
  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrap: {
          marginTop: 8,
        },
        title: {
          fontFamily: "Poppins-SemiBold",
          fontSize: 14,
          marginBottom: 6,
          color: colors.textSecondary,
        },
        body: {
          fontFamily: "Poppins-Regular",
          fontSize: 13,
          lineHeight: 19,
          color: colors.textTertiary,
        },
      }),
    [colors]
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>Disclaimer</Text>
      <Text style={styles.body}>{DISCLAIMER_BODY}</Text>
    </View>
  );
}
