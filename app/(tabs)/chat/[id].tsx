import ChatHeader from "@/components/ChatHeader";
import { supabase } from "@/utils/supabase";
import { useFonts } from "expo-font";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Keyboard, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
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
    const [createdAt, setCreatedAt] = useState("");
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState("");
    const [conversationId, setConversationId] = useState("");

    const flatListRef = useRef<FlatList>(null);
    const [keyboardHeight, setKeyboardHeight] = useState(0);

    useEffect(() => {
        const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
            setKeyboardHeight(e.endCoordinates.height);
            setTimeout(() => {
                flatListRef.current?.scrollToEnd({ animated: true });
            }, 100);
        })

        const hideSub = Keyboard.addListener("keyboardDidHide", () => {
            setKeyboardHeight(0);
        })

        return () => {
            showSub.remove();
            hideSub.remove();
        }
    }, []);

    useEffect(() => {
        const fetchMessages = async () => {
            if (!chatId) return;
            
            setLoading(true);

            const [fetchCid, fetchMessages, fetchDate] = await Promise.all([
                supabase.from("chats").select("openai_conversation_id").eq("id", chatId).single(),
                supabase.from("messages").select("id, role, content, created_at").eq("chat_id", chatId).order("created_at", { ascending: true }),
                supabase.from("chats").select("created_at").eq("id", chatId).single(),
            ])

            if (!fetchCid.error) setConversationId(fetchCid.data.openai_conversation_id);
            if (!fetchMessages.error) setMessages(fetchMessages.data || []);
            if (!fetchDate.error) setCreatedAt(fetchDate.data.created_at);

            setLoading(false);
        }

        fetchMessages();
    }, [chatId]);

    useEffect(() => {
        if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
        }
    }, [messages]);

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
                <ChatHeader date={createdAt} />
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
            <ChatHeader date={createdAt} />
            <KeyboardAvoidingView
                style={{ flex: 1 }}
                behavior={Platform.OS === "ios" ? "padding" : "height"}
            >
                <SafeAreaView edges={["bottom", "left", "right"]} style={styles.mainContainer}>
                    <View style={styles.mainContainer}>
                        <FlatList
                            ref={flatListRef}
                            data={messages}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={({ item }) => (
                                <View style={
                                    item.role === "user" 
                                        ? styles.messageContainerUser 
                                        : styles.messageContainerAssistant
                                    }
                                >
                                    <Text style={
                                        item.role === "user" 
                                            ? styles.messageContentUser 
                                            : styles.messageContentAssistant
                                        }
                                    >
                                        {item.content}
                                    </Text>
                                </View>
                            )}
                            inverted={false}
                            contentContainerStyle={{ paddingBottom: keyboardHeight }}
                            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                            onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message"
                            returnKeyType="send"
                            value={input}
                            onChangeText={setInput}
                            blurOnSubmit={false}
                            multiline={false}
                            onSubmitEditing={processMessage}
                        />
                    </View>
                </SafeAreaView>
            </KeyboardAvoidingView>
        </SafeAreaProvider>
    )
}


const styles = StyleSheet.create({
    background: {
        flex: 1
    },
    mainContainer: {
        flex: 1,
        paddingHorizontal: 16,
    },
    messageContainerUser: {
        alignSelf: "flex-end",
        backgroundColor: "#2074F3",
        borderRadius: 12,
        padding: 10,
        marginVertical: 8,
        maxWidth: "80%",
    },
    messageContainerAssistant: {
        alignSelf: "flex-start",
        backgroundColor: "#DBDBDB",
        borderRadius: 12,
        padding: 10,
        marginVertical: 8,
        maxWidth: "80%"
    },
    messageContentUser: {
        color: "white",
        fontFamily: "Poppins-Regular",
    },
    messageContentAssistant: {
        color: "#000",
        fontFamily: "Poppins-Regular",
    },
    inputContainer: {
        flexDirection: "row",
        alignItems: "center",
        borderTopWidth: 1,
        borderColor: "#ddd",
        paddingTop: 8,
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