import Button from "@/components/Button";
import ThemedBackground from "@/components/ThemedBackground";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import { CheckCircle2 } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function AccountDeleted() {
  const { colors, radius, shadows } = useTheme();
  const router = useRouter();

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.container}>
          <Animated.View
            entering={FadeInDown.duration(600).delay(100)}
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderRadius: radius["2xl"],
                ...shadows.xl,
              },
            ]}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.accentMuted }]}>
              <CheckCircle2 size={38} color={colors.accent} />
            </View>

            <Text style={[styles.headerText, { color: colors.textPrimary }]}>
              Account Deleted
            </Text>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              Your Scamly account has been permanently deleted and any active
              subscriptions have been cancelled with no further billing.
            </Text>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              A confirmation email has been sent to your email address.
            </Text>

            <Button
              onPress={() => router.replace("/login")}
              fullWidth
              size="lg"
            >
              Back to Login
            </Button>
          </Animated.View>
        </View>
      </SafeAreaView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: 28,
    alignItems: "center",
  },
  iconContainer: {
    width: 84,
    height: 84,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  headerText: {
    fontSize: 32,
    fontFamily: "Poppins-Bold",
    marginBottom: 14,
    textAlign: "center",
  },
  bodyText: {
    fontSize: 17,
    fontFamily: "Poppins-Regular",
    textAlign: "center",
    lineHeight: 27,
    marginBottom: 10,
  },
});
