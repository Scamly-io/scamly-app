import GradientBackgound from "@/components/GradientBackground";
import Header from "@/components/Header";
import { supabase } from "@/utils/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { Link, router } from "expo-router";
import { Trash2 } from "lucide-react-native";
import React, { useEffect, useState } from "react";
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
        fetchChats();

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
            fetchChats();
        }, [])
    );

    // Creates a new chat conversation and navigates to it
    async function createNewChat() {
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
                        <Text style={styles.title}>Chats</Text>
                        <TouchableOpacity onPress={createNewChat} style={styles.createChatButton}>
                            <Text style={styles.createChatButtonText}>New</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.separator} />

                    { loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#5426F8" />
                        </View>
                    ) : (
                        <FlatList
                            data={chats}
                            keyExtractor={(item) => item.id}
                            style={styles.flatList}
                            contentContainerStyle={styles.flatListContent}
                            renderItem={({ item }) => (
                                <>
                                    <View style={styles.chatItem}>
                                        <Link href={`/chat/${item.id}`} asChild>
                                            <Pressable style={styles.chatPressable}>
                                                <Text style={styles.chatDate}>
                                                    {item.created_at.split("T")[0]}
                                                </Text>
                                                <Text style={styles.chatMessage} numberOfLines={1}>
                                                    {item.last_message || "No messages yet"}
                                                </Text>
                                            </Pressable>
                                        </Link>
                                        <TouchableOpacity
                                            onPress={() => deleteChat(item.id)}
                                            style={styles.deleteButton}
                                        >
                                            <Trash2 size={20} color="white" />
                                        </TouchableOpacity>
                                    </View>
                                    <View style={styles.separator} />
                                </>
                                
                            )}
                        />
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
        backgroundColor: "white",
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 20,
        elevation: 8,
    },
    titleContainer: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginVertical: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: "bold",
    },
    createChatButton: {
        backgroundColor: "#5DB6FF",
        borderRadius: 999,
        paddingHorizontal: 20,
        paddingVertical: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    createChatButtonText: {
        color: "white",
        fontFamily: "Poppins-Bold",
    },
    chatItem: {
        flexDirection: "row",
        alignItems: "center",
        gap: 20,
    },
    chatPressable: {
        flex: 1,
        gap: 8,
        paddingVertical: 16,
    },
    chatDate: {
        fontSize: 18,
        fontWeight: "bold",
    },
    chatMessage: {
        color: "#555",
    },
    deleteButton: {
        padding: 10,
        backgroundColor: "#ff6565",
        marginRight: 8,
        borderRadius: 999,
    },
    deleteButtonText: {
        color: "white",
        fontWeight: "bold",
    },
    separator: {
        height: 1,
        backgroundColor: "#b4b4b4",
        marginVertical: 8,
    },
    flatList: {
        flex: 1,
    },
    flatListContent: {
        flexGrow: 1,
    },

})