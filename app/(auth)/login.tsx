import Button from "@/components/Button";
import ThemedBackground from "@/components/ThemedBackground";
import { useTheme } from "@/theme";
import { supabase } from "@/utils/supabase";
import { useRouter } from "expo-router";
import { Lock, Mail } from "lucide-react-native";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import Animated, {
  FadeInDown
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function Login() {
  const { colors, radius, shadows, isDark } = useTheme();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Error", "Please enter an email and password");
      return;
    }

    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        Alert.alert("Error", error.message);
        setLoading(false);
        return;
      }

      router.replace("/home");
    } catch (error) {
      Alert.alert("Error", "Something went wrong while logging in. Please try again.");
      setLoading(false);
    }
  };

  const getInputStyle = (focused: boolean) => ({
    backgroundColor: focused ? colors.surface : colors.backgroundSecondary,
    borderColor: focused ? colors.accent : colors.border,
  });

  return (
    <ThemedBackground>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.keyboardView}
        >
          <ScrollView
            contentContainerStyle={styles.container}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
              <View style={[styles.logoContainer, { backgroundColor: colors.accentMuted }]}>
                <Image
                  source={
                    isDark
                      ? require("@/assets/images/page-images/logo_square_dark.png")
                      : require("@/assets/images/page-images/logo_square_light.png")
                  }
                  style={styles.logo}
                  resizeMode="contain"
                />
              </View>

              <Text style={[styles.headerText, { color: colors.textPrimary }]}>
                Welcome Back
              </Text>
              <Text style={[styles.subHeaderText, { color: colors.textSecondary }]}>
                Sign in to continue
              </Text>

              <View style={styles.inputContainer}>
                <View
                  style={[
                    styles.inputWrapper,
                    { borderRadius: radius.lg },
                    getInputStyle(emailFocused),
                  ]}
                >
                  <Mail size={20} color={emailFocused ? colors.accent : colors.textTertiary} />
                  <TextInput
                    placeholder="Email"
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.input, { color: colors.textPrimary }]}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                  />
                </View>
                <View
                  style={[
                    styles.inputWrapper,
                    { borderRadius: radius.lg },
                    getInputStyle(passwordFocused),
                  ]}
                >
                  <Lock size={20} color={passwordFocused ? colors.accent : colors.textTertiary} />
                  <TextInput
                    placeholder="Password"
                    placeholderTextColor={colors.textTertiary}
                    style={[styles.input, { color: colors.textPrimary }]}
                    secureTextEntry={true}
                    value={password}
                    onChangeText={setPassword}
                    autoCapitalize="none"
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                  />
                </View>
              </View>

              <Button
                onPress={handleLogin}
                loading={loading}
                disabled={loading}
                fullWidth
                size="lg"
              >
                Sign in
              </Button>

              <View style={[styles.disclaimer, { borderTopColor: colors.divider }]}>
                <Text style={[styles.disclaimerText, { color: colors.textSecondary }]}>
                  New here? You'll need to create an account through our online dashboard.
                </Text>
              </View>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  container: {
    flexGrow: 1,
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
  logoContainer: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  logo: {
    width: 48,
    height: 48,
  },
  headerText: {
    fontSize: 26,
    fontFamily: "Poppins-Bold",
    marginBottom: 4,
  },
  subHeaderText: {
    fontSize: 15,
    fontFamily: "Poppins-Regular",
    marginBottom: 28,
  },
  inputContainer: {
    width: "100%",
    gap: 14,
    marginBottom: 24,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    height: 56,
    borderWidth: 1.5,
    gap: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Poppins-Regular",
    height: "100%",
  },
  disclaimer: {
    marginTop: 24,
    paddingTop: 20,
    borderTopWidth: 1,
    width: "100%",
  },
  disclaimerText: {
    fontSize: 13,
    fontFamily: "Poppins-Regular",
    textAlign: "center",
    lineHeight: 19,
  },
});
