import Button from "@/components/Button";
import PersonalStepShell from "./_components/personal-step-shell";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import {
  getAuthenticationMethodForAnalytics,
  trackOnboardingStepViewed,
  trackOnboardingTutorialDismissed,
} from "@/utils/shared/analytics";
import { completeOnboardingTutorialWithPaywall } from "@/utils/onboarding/onboarding-tutorial-exit";
import { onboardingHref } from "@/utils/onboarding/onboarding-href";
import { captureError } from "@/utils/shared/sentry";
import { supabase } from "@/utils/shared/supabase";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { Text, TextInput, View, ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { Lock, Mail } from "lucide-react-native";

/**
 * Shown when the account email is not yet confirmed so the user can refresh, resend, or use a light sign-in.
 */
export default function OnboardingTutorialEmailPending() {
  const { colors, radius } = useTheme();
  const { user, checkOnboarding, refreshAuth } = useAuth();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [exitLoading, setExitLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const authMethod = getAuthenticationMethodForAnalytics(user);

  useEffect(() => {
    trackOnboardingStepViewed("tutorial_email_reminder", { auth_method: authMethod });
  }, [authMethod]);

  const onSkip = async () => {
    if (!user) {
      return;
    }
    setExitLoading(true);
    try {
      trackOnboardingTutorialDismissed("tutorial_email_reminder", { auth_method: authMethod });
      await completeOnboardingTutorialWithPaywall({ user, checkOnboarding, refreshAuth, router });
    } catch (e) {
      captureError(e, { feature: "onboarding", action: "skip_email_tutorial", severity: "critical" });
    } finally {
      setExitLoading(false);
    }
  };

  const onResend = async () => {
    if (!user?.email) {
      return;
    }
    setResendMsg(null);
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: "signup", email: user.email });
    if (error) {
      setResendMsg("Couldn’t resend just now. Try again.");
      captureError(error, { feature: "onboarding", action: "resend_email", severity: "warning" });
    } else {
      setResendMsg("We sent another email. Check your inbox.");
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setLoading(true);
    try {
      const { data: s } = await supabase.auth.refreshSession();
      if (s.session?.user?.email_confirmed_at) {
        await refreshAuth();
        router.replace(onboardingHref("/onboarding"));
        return;
      }
      setResendMsg("Not confirmed yet — open the link in your email first.");
    } catch (e) {
      captureError(e, { feature: "onboarding", action: "refresh_email_session", severity: "warning" });
    } finally {
      setLoading(false);
    }
  };

  const onSignInCheck = async () => {
    if (!user?.email || !password) {
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password,
    });
    if (error || !data.user?.email_confirmed_at) {
      setResendMsg("We couldn’t confirm your email yet. Use the link we sent, or check your password.");
      setLoading(false);
      return;
    }
    await refreshAuth();
    setLoading(false);
    setPassword("");
    router.replace(onboardingHref("/onboarding"));
  };

  if (!user) {
    return null;
  }

  if (exitLoading) {
    return (
      <View style={[StyleSheet.absoluteFill, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    );
  }

  return (
    <PersonalStepShell
      title="Confirm your email"
      subtitle="We’ve sent a link to your inbox. When you’re ready, tap the button below and we’ll take you to the app tour."
      onBack={() => router.replace(onboardingHref("/onboarding"))}
      onNext={onRefresh}
      nextLabel="I’ve confirmed — continue"
      backLabel="Back"
      showBack
      nextLoading={loading}
      headerRight={
        <Pressable onPress={onSkip} hitSlop={8} accessibilityRole="button" accessibilityLabel="Skip tutorial">
          <Text style={{ color: colors.textSecondary, fontFamily: "Poppins-Medium" }}>Skip tutorial</Text>
        </Pressable>
      }
    >
      {user.email ? (
        <Text
          style={{ color: colors.textPrimary, fontFamily: "Poppins-SemiBold", fontSize: 16, marginBottom: 12 }}
          selectable
        >
          {user.email}
        </Text>
      ) : null}
      <Text
        style={{ color: colors.textSecondary, fontFamily: "Poppins-Regular", lineHeight: 22, marginBottom: 20 }}
        selectable
      >
        You can also sign in below if you use a password, then we’ll keep going.
      </Text>

      <Text style={{ fontFamily: "Poppins-Medium", color: colors.textSecondary, marginBottom: 8 }} selectable>
        Light sign-in (optional)
      </Text>
      <View
        style={{
          borderWidth: 1.5,
          borderColor: colors.border,
          borderRadius: radius.lg,
          paddingHorizontal: 16,
          minHeight: 52,
          marginBottom: 10,
          justifyContent: "center",
          flexDirection: "row",
          alignItems: "center",
          gap: 8,
        }}
      >
        <Lock size={18} color={colors.textTertiary} />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password (if you use one)"
          placeholderTextColor={colors.textTertiary}
          style={{ flex: 1, color: colors.textPrimary, fontFamily: "Poppins-Regular" }}
          secureTextEntry
        />
      </View>
      <Button
        onPress={onSignInCheck}
        variant="secondary"
        size="md"
        disabled={loading || !password}
        fullWidth
      >
        Check with password
      </Button>
      {resendMsg ? (
        <Text
          style={{ marginTop: 12, color: colors.textSecondary, fontSize: 13, fontFamily: "Poppins-Regular" }}
          selectable
        >
          {resendMsg}
        </Text>
      ) : null}
      <Pressable onPress={onResend} disabled={loading} style={{ marginTop: 16, flexDirection: "row", alignItems: "center", gap: 8 }} accessibilityRole="button" accessibilityLabel="Resend email">
        <Mail size={16} color={colors.accent} />
        <Text style={{ color: colors.accent, fontFamily: "Poppins-SemiBold" }}>Resend email</Text>
      </Pressable>
    </PersonalStepShell>
  );
}
