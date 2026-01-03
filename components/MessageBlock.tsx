import Markdown from "react-native-markdown-display";
import { memo, useEffect, useMemo, useRef } from "react";
import { Animated, StyleSheet, Text, View } from "react-native";

export type ChatMessage = {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    created_at?: string;
};

type Props = {
    message: ChatMessage;
};

const MessageBlock = memo(function MessageBlock({ message }: Props) {
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const isAssistant = message.role === "assistant";

    useEffect(() => {
        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
        }).start();
    }, [fadeAnim]);

    const timestamp = useMemo(() => {
        if (!message.created_at) return "";
        return new Date(message.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    }, [message.created_at]);

    const markdownStyles = {
        body: styles.assistantText,
        paragraph: styles.assistantText,
        text: styles.assistantText,
        heading1: styles.heading,
        heading2: styles.heading,
        heading3: styles.heading,
        bullet_list: styles.list,
        ordered_list: styles.list,
        list_item: styles.listItem,
        code_inline: styles.inlineCode,
        code_block: styles.codeBlock,
        fence: styles.codeBlock,
        link: styles.link,
    };

    return (
        <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
            <View style={[styles.avatar, isAssistant ? styles.avatarAssistant : styles.avatarUser]}>
                <Text style={styles.avatarLabel}>{isAssistant ? "AI" : "You"}</Text>
            </View>
            <View style={[styles.bubble, isAssistant ? styles.bubbleAssistant : styles.bubbleUser]}>
                <View style={styles.headerRow}>
                    <Text style={[styles.role, isAssistant ? styles.roleAssistant : styles.roleUser]}>
                        {isAssistant ? "Scamly" : "You"}
                    </Text>
                    {timestamp ? <Text style={styles.timestamp}>{timestamp}</Text> : null}
                </View>
                {isAssistant ? (
                    <Markdown style={markdownStyles}>
                        {message.content}
                    </Markdown>
                ) : (
                    <Text style={styles.userText}>{message.content}</Text>
                )}
            </View>
        </Animated.View>
    );
});

export default MessageBlock;

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        gap: 12,
        alignItems: "flex-start",
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
    avatarUser: {
        backgroundColor: "rgba(15, 23, 42, 0.1)",
    },
    avatarLabel: {
        fontFamily: "Poppins-SemiBold",
        fontSize: 12,
        color: "#0F172A",
    },
    bubble: {
        flex: 1,
        borderRadius: 14,
        padding: 14,
        gap: 6,
        borderWidth: 1,
    },
    bubbleAssistant: {
        backgroundColor: "rgba(248, 250, 252, 0.9)",
        borderColor: "rgba(37, 99, 235, 0.12)",
    },
    bubbleUser: {
        backgroundColor: "white",
        borderColor: "rgba(15, 23, 42, 0.08)",
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 4,
    },
    role: {
        fontSize: 12,
        textTransform: "uppercase",
        letterSpacing: 0.8,
    },
    roleAssistant: {
        color: "#1D4ED8",
        fontFamily: "Poppins-Bold",
    },
    roleUser: {
        color: "#0F172A",
        fontFamily: "Poppins-Bold",
    },
    timestamp: {
        color: "#6B7280",
        fontFamily: "Poppins-Regular",
        fontSize: 12,
    },
    userText: {
        color: "#0F172A",
        fontFamily: "Poppins-Regular",
        fontSize: 15,
        lineHeight: 22,
    },
    assistantText: {
        color: "#0F172A",
        fontFamily: "Poppins-Regular",
        fontSize: 15,
        lineHeight: 22,
    },
    heading: {
        color: "#0F172A",
        fontFamily: "Poppins-Bold",
        marginTop: 10,
        marginBottom: 4,
    },
    list: {
        marginVertical: 6,
    },
    listItem: {
        flexDirection: "row",
        marginBottom: 6,
    },
    inlineCode: {
        backgroundColor: "rgba(15, 23, 42, 0.06)",
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
        fontFamily: "Menlo",
        fontSize: 14,
    },
    codeBlock: {
        backgroundColor: "#0F172A",
        color: "#F8FAFC",
        padding: 10,
        borderRadius: 10,
        overflow: "hidden",
        fontFamily: "Menlo",
        fontSize: 14,
        lineHeight: 20,
    },
    link: {
        color: "#2563EB",
        textDecorationLine: "underline",
    },
});

