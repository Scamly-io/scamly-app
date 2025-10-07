import { supabase } from "@/utils/supabase";
import { useFonts } from "expo-font";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import uuid from "react-native-uuid";

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

    const { id: chatId } = useLocalSearchParams<{ id: string }>();
    const [messages, setMessages] = useState<Message[]>([]);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState("");
    const [conversationId, setConversationId] = useState("");

    useEffect(() => {
        const fetchMessages = async () => {
            if (!chatId) return;
            
            setLoading(true);

            const [fetchCid, fetchMessages] = await Promise.all([
                supabase.from("chats").select("openai_conversation_id").eq("id", chatId).single(),
                supabase.from("messages").select("id, role, content, created_at").eq("chat_id", chatId).order("created_at", { ascending: true }),
            ])

            if (fetchCid.error) {
                console.error("Error fetching conversation ID:", fetchCid.error);
            } else {
                setConversationId(fetchCid.data.openai_conversation_id);
            }
                
            if (fetchMessages.error) {
                console.error("Error fetching messages:", fetchMessages.error);
            } else {
                setMessages(fetchMessages.data || []);
            }
            setLoading(false);
        }

        fetchMessages();
    }, [chatId]);

    //This looks weird but it just requires the current typing message to be replaced with the error message
    function displayErrorMessage(typingMessage: Message) {
        setMessages((prev) => {
            return prev.map(msg => 
                msg.id === typingMessage.id 
                    ? { ...msg, content: "Sorry, I encountered an error. Please try again later." }
                    : msg
            );
        });
    }

    async function processMessage () {
        const content = input;

        const userMessage = {
            id: uuid.v4().toString(),
            role: "user",
            content,
            created_at: new Date().toISOString()
        }

        const typingMessage = {
            id: uuid.v4().toString(),
            role: "assistant",
            content: "Typing...",
            created_at: new Date().toISOString()
        }

        setMessages((prev) => [...prev, userMessage, typingMessage]);
        setInput("");

        try {
            const res = await fetch(`https://27ui2kcryi.execute-api.ap-southeast-2.amazonaws.com/dev/get-ai-response`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content, chatId, conversationId })
            });

            if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
                displayErrorMessage(typingMessage); 
            }

            const data = await res.json();
            
            //Replace the "typing" message with the actual response
            setMessages((prev) => {
                return prev.map(msg => 
                    msg.id === typingMessage.id 
                        ? { ...msg, content: data.fullText }
                        : msg
                );
            });
        } catch (error) {
            console.error("Error getting response from lambda: ", error);
            displayErrorMessage(typingMessage);
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
                                <Text style={{ fontFamily: "Poppins-Regular" }}>{item.content}</Text>
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
                    <TouchableOpacity style={styles.sendButton} onPress={processMessage}>
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