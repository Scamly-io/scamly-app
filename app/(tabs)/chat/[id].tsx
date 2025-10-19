import ChatHeader from "@/components/ChatHeader";
import { supabase } from "@/utils/supabase";
import { useFonts } from "expo-font";
import { useLocalSearchParams } from "expo-router";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, View } from "react-native";
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

    const MessageBubble = memo(function MessageBubble({ item }: { item: Message }) {
        const isUser = item.role === "user";
        return (
            <View style={isUser ? styles.messageContainerUser : styles.messageContainerAssistant}>
                <Text style={isUser ? styles.messageContentUser : styles.messageContentAssistant}>
                    {item.content}
                </Text>
            </View>
        );
    });

    //with an inverted FlatList and maintainVisibleContentPosition, the latest messages stay anchored to the input without manual scrolling.

    //Keep hooks (like useCallback) before any early returns to preserve hook order
    const renderItem = useCallback(({ item }: { item: Message }) => (
        <MessageBubble item={item} />
    ), []);

    //Render newest at bottom with inverted list by reversing data for display
    const invertedData = useMemo(() => {
        return [...messages].reverse();
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
                //Keep zero offset because header sits outside this view
                keyboardVerticalOffset={-20}
            >
                <SafeAreaView edges={["bottom", "left", "right"]} style={styles.mainContainer}>
                    <View style={{ flex: 1 }}>
                        <FlatList
                            ref={flatListRef}
                            data={invertedData}
                            keyExtractor={(item) => item.id.toString()}
                            renderItem={renderItem}
                            inverted
                            keyboardShouldPersistTaps="handled"
                            maintainVisibleContentPosition={{ minIndexForVisible: 1, autoscrollToTopThreshold: 20 }}
                            contentContainerStyle={{ paddingVertical: 8 }}
                            removeClippedSubviews
                            initialNumToRender={20}
                            maxToRenderPerBatch={20}
                            windowSize={7}
                            updateCellsBatchingPeriod={50}
                        />
                    </View>

                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type a message"
                            placeholderTextColor="#171924"
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
        paddingTop: 8,
    },
    input: {
        flex: 1,
        borderWidth: 2,
        borderColor: "#bbb",
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginRight: 8,
        fontFamily: "Poppins-Regular",
    }
})