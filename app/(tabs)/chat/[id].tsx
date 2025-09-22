import { supabase } from "@/utils/supabase";
import { useFonts } from "expo-font";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";

type Message = {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    created_at: string;
};


export default function ChatDetail() {

    const [fontsLoaded] = useFonts({
        "Poppins-Regular": require("@/assets/fonts/Poppins-Regular.ttf"),
        "Poppins-Bold": require("@/assets/fonts/Poppins-Bold.ttf"),
    });

    const { id } = useLocalSearchParams<{ id: string }>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState("");

    useEffect(() => {
        const fetchMessages = async () => {
            if (!id) return;
            
            setLoading(true);

            const { data, error } = await supabase
                .from("messages")
                .select("id, role, content, created_at")
                .eq("chat_id", id)
                .order("created_at", { ascending: true });
                
            if (error) {
                console.error("Error fetching messages:", error);
            } else {
                setMessages(data || []);
            }
            setLoading(false);
        }

        fetchMessages();
    }, [id]);

    const sendMessage = async () => {
        if (!input.trim() || !id) return;

        const userMessage = {
            chat_id: id,
            role: "user" as const,
            content: input.trim(),
        }

        const { data: insertedMessage, error } = await supabase
            .from("messages")
            .insert([userMessage])
            .select()
            .single();

        if (error) {
            console.error("Error sending message: ", error);
            return;
        }

        await supabase.from("chats").update({ last_message: userMessage.content }).eq("id", id);

        setMessages((prev) => [...prev, insertedMessage]);
        setInput("");

        const typingBubble = {
            id: "typing",
            chat_id: id,
            role: "assistant" as const,
            content: "...",
            created_at: new Date().toISOString(),
        }

        setMessages((prev) => [...prev, typingBubble]);

        try {
            // Check if the environment variable is configured
            if (!process.env.EXPO_PUBLIC_AI_CHAT_LAMBDA_URL) {
                console.error("AI_CHAT_LAMBDA_URL environment variable is not configured");
                setMessages((prev) => prev.filter(msg => msg.id !== "typing"));
                return;
            }

            const lambdaResponse = await fetch(process.env.EXPO_PUBLIC_AI_CHAT_LAMBDA_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: [...messages, insertedMessage].map((m) => ({
                        role: m.role,
                        content: m.content
                    })),
                }),
            });

            const result = await lambdaResponse.json();

            if (!lambdaResponse.ok) {
                throw new Error(`HTTP error! status: ${result}`);
            }

            if (!result.reply) {
                console.error("Lambda did not return a reply: ", result);
                setMessages((prev) => prev.filter(msg => msg.id !== "typing"));
                return;
            }
            
            const assistantMessage = {
                chat_id: id,
                role: "assistant" as const,
                content: result.reply,
            }

            const { data: insertedAssistantMessage, error: assistantError } = await supabase
                .from("messages")
                .insert([assistantMessage])
                .select()
                .single();
                

            if (assistantError) {
                console.error("Error saving assistant message: ", assistantError);
                setMessages((prev) => prev.filter(msg => msg.id !== "typing"));
                return;
            }

            await supabase.from("chats").update({ last_message: assistantMessage.content }).eq("id", id);

            // Remove typing bubble and add the actual response
            setMessages((prev) => [...prev.filter(msg => msg.id !== "typing"), insertedAssistantMessage]);
        } catch (error) {
            console.error("Error calling lambda for AI chat: ", error);
            // Remove typing bubble on error
            setMessages((prev) => prev.filter(msg => msg.id !== "typing"));
        }
    }

    if (loading) {
        return (
            <SafeAreaProvider>
                <SafeAreaView style={styles.mainContainer}>
                    <View style={styles.mainContainer}>
                        <ActivityIndicator size="large" />
                    </View>
                </SafeAreaView>
            </SafeAreaProvider>
        )
    }

    return (
        <SafeAreaProvider>
            <SafeAreaView style={styles.mainContainer}>
                <View style={styles.mainContainer}>
                    <FlatList
                        data={messages}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={({ item }) => (
                            <View style={item.role === "user" ? styles.messageContainerUser : styles.messageContainerAssistant}>
                                <Text style={{ fontFamily: "Poppins-Regular" }}>{item.id === "typing" ? "Typing..." : item.content}</Text>
                            </View>
                        )}
                    />
                </View>

                <View style={styles.inputContainer}>
                    <TextInput
                        style={styles.input}
                        value={input}
                        onChangeText={setInput}
                    />
                    <TouchableOpacity style={styles.sendButton} onPress={sendMessage}>
                        <Text style={styles.sendButtonText}>Send</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        </SafeAreaProvider>
    )
}

const styles = StyleSheet.create({
    background: {
        flex: 1
    },
    mainContainer: {
        flex: 1,
        padding: 16
    },
    messageContainerUser: {
        alignSelf: "flex-end",
        backgroundColor: "#DCF8C6",
        borderRadius: 12,
        padding: 10,
        marginVertical: 4,
        maxWidth: "80%"
    },
    messageContainerAssistant: {
        alignSelf: "flex-start",
        backgroundColor: "#EEE",
        borderRadius: 12,
        padding: 10,
        marginVertical: 4,
        maxWidth: "80%"
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderTopWidth: 1,
        borderColor: "#ddd",
        paddingVertical: 8,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        fontFamily: "Poppins-Regular",
    },
    sendButton: {
        backgroundColor: "#007AFF",
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
    },
    sendButtonText: {
        color: "white",
        fontSize: 16,
        fontFamily: "Poppins-Bold",
    }
})