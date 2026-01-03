import ThemedBackground from "@/components/ThemedBackground";
import { useTheme } from "@/theme";
import { supabase } from "@/utils/supabase";
import type { Session } from "@supabase/supabase-js";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

/**
 * Root index screen component that handles initial authentication routing.
 * Checks if user is authenticated and redirects to home or login accordingly.
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
      router.replace("/home");
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
