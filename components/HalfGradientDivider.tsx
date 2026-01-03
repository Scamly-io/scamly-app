import { useTheme } from "@/theme";
import { View, StyleSheet } from "react-native";

export default function HalfGradientDivider() {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <View style={[styles.divider, { backgroundColor: colors.border }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
  },
  divider: {
    height: 1,
  },
});
