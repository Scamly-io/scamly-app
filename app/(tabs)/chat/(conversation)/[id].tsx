import ThemedBackground from "@/components/ThemedBackground";
import type { Message as StoreMessage } from "@/store/chatStore";
import { useChatStore } from "@/store/chatStore";
import { useTheme } from "@/theme";
import { trackFeatureOpened, trackUserVisibleError } from "@/utils/analytics";
import { presentScamlyPaywallIfNeeded, trackRevenueCatError } from "@/utils/revenuecat";
import { captureDataFetchError } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Alert, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ChatInterface from "../_components/chat-interface";

export default function ChatDetail() {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { id: chatRowId } = useLocalSearchParams<{ id: string }>();

  const [planLoading, setPlanLoading] = useState(true);
  const [isFreePlan, setIsFreePlan] = useState(false);
  const [userId, setUserId] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [hydrateLoading, setHydrateLoading] = useState(true);
  const [openingPaywall, setOpeningPaywall] = useState(false);

  useFocusEffect(
    useCallback(() => {
      trackFeatureOpened("chat");
    }, [])
  );

  useEffect(() => {
    const fetchSubscriptionPlan = async () => {
      setPlanLoading(true);
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        captureDataFetchError(userError || new Error("No user found"), "chat", "get_user", "critical");
        trackUserVisibleError("chat", "session_invalid", false);
        setPlanLoading(false);
        router.replace("/chat");
        return;
      }

      setUserId(user.id);

      const { data: profile, error: profileError } = await supabase
        .from("profiles")
        .select("subscription_plan")
        .eq("id", user.id)
        .single();

      if (profileError) {
        captureDataFetchError(profileError, "chat", "fetch_profile", "critical");
        trackUserVisibleError("chat", "profile_fetch_failed", false);
        setPlanLoading(false);
        return;
      }

      setIsFreePlan(profile.subscription_plan === "free");
      setPlanLoading(false);
    };

    void fetchSubscriptionPlan();
  }, []);

  useEffect(() => {
    if (!planLoading && isFreePlan) {
      useChatStore.getState().resetSession();
    }
  }, [planLoading, isFreePlan]);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      if (!chatRowId || planLoading) return;

      if (isFreePlan) {
        setHydrateLoading(false);
        return;
      }

      setHydrateLoading(true);

      const { data: chatRow, error: chatErr } = await supabase
        .from("chats")
        .select("created_at")
        .eq("id", chatRowId)
        .maybeSingle();

      if (cancelled) return;

      if (chatErr) {
        captureDataFetchError(chatErr, "chat", "fetch_chat_meta", "critical");
        setHydrateLoading(false);
        return;
      }

      if (!chatRow) {
        useChatStore.getState().setMessages([]);
        useChatStore.getState().setChatRowPersistedInDb(false);
        setCreatedAt("");
        setHydrateLoading(false);
        return;
      }

      const msgRes = await supabase
        .from("messages")
        .select("id, role, content")
        .eq("chat_id", chatRowId)
        .order("created_at", { ascending: true });

      if (cancelled) return;

      const rows = msgRes.data ?? [];
      const mapped: StoreMessage[] = rows
        .filter((r) => r.role === "user" || r.role === "assistant")
        .map((r) => ({
          id: r.id,
          role: r.role as "user" | "assistant",
          content: r.content,
        }));

      useChatStore.getState().setMessages(mapped);
      useChatStore.getState().setChatRowPersistedInDb(true);
      if (chatRow.created_at) setCreatedAt(chatRow.created_at);
      setHydrateLoading(false);
    }

    void hydrate();

    return () => {
      cancelled = true;
    };
  }, [chatRowId, planLoading, isFreePlan]);

  const handleOpenPaywall = useCallback(async () => {
    if (openingPaywall) return;
    setOpeningPaywall(true);
    try {
      const { didUnlockEntitlement } = await presentScamlyPaywallIfNeeded(undefined, {
        trigger: "chat_locked",
      });
      if (didUnlockEntitlement) {
        setIsFreePlan(false);
      }
    } catch (error) {
      const message = trackRevenueCatError("present_paywall_chat", error);
      Alert.alert("Subscription unavailable", message);
    } finally {
      setOpeningPaywall(false);
    }
  }, [openingPaywall]);

  const headerDateLabel = createdAt ? new Date(createdAt).toLocaleDateString() : "";

  if (planLoading || hydrateLoading) {
    return (
      <ThemedBackground>
        <View style={[styles.loadingContainer, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={colors.accent} />
        </View>
      </ThemedBackground>
    );
  }

  return (
    <ChatInterface
      routeChatSegment={chatRowId ?? ""}
      headerDateLabel={headerDateLabel}
      userId={userId}
      isFreePlan={isFreePlan}
      planLoading={planLoading}
      onOpenPaywall={handleOpenPaywall}
      paywallLoading={openingPaywall}
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
