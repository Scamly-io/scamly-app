import { supabase } from "@/utils/supabase";
import { useFocusEffect } from "@react-navigation/native";
import { Link, router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Pressable, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

type Chat = {
    id: string;
    created_at: string;
    last_message: string | null;
}

export default function ChatIndex() {
    const [chats, setChats] = useState<Chat[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchChats = async () => {
        setLoading(true);
        
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error("No user:", userError);
            Alert.alert("Error", "No user found");
            setLoading(false);
            return;
        }

        console.log(user.id);

        const { data, error } = await supabase
            .from("chats")
            .select("*")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });
        
        if (error) {
            console.error("Error fetching chats:", error);
        } else {
            setChats(data || []);
            console.log("chats worked")
        }

        setLoading(false);
    }

    useEffect(() => {
        fetchChats();

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

    useFocusEffect(
        React.useCallback(() => {
            fetchChats();
        }, [])
    );

    async function createNewChat() {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError || !user) {
            console.error("No user:", userError);
            Alert.alert("Error", "No user found");
            return;
        }
        
        const { data, error } = await supabase
            .from("chats")
            .insert([
                {
                    user_id: user.id
                }
            ])
            .select()
            .single();

        if (error) {
            console.error("Error creating chat:", error);
            Alert.alert("Error", "Could not create new chat");
            return null;
        }

        setChats([...chats, data]);
        router.push(`/chat/${data.id}`);
    }

    async function deleteChat(chatId: string) {
        Alert.alert(
            "Delete Chat",
            "Are you sure you want to delete this chat? This action cannot be undone.",
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
                            const { error: chatError } = await supabase
                                .from("chats")
                                .delete()
                                .eq("id", chatId);

                            if (chatError) {
                                console.error("Error deleting chat:", chatError);
                                Alert.alert("Error", "Could not delete chat");
                                return;
                            }

                            // Update local state
                            setChats(prevChats => prevChats.filter(chat => chat.id !== chatId));
                            
                        } catch (error) {
                            console.error("Error deleting chat:", error);
                            Alert.alert("Error", "Could not delete chat");
                        }
                    }
                }
            ]
        );
    }


    

    if (loading) {
        return (
            <SafeAreaProvider>
                <SafeAreaView style={{ flex: 1 }}>
                    <View style={{ flex: 1, padding: 16 }}>
                        <ActivityIndicator size="large" />
                    </View>
                </SafeAreaView>
            </SafeAreaProvider>
        )
    }

    return (
        <SafeAreaProvider>
            <SafeAreaView style={{ flex: 1 }}>
                <View style={{ flex: 1, padding: 16 }}>
                    <FlatList
                        data={chats}
                        keyExtractor={(item) => item.id}
                        renderItem={({ item }) => (
                            <View style={{
                                flexDirection: "row",
                                alignItems: "center",
                                borderBottomWidth: 1,
                                borderColor: "#ddd",
                            }}>
                                <Link href={`/chat/${item.id}`} asChild>
                                    <Pressable
                                        style={{
                                            flex: 1,
                                            padding: 16,
                                        }}
                                    >
                                        <Text style={{ fontSize: 16, fontWeight: "bold" }}>
                                            Chat #{item.id.slice(0, 6)}
                                        </Text>
                                        <Text style={{ color: "#555" }} numberOfLines={1}>
                                            {item.last_message || "No messages yet"}
                                        </Text>
                                    </Pressable>
                                </Link>
                                <TouchableOpacity
                                    onPress={() => deleteChat(item.id)}
                                    style={{
                                        padding: 16,
                                        backgroundColor: "#ff4444",
                                        marginRight: 8,
                                        borderRadius: 4,
                                    }}
                                >
                                    <Text style={{ color: "white", fontWeight: "bold" }}>Delete</Text>
                                </TouchableOpacity>
                            </View>
                        )}
                    />
                    <TouchableOpacity onPress={createNewChat} style={{ marginTop: 20, backgroundColor: "coral", padding: 10, borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <Text>Create New Chat</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </SafeAreaProvider>
        
    )
}