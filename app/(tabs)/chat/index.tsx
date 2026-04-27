import Button from "@/components/Button";
import Card from "@/components/Card";
import ThemedBackground from "@/components/ThemedBackground";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/theme";
import { clearChatHistoryCache } from "@/utils/chat-history-cache";
import { trackFeatureOpened, trackUserVisibleError } from "@/utils/analytics";
import { presentScamlyPaywallIfNeeded, trackRevenueCatError } from "@/utils/revenuecat";
import { captureDataFetchError } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { router } from "expo-router";
import { MessageCircle, Sparkles } from "lucide-react-native";
import React, { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, ScrollView, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ChatIndex() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [planLoading, setPlanLoading] = useState(true);
  const [isFreePlan, setIsFreePlan] = useState(false);
  const [openingPaywall, setOpeningPaywall] = useState(false);

  const fetchSubscriptionPlan = useCallback(async () => {
    setPlanLoading(true);
    if (!user) {
      trackUserVisibleError("chat", "session_invalid", false);
      setPlanLoading(false);
      return null;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("subscription_plan")
      .eq("id", user.id)
      .single();

    if (profileError) {
      trackUserVisibleError("chat", "profile_fetch_failed", false);
      captureDataFetchError(profileError, "chat", "fetch_profile", "critical");
      Alert.alert("Error", "There is an issue with your account. Please log out and try again.");
      setPlanLoading(false);
      return null;
    }

    setIsFreePlan(profile.subscription_plan === "free");
    setPlanLoading(false);
    return profile.subscription_plan;
  }, [user]);

  const refreshAccess = useCallback(async () => {
    await fetchSubscriptionPlan();
    setLoading(false);
  }, [fetchSubscriptionPlan]);

  useEffect(() => {
    if (!user) return;
    void refreshAccess();
  }, [user, refreshAccess]);

  useFocusEffect(
    useCallback(() => {
      trackFeatureOpened("chat");
      if (user) {
        void refreshAccess();
      }
    }, [user, refreshAccess])
  );

  const handleOpenPaywall = async () => {
    if (openingPaywall) return;
    setOpeningPaywall(true);
    try {
      const { didUnlockEntitlement } = await presentScamlyPaywallIfNeeded(undefined, {
        trigger: "chat_locked",
      });
      if (didUnlockEntitlement) {
        setIsFreePlan(false);
        setPlanLoading(false);
        router.push("/subscription-success");
      }
    } catch (error) {
      const message = trackRevenueCatError("present_paywall_chat", error);
      Alert.alert("Subscription unavailable", message);
    } finally {
      setOpeningPaywall(false);
    }
  };

  function openAiChat() {
    if (isFreePlan) {
      Alert.alert("Feature Locked", "This feature is not available on free accounts.");
      return;
    }
    if (!user) {
      trackUserVisibleError("chat", "session_invalid", false);
      Alert.alert("Error", "No user found");
      return;
    }
    clearChatHistoryCache();
    router.push("/chat/new");
  }

  return (
    <ThemedBackground>
      <SafeAreaView edges={["top"]} style={styles.safeArea}>
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
            <View>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]}>AI Chat</Text>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                Guidance built for scam and fraud situations
              </Text>
            </View>
          </Animated.View>

          <View style={styles.content}>
            {loading || planLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.accent} />
              </View>
            ) : isFreePlan ? (
              <Animated.View entering={FadeIn.duration(350)}>
                <Card style={styles.lockedCard} pressable={false}>
                  <Text style={[styles.lockedTitle, { color: colors.textPrimary }]}>
                    The AI Chat tool cannot be accessed on free accounts.
                  </Text>
                  <Text style={[styles.lockedSubtitle, { color: colors.textSecondary }]}>
                    Upgrade to Scamly Premium for conversational help when you need it most:
                  </Text>
                  <View style={styles.benefitsList}>
                    <View style={styles.benefitItem}>
                      <View style={[styles.benefitDot, { backgroundColor: colors.accent }]} />
                      <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                        Ask follow-up questions about suspicious messages and calls.
                      </Text>
                    </View>
                    <View style={styles.benefitItem}>
                      <View style={[styles.benefitDot, { backgroundColor: colors.accent }]} />
                      <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                        Get personalised next steps based on your scenario.
                      </Text>
                    </View>
                    <View style={styles.benefitItem}>
                      <View style={[styles.benefitDot, { backgroundColor: colors.accent }]} />
                      <Text style={[styles.benefitText, { color: colors.textSecondary }]}>
                        Keep a private history of conversations you can revisit.
                      </Text>
                    </View>
                  </View>
                  <Button onPress={handleOpenPaywall} loading={openingPaywall} fullWidth>
                    Upgrade to Premium
                  </Button>
                </Card>
              </Animated.View>
            ) : (
              <Animated.View entering={FadeIn.duration(400)}>
                <Card style={styles.heroCard} pressable={false}>
                  <View style={[styles.heroIconWrap, { backgroundColor: colors.accentMuted }]}>
                    <MessageCircle size={36} color={colors.accent} strokeWidth={2} />
                  </View>
                  <Text style={[styles.heroTitle, { color: colors.textPrimary }]}>
                    Talk through what happened—step by step
                  </Text>
                  <Text style={[styles.heroBody, { color: colors.textSecondary }]}>
                    Use AI Chat when you want to explore a suspicious message, understand a possible scam,
                    or decide what to do next. Your conversations stay in one place so you can pick them up
                    anytime from the chat menu while you are in a session.
                  </Text>
                  <View style={styles.points}>
                    <View style={styles.pointRow}>
                      <Sparkles size={18} color={colors.accent} />
                      <Text style={[styles.pointText, { color: colors.textSecondary }]}>
                        Natural back-and-forth: clarify details without starting over.
                      </Text>
                    </View>
                    <View style={styles.pointRow}>
                      <Sparkles size={18} color={colors.accent} />
                      <Text style={[styles.pointText, { color: colors.textSecondary }]}>
                        Scam-aware guidance—not generic web search answers.
                      </Text>
                    </View>
                    <View style={styles.pointRow}>
                      <Sparkles size={18} color={colors.accent} />
                      <Text style={[styles.pointText, { color: colors.textSecondary }]}>
                        History by date in the side menu when you need an older chat.
                      </Text>
                    </View>
                  </View>
                  <Button onPress={openAiChat} fullWidth icon={<MessageCircle size={18} color={colors.textInverse} />}>
                    Open AI Chat
                  </Button>
                </Card>
              </Animated.View>
            )}
          </View>
        </ScrollView>
      </SafeAreaView>
    </ThemedBackground>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 28,
  },
  headerSubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    marginTop: 4,
    lineHeight: 20,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loadingContainer: {
    minHeight: 200,
    alignItems: "center",
    justifyContent: "center",
  },
  lockedCard: {
    marginTop: 12,
    padding: 24,
    gap: 14,
  },
  lockedTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 22,
    lineHeight: 30,
  },
  lockedSubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 21,
  },
  benefitsList: {
    gap: 10,
    marginBottom: 4,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  benefitDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    marginTop: 7,
  },
  benefitText: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 21,
  },
  heroCard: {
    marginTop: 8,
    padding: 28,
    gap: 14,
    alignItems: "stretch",
  },
  heroIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    marginBottom: 4,
  },
  heroTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 22,
    lineHeight: 30,
    textAlign: "center",
  },
  heroBody: {
    fontFamily: "Poppins-Regular",
    fontSize: 15,
    lineHeight: 23,
    textAlign: "center",
  },
  points: {
    gap: 12,
    marginVertical: 4,
  },
  pointRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  pointText: {
    flex: 1,
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    lineHeight: 21,
  },
});
