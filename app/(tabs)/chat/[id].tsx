import ThemedBackground from "@/components/ThemedBackground";
import type { Message as StoreMessage } from "@/store/chatStore";
import { useChatStore } from "@/store/chatStore";
import { useTheme } from "@/theme";
import { trackUserVisibleError } from "@/utils/analytics";
import { captureDataFetchError } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ChatInterface from "./_components/chat-interface";

export default function ChatDetail() {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { id: chatRowId } = useLocalSearchParams<{ id: string }>();

  const [planLoading, setPlanLoading] = useState(true);
  const [isFreePlan, setIsFreePlan] = useState(false);
  const [userId, setUserId] = useState("");
  const [createdAt, setCreatedAt] = useState("");
  const [hydrateLoading, setHydrateLoading] = useState(true);

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

      // Client-generated id: no DB row yet — empty thread, insert `chats` on first send.
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

  if (isFreePlan) {
    return (
      <ThemedBackground>
        <View style={[styles.lockContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          <Text style={[styles.lockTitle, { color: colors.textPrimary }]}>AI Chat is for paid plans</Text>
          <Text style={[styles.lockSubtitle, { color: colors.textSecondary }]}>
            Upgrade to continue this conversation
          </Text>
          <Pressable
            style={[styles.lockBack, { backgroundColor: colors.accentMuted, borderRadius: radius.md }]}
            onPress={() => router.replace("/chat")}
          >
            <Text style={[styles.lockBackLabel, { color: colors.accent }]}>Back</Text>
          </Pressable>
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
    />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  lockContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingHorizontal: 32,
  },
  lockTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 20,
    textAlign: "center",
  },
  lockSubtitle: {
    fontFamily: "Poppins-Regular",
    fontSize: 15,
    textAlign: "center",
    marginBottom: 16,
  },
  lockBack: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  lockBackLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 15,
  },
});
