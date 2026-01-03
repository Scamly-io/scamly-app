import ChatInputBar from "@/components/ChatInputBar";
import GradientBackgound from "@/components/GradientBackground";
import MessageBlock, { ChatMessage } from "@/components/MessageBlock";
import ThinkingIndicator from "@/components/ThinkingIndicator";
import { supabase } from "@/utils/supabase";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { useCallback, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import uuid from "react-native-uuid";

const THINKING_TOKEN = "__thinking__";

/**
 * Chat detail screen component displaying a conversation with the AI assistant.
 * Allows users to send messages and receive AI responses in real-time.
 */
export default function ChatDetail() {
    const { id: chatId } = useLocalSearchParams<{ id: string }>();
    // All messages in the current chat conversation
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    // Timestamp when the chat was created
    const [createdAt, setCreatedAt] = useState<string>("");
    // Loading state while fetching chat data
    const [loading, setLoading] = useState<boolean>(true);
    // Current user input text
    const [input, setInput] = useState<string>("");
    // OpenAI conversation ID for maintaining context
    const [conversationId, setConversationId] = useState<string>("");
    // Subscription plan state
    const [planLoading, setPlanLoading] = useState<boolean>(true);
    // Free plan state
    const [isFreePlan, setIsFreePlan] = useState<boolean>(false);
    // Current user ID
    const [userId, setUserId] = useState<string>("");

    const flatListRef = useRef<FlatList<ChatMessage>>(null);

    // Fetch subscription plan on mount
    useEffect(() => {
        const fetchSubscriptionPlan = async () => {
            setPlanLoading(true);
            const { data: { user }, error: userError } = await supabase.auth.getUser();
            if (userError || !user) {
                console.error("No user:", userError);
                Alert.alert("Error", "No user found");
                setPlanLoading(false);
                return;
            }

            setUserId(user.id);

            const { data: profile, error: profileError } = await supabase
                .from("profiles")
                .select("subscription_plan")
                .eq("id", user.id)
                .single();

            if (profileError) {
                console.error("Error fetching user profile:", profileError);
                Alert.alert("Error", "There is an issue with your account. Please log out and try again.");
                setPlanLoading(false);
                return;
            }

            setIsFreePlan(profile.subscription_plan === "free");
            setPlanLoading(false);
        }

        fetchSubscriptionPlan();
    }, []);

    // Fetch chat messages, conversation ID, and creation date on component mount
    useEffect(() => {
        const fetchMessages = async () => {
            if (!chatId) return;
            if (isFreePlan || planLoading) return;
            
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
    }, [chatId, isFreePlan, planLoading]);

    // Render each message block
    const renderItem = useCallback(({ item }: { item: ChatMessage }) => {
        if (item.role === "assistant" && item.content === THINKING_TOKEN) {
            return (
                <View style={styles.thinkingRow}>
                    <View style={[styles.avatar, styles.avatarAssistant]}>
                        <Text style={styles.avatarLabel}>AI</Text>
                    </View>
                    <ThinkingIndicator />
                </View>
            );
        }
        return <MessageBlock message={item} />;
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
        }, 50);
        return () => clearTimeout(timeout);
    }, [messages]);

    // Replaces the typing indicator message with an error message
    function displayErrorMessage(typingMessage: ChatMessage) {
        setMessages((prev) => {
            return prev.map(msg => 
                msg.id === typingMessage.id 
                    ? { ...msg, content: "Sorry, I encountered an error. Please try again later." }
                    : msg
            );
        });
    }

    // Handles sending a user message and receiving AI response
    async function processMessage () {
        if (isFreePlan) {
            Alert.alert("Upgrade required", "AI Chat is available on paid plans.");
            return;
        }
        const content = input.trim();
        if (!content) return;

        // Create user message object
        const userMessage = {
            id: uuid.v4().toString(),
            role: "user" as const,
            content,
            created_at: new Date().toISOString()
        }

        // Create typing indicator message
        const typingMessage = {
            id: uuid.v4().toString(),
            role: "assistant" as const,
            content: THINKING_TOKEN,
            created_at: new Date().toISOString()
        }

        setMessages((prev) => [...prev, userMessage, typingMessage]);
        setInput("");

        try {
            const res = await fetch(`https://27ui2kcryi.execute-api.ap-southeast-2.amazonaws.com/dev/get-ai-response`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content, chatId, conversationId, userId })
            });

            if (!res.ok) {
                displayErrorMessage(typingMessage);
                throw new Error(`HTTP error! status: ${res.status}`);
            }

            const data = await res.json();
            
            // Replace the "typing" message with the actual AI response
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

    if (loading || planLoading) {
        return (
            <>
                <SafeAreaView edges={["top", "bottom", "left", "right"]} style={styles.mainContainer}>
                    <View style={styles.mainContainer}>
                        <ActivityIndicator size="large" />
                    </View>
                </SafeAreaView>
            </>
        )
    }

    return (
        <GradientBackgound>
            {isFreePlan ? (
                <SafeAreaView edges={["top", "bottom", "left", "right"]} style={styles.mainContainer}>
                    <View style={[styles.mainContainer, styles.lockContainer]}>
                        <Text style={styles.lockTitle}>AI Chat is for paid plans</Text>
                        <Text style={styles.lockText}>Upgrade to continue this conversation.</Text>
                    </View>
                </SafeAreaView>
            ) : (
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === "ios" ? "padding" : "height"}
                    //Keep zero offset because header sits outside this view
                    keyboardVerticalOffset={-20}
                >
                    <SafeAreaView edges={["top", "bottom", "left", "right"]} style={styles.mainContainer}>
                        <View style={styles.sheet}>
                            <View style={styles.topRow}>
                                <TouchableOpacity style={styles.backButton} onPress={() => router.push("/chat")}>
                                    <ArrowLeft size={18} color="#0F172A" />
                                    <Text style={styles.backLabel}>Chats</Text>
                                </TouchableOpacity>
                                <Text style={styles.timestampSmall}>{new Date(createdAt || "").toLocaleDateString()}</Text>
                            </View>
                            <View style={styles.headerRow}>
                                <Text style={styles.title}>Chat with Scamly</Text>
                                <Text style={styles.subtitle}>Get advice on scams, fraud, and cyber safety.</Text>
                            </View>
                            <FlatList
                                ref={flatListRef}
                                data={messages}
                                keyExtractor={(item) => item.id.toString()}
                                renderItem={renderItem}
                                keyboardShouldPersistTaps="handled"
                                contentContainerStyle={styles.listContent}
                                removeClippedSubviews
                                initialNumToRender={20}
                                maxToRenderPerBatch={20}
                                windowSize={7}
                                ListEmptyComponent={
                                    <View style={styles.emptyState}>
                                        <Text style={styles.emptyTitle}>No messages yet</Text>
                                        <Text style={styles.emptyCopy}>Ask a question to get personalised guidance from Scamly.</Text>
                                    </View>
                                }
                            />
                        </View>

                        <View style={styles.inputWrapper}>
                            <ChatInputBar
                                value={input}
                                onChangeText={setInput}
                                onSend={processMessage}
                                placeholder="Ask Scamly about scams, fraud, or cyber crime..."
                                disabled={planLoading}
                            />
                        </View>
                    </SafeAreaView>
                </KeyboardAvoidingView>
            )}
        </GradientBackgound>
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
    sheet: {
        flex: 1,
        backgroundColor: "rgba(255,255,255,0.9)",
        borderRadius: 18,
        padding: 16,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 18,
        elevation: 4,
    },
    headerRow: {
        marginBottom: 8,
    },
    topRow: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 10,
    },
    backButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        backgroundColor: "rgba(15, 23, 42, 0.06)",
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(15, 23, 42, 0.1)",
    },
    backLabel: {
        fontFamily: "Poppins-SemiBold",
        color: "#0F172A",
        fontSize: 14,
    },
    timestampSmall: {
        fontFamily: "Poppins-Regular",
        color: "#475569",
        fontSize: 12,
    },
    title: {
        fontFamily: "Poppins-Bold",
        fontSize: 18,
        color: "#0F172A",
    },
    subtitle: {
        fontFamily: "Poppins-Regular",
        fontSize: 13,
        color: "#475569",
        marginTop: 2,
    },
    listContent: {
        paddingBottom: 16,
        paddingVertical: 8,
        gap: 14,
    },
    inputWrapper: {
        marginTop: 8,
        paddingBottom: 4,
    },
    lockContainer: {
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
    },
    lockTitle: {
        fontFamily: "Poppins-Bold",
        fontSize: 18,
        color: "#1F2937",
        textAlign: "center",
    },
    lockText: {
        fontFamily: "Poppins-Regular",
        fontSize: 14,
        color: "#4B5563",
        textAlign: "center",
    },
    avatar: {
        width: 34,
        height: 34,
        borderRadius: 8,
        alignItems: "center",
        justifyContent: "center",
    },
    avatarAssistant: {
        backgroundColor: "rgba(37, 99, 235, 0.12)",
    },
    avatarLabel: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 12,
        color: "#0F172A",
    },
    thinkingRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingHorizontal: 2,
    },
    emptyState: {
        padding: 16,
        backgroundColor: "rgba(37, 99, 235, 0.06)",
        borderRadius: 14,
        borderWidth: 1,
        borderColor: "rgba(37, 99, 235, 0.14)",
        gap: 6,
    },
    emptyTitle: {
        fontFamily: "Poppins-Bold",
        fontSize: 16,
        color: "#0F172A",
    },
    emptyCopy: {
        fontFamily: "Poppins-Regular",
        fontSize: 14,
        color: "#475569",
        lineHeight: 20,
    },
})