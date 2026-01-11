import ThemedBackground from "@/components/ThemedBackground";
import { useTheme } from "@/theme";
import { identifyUser, type UserPlan } from "@/utils/analytics";
import { supabase } from "@/utils/supabase";
import type { Session } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

/**
 * Determine the user plan category from subscription_plan string.
 * Maps Supabase subscription_plan values to analytics plan types.
 */
function getPlanCategory(subscriptionPlan: string): UserPlan {
  if (subscriptionPlan === "free") return "free";
  if (subscriptionPlan.includes("trial")) return "trial";
  return "paid";
}

/**
 * Root index screen component that handles initial authentication routing.
 * Checks if user is authenticated and redirects to home or login accordingly.
 * Also handles user identification for analytics on existing sessions.
 */
export default function Index() {
  const { colors } = useTheme();
  const router = useRouter();
  const [session, setSession] = useState<Session | null | undefined>(undefined);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setSession(session ?? null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;
      setSession(newSession ?? null);
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (session === undefined) return;

    if (session) {
      // User has existing session - identify them for analytics before navigating
      const identifyAndNavigate = async () => {
        try {
          const { data: profile } = await supabase
            .from("profiles")
            .select("subscription_plan")
            .eq("id", session.user.id)
            .single();

          if (profile) {
            // Identify user with PostHog using Supabase user ID and plan
            identifyUser(session.user.id, getPlanCategory(profile.subscription_plan));
          }
        } catch (error) {
          // Continue navigation even if identification fails
          console.error("Error identifying user:", error);
        }
        router.replace("/home");
      };
      identifyAndNavigate();
    } else {
      router.replace("/login");
    }
  }, [session, router]);

  return (
    <ThemedBackground>
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.accent} />
      </View>
    </ThemedBackground>
  );
}
