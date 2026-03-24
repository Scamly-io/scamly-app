import PolicyDocumentRenderer from "@/components/PolicyDocumentRenderer";
import ThemedBackground from "@/components/ThemedBackground";
import { useLatestPolicy } from "@/hooks/useLatestPolicy";
import { useTheme } from "@/theme";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function PrivacyPolicy() {
  const { colors } = useTheme();
  const { loading, policy, loadFailed } = useLatestPolicy("privacy");

  if (loading) {
    return (
      <ThemedBackground>
        <SafeAreaView edges={["top"]} style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.accent} />
        </SafeAreaView>
      </ThemedBackground>
    );
  }

  return (
    <ThemedBackground>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <View style={[styles.header, { borderBottomColor: colors.divider }]}>
          <Pressable onPress={() => router.back()} hitSlop={8} style={styles.backButton}>
            <ArrowLeft size={22} color={colors.textPrimary} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>Privacy Policy</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <Text style={[styles.company, { color: colors.textSecondary }]}>
            Scamly Pty Ltd{"\n"}81-83 Campbell Street{"\n"}Sydney NSW 2010
          </Text>

          <Text style={[styles.pageTitle, { color: colors.textPrimary }]}>Privacy Policy</Text>

          {policy?.version ? (
            <Text style={[styles.version, { color: colors.textSecondary }]}>
              Version {policy.version}
            </Text>
          ) : null}

          {loadFailed || !policy ? (
            <Text style={[styles.errorText, { color: colors.textSecondary }]}>
              We couldn't load the privacy policy. Please check your connection and try again
              later.
            </Text>
          ) : (
            <PolicyDocumentRenderer content={policy.content} />
          )}
        </ScrollView>
      </SafeAreaView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  safeArea: {
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backButton: {
    marginRight: 12,
  },
  headerTitle: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 18,
    flex: 1,
  },
  headerSpacer: {
    width: 34,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 60,
  },
  company: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 20,
  },
  pageTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 24,
    marginBottom: 8,
  },
  version: {
    fontFamily: "Poppins-Regular",
    fontSize: 13,
    marginBottom: 24,
  },
  errorText: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 22,
  },
});
