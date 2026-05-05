import Button from "@/components/Button";
import ThemedBackground from "@/components/ThemedBackground";
import { useTheme } from "@/theme";
import { useRouter } from "expo-router";
import { MailCheck } from "lucide-react-native";
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function SignUpConfirm() {
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
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.successMuted },
              ]}
            >
              <MailCheck size={36} color={colors.success} />
            </View>

            <Text style={[styles.headerText, { color: colors.textPrimary }]}>
              Check Your Email
            </Text>
            <Text style={[styles.bodyText, { color: colors.textSecondary }]}>
              We&apos;ve sent a confirmation link to your email address. Please check
              your inbox and click the link to verify your account.
            </Text>

            <Button
              onPress={() => router.replace("/login")}
              fullWidth
              size="lg"
            >
              Back to Sign In
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
    maxWidth: 400,
    padding: 28,
    alignItems: "center",
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  headerText: {
    fontSize: 26,
    fontFamily: "Poppins-Bold",
    marginBottom: 12,
    textAlign: "center",
  },
  bodyText: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 28,
  },
});
