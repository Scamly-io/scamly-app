import GradientBackground from "@/components/GradientBackground";
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
    const router = useRouter();
    // Current user session (undefined = checking, null = not authenticated, Session = authenticated)
    const [session, setSession] = useState<Session | null | undefined>(undefined);

    // Check authentication status and subscribe to auth state changes
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

    // Redirect based on authentication status
    useEffect(() => {
        if (session === undefined) return; // Still checking authentication
        if (session) {
            router.replace("/home"); // User is authenticated, go to home
        } else {
            router.replace("/login"); // User is not authenticated, go to login
        }
    }, [session, router]);

    return (
        <GradientBackground>
            <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                <ActivityIndicator size="large" color="#2b7fff" />
            </View>
        </GradientBackground>
    )
}