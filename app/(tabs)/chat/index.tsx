import GradientBackgound from "@/components/GradientBackground";
import Header from "@/components/Header";
import { supabase } from "@/utils/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { Link, router } from "expo-router";
import { Clock3, Lock, Plus, Trash2 } from "lucide-react-native";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type Chat = {
    id: string;
    created_at: string; // Timestamp when the chat was created
    last_message: string | null; // Most recent message in the chat
}

/**
 * Chat index screen component displaying a list of all user's chat conversations.
 * Allows users to create new chats, view existing chats, and delete chats.
 */
export default function ChatIndex() {
    // List of all user's chat conversations
    const [chats, setChats] = useState<Chat[]>([]);
    // Loading state while fetching chats
    const [loading, setLoading] = useState(true);
    // Subscription plan state
    const [planLoading, setPlanLoading] = useState(true);
    const [isFreePlan, setIsFreePlan] = useState(false);

    const formatDate = (iso?: string) => {
        if (!iso) return "";
        const date = new Date(iso);
        return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }

    const formatTime = (iso?: string) => {
        if (!iso) return "";
        const date = new Date(iso);
        return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }

    const fetchSubscriptionPlan = async () => {
        setPlanLoading(true);
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error("No user:", userError);
            Alert.alert("Error", "No user found");
            setPlanLoading(false);
            return null;
        }

        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("subscription_plan")
            .eq("id", user.id)
            .single();

        if (profileError) {
            console.error("Error fetching user profile:", profileError);
            Alert.alert("Error", "There is an issue with your account. Please log out and try again.");
            setPlanLoading(false);
            return null;
        }

        setIsFreePlan(profile.subscription_plan === "free");
        setPlanLoading(false);
        return profile.subscription_plan;
    }

    // Fetches all chat conversations for the current user
    const fetchChats = async () => {
        setLoading(true);
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error("No user:", userError);
            Alert.alert("Error", "No user found");
            setLoading(false);
            return;
        }

        const { data, error } = await supabase
            .from("chats")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
        
        if (error) {
            console.error("Error fetching chats:", error);
        } else {
            setChats(data || []);
        }

        setLoading(false);
    }

    // Fetch chats on mount and subscribe to real-time updates
    useEffect(() => {
        fetchSubscriptionPlan().then(() => fetchChats());

        // Subscribe to real-time updates for chat changes
        const channel = supabase
            .channel("chats-changes")
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "chats" },
                (payload) => {
                    setChats((prev) =>
                        prev.map((chat) =>
                            chat.id === payload.new.id ? { ...chat, ...payload.new } : chat
                        )
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Refetch chats when screen comes into focus
    useFocusEffect(
        React.useCallback(() => {
            fetchSubscriptionPlan().then(() => fetchChats());
        }, [])
    );

    const sortedChats = useMemo(() => {
        return [...chats].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [chats]);

    // Creates a new chat conversation and navigates to it
    async function createNewChat() {
        if (isFreePlan) {
            Alert.alert("Upgrade required", "AI Chat is available on paid plans.");
            return;
        }
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error("No user:", userError);
            Alert.alert("Error", "No user found");
            return;
        }
        
        const { data, error } = await supabase
            .from("chats")
            .insert([{ user_id: user.id }])
            .select()
            .single();

        if (error) {
            console.error("Error creating chat:", error);
            Alert.alert("Error", "Could not create new chat");
            return null;
        }

        setChats([...chats, data]);
        router.push(`/chat/${data.id}`);

        // Create OpenAI conversation ID for the new chat (non-blocking)
        try {
            fetch("https://27ui2kcryi.execute-api.ap-southeast-2.amazonaws.com/dev/create-cid", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ chatId: data.id })
            });
        } catch (error) {
            console.error("Error creating conversation ID:", error);
            Alert.alert("Error", "There was an error creating your new chat. Please exit and try again.");
        }
    }

    // Deletes a chat conversation after user confirmation
    async function deleteChat(chatId: string) {
        if (isFreePlan) {
            Alert.alert("Upgrade required", "AI Chat is available on paid plans.");
            return;
        }
        Alert.alert("Delete Chat", "Are you sure you want to delete this chat? This action cannot be undone.",
            [
                {
                    text: "Cancel",
                    style: "cancel"
                },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));

                            const res = await fetch("https://27ui2kcryi.execute-api.ap-southeast-2.amazonaws.com/dev/delete-cid", {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ chatId: chatId })
                            })

                            const { error: delChatError } = await supabase
                                .from("chats")
                                .delete()
                                .eq("id", chatId)

                            // BROKEN LOGIC - needs fixing
                            if (delChatError) {
                                console.error("Error deleting chat:", delChatError);
                                return;
                            }
                            if (!res.ok) {
                                console.error("Error deleting conversation ID:", res.statusText);
                                return;
                            }

                        } catch (error) {
                            console.error("Uncaught chat:", error);
                            Alert.alert("Error", "Could not delete chat");
                        }
                    }
                }
            ]
        );
    }

    return (
        <GradientBackgound>
            <Header 
                title="AI Chat" 
                imageUrl={require("@/assets/images/page-images/chat.png")} 
                subtitle="Discuss scams, fraud, and cyber crime." 
            />
            <SafeAreaView edges={[ "left", "right", "bottom" ]} style={styles.container}>
                <View style={styles.content}>
                    <View style={styles.titleContainer}>
                        <View>
                            <Text style={styles.title}>Your conversations</Text>
                            <Text style={styles.subtitle}>Pick up where you left off or start fresh.</Text>
                        </View>
                        <TouchableOpacity
                            onPress={createNewChat}
                            style={[styles.createChatButton, isFreePlan ? { opacity: 0.5 } : null]}
                            disabled={isFreePlan}
                        >
                            <Plus size={18} color="white" />
                            <Text style={styles.createChatButtonText}>New chat</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.separator} />

                    { loading || planLoading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#5426F8" />
                        </View>
                    ) : sortedChats.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyBadge}>
                                <Clock3 size={16} color="#2563EB" />
                                <Text style={styles.emptyBadgeText}>No conversations yet</Text>
                            </View>
                            <Text style={styles.emptyTitle}>Start a new discussion</Text>
                            <Text style={styles.emptyCopy}>Ask Scamly about scams, fraud, or cyber crime to get tailored guidance.</Text>
                            <TouchableOpacity
                                onPress={createNewChat}
                                style={[styles.createChatButtonLarge, isFreePlan ? { opacity: 0.5 } : null]}
                                disabled={isFreePlan}
                            >
                                <Plus size={18} color="white" />
                                <Text style={styles.createChatButtonText}>Start chatting</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <FlatList
                            data={sortedChats}
                            keyExtractor={(item) => item.id}
                            style={styles.flatList}
                            contentContainerStyle={styles.flatListContent}
                            ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
                            renderItem={({ item }) => (
                                <View style={styles.card}>
                                    {isFreePlan ? (
                                        <Pressable style={styles.cardBody} disabled>
                                            <View style={styles.cardHeader}>
                                                <Text style={styles.chatDate}>{formatDate(item.created_at)}</Text>
                                                <View style={styles.pill}>
                                                    <Text style={styles.pillText}>Saved</Text>
                                                </View>
                                            </View>
                                            <Text style={styles.chatMessage} numberOfLines={2}>
                                                {item.last_message || "No messages yet"}
                                            </Text>
                                            <View style={styles.cardFooter}>
                                                <View style={styles.timestampRow}>
                                                    <Clock3 size={14} color="#6B7280" />
                                                    <Text style={styles.chatTime}>{formatTime(item.created_at)}</Text>
                                                </View>
                                            </View>
                                        </Pressable>
                                    ) : (
                                        <Link href={`/chat/${item.id}`} asChild>
                                            <Pressable style={styles.cardBody}>
                                                <View style={styles.cardHeader}>
                                                    <Text style={styles.chatDate}>{formatDate(item.created_at)}</Text>
                                                    <View style={styles.pill}>
                                                        <Text style={styles.pillText}>Saved</Text>
                                                    </View>
                                                </View>
                                                <Text style={styles.chatMessage} numberOfLines={2}>
                                                    {item.last_message || "No messages yet"}
                                                </Text>
                                                <View style={styles.cardFooter}>
                                                    <View style={styles.timestampRow}>
                                                        <Clock3 size={14} color="#6B7280" />
                                                        <Text style={styles.chatTime}>{formatTime(item.created_at)}</Text>
                                                    </View>
                                                </View>
                                            </Pressable>
                                        </Link>
                                    )}
                                    <TouchableOpacity
                                        onPress={() => deleteChat(item.id)}
                                        style={[styles.deleteButton, isFreePlan ? { opacity: 0.5 } : null]}
                                        disabled={isFreePlan}
                                    >
                                        <Trash2 size={18} color="white" />
                                    </TouchableOpacity>
                                </View>
                            )}
                        />
                    )}
                    {isFreePlan && !planLoading && (
                        <View style={styles.lockOverlay}>
                            <Lock size={40} color="white" />
                            <Text style={styles.lockOverlayTitle}>The AI Chat feature is for paid plans only.</Text>
                            <Text style={styles.lockOverlayText}>Upgrade to utilise Scamly's advanced AI model designed specifically for discussing scams and fraud.</Text>
                        </View>
                    )}
                    
                </View>
            </SafeAreaView>
        </GradientBackgound>
    )
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",
    },
    container: {
        flex: 1,
        padding: 16,
    },
    content: {
        flex: 1,
        padding: 16,
        backgroundColor: "rgba(255,255,255,0.85)",
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.1,
        shadowRadius: 20,
        elevation: 8,
    },
    titleContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        marginBottom: 12,
    },
    title: {
        fontSize: 22,
        fontFamily: "Poppins-Bold",
        color: "#0F172A",
    },
    subtitle: {
        fontSize: 14,
        fontFamily: "Poppins-Regular",
        color: "#475569",
        marginTop: 4,
    },
    createChatButton: {
        backgroundColor: "#2563EB",
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    createChatButtonLarge: {
        backgroundColor: "#2563EB",
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        marginTop: 12,
    },
    createChatButtonText: {
        color: "white",
        fontFamily: "Poppins-Bold",
    },
    separator: {
        height: 1,
        backgroundColor: "rgba(15, 23, 42, 0.08)",
        marginBottom: 16,
    },
    flatList: {
        flex: 1,
    },
    flatListContent: {
        paddingBottom: 8,
    },
    card: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
        borderWidth: 1,
        borderColor: "rgba(15, 23, 42, 0.06)",
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    cardBody: {
        flex: 1,
        gap: 8,
    },
    cardHeader: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    cardFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    chatDate: {
        fontSize: 14,
        fontFamily: "Poppins-SemiBold",
        color: "#0F172A",
    },
    chatTime: {
        fontSize: 13,
        fontFamily: "Poppins-Regular",
        color: "#6B7280",
        marginLeft: 6,
    },
    chatMessage: {
        color: "#1F2937",
        fontFamily: "Poppins-Regular",
        fontSize: 15,
        lineHeight: 22,
    },
    timestampRow: {
        flexDirection: "row",
        alignItems: "center",
    },
    pill: {
        backgroundColor: "rgba(37, 99, 235, 0.1)",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    pillText: {
        color: "#1D4ED8",
        fontFamily: "Poppins-SemiBold",
        fontSize: 12,
    },
    deleteButton: {
        padding: 10,
        backgroundColor: "#EF4444",
        borderRadius: 12,
    },
    lockOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: "rgba(0,0,0,0.6)",
        borderRadius: 20,
        alignItems: "center",
        justifyContent: "center",
        gap: 12,
        paddingHorizontal: 24,
    },
    lockOverlayTitle: {
        color: "white",
        fontFamily: "Poppins-Bold",
        fontSize: 18,
        textAlign: "center",
    },
    lockOverlayText: {
        color: "white",
        fontFamily: "Poppins-Regular",
        fontSize: 14,
        textAlign: "center",
    },
    emptyState: {
        backgroundColor: "white",
        borderRadius: 16,
        padding: 20,
        alignItems: "flex-start",
        gap: 10,
        borderWidth: 1,
        borderColor: "rgba(37, 99, 235, 0.12)",
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    emptyBadge: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(37, 99, 235, 0.08)",
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 999,
    },
    emptyBadgeText: {
        color: "#1D4ED8",
        fontFamily: "Poppins-SemiBold",
        fontSize: 12,
    },
    emptyTitle: {
        fontSize: 18,
        fontFamily: "Poppins-Bold",
        color: "#0F172A",
    },
    emptyCopy: {
        fontSize: 14,
        fontFamily: "Poppins-Regular",
        color: "#475569",
        lineHeight: 20,
    },
})