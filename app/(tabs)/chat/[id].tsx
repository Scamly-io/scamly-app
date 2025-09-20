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

            console.log("fetching messages");
            const { data, error } = await supabase
                .from("messages")
                .select("id, role, content, created_at")
                .eq("chat_id", id)
                .order("created_at", { ascending: true });

            console.log("messages fetched");
            console.log(data);

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

        const newMessage = {
            chat_id: id,
            role: "user" as const,
            content: input.trim(),
        }

        const { data, error } = await supabase
            .from("messages")
            .insert([newMessage])
            .select()
            .single();

        if (error) {
            console.error("Error sending message: ", error);
            return;
        }

        const { error: updateError } = await supabase
            .from("chats")
            .update({ last_message: newMessage.content })
            .eq("id", id);

        if (updateError) {
            console.error("Error updating last message: ", updateError);
        }

        setMessages((prev) => [...prev, data]);
        setInput("");
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