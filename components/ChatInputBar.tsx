import { Send } from "lucide-react-native";
import { StyleSheet, TextInput, TouchableOpacity, View } from "react-native";

type Props = {
    value: string;
    onChangeText: (text: string) => void;
    onSend: () => void;
    placeholder?: string;
    disabled?: boolean;
};

export default function ChatInputBar({ value, onChangeText, onSend, placeholder, disabled }: Props) {
    const canSend = value.trim().length > 0 && !disabled;

    return (
        <View style={styles.inputContainer}>
            <TextInput
                style={styles.input}
                placeholder={placeholder || "Ask Scamly anything..."}
                placeholderTextColor="#94A3B8"
                value={value}
                onChangeText={onChangeText}
                multiline
                numberOfLines={1}
                blurOnSubmit={false}
                returnKeyType="send"
                onSubmitEditing={canSend ? onSend : undefined}
            />
            <TouchableOpacity
                style={[styles.sendButton, !canSend && { backgroundColor: "#CBD5E1" }]}
                onPress={onSend}
                disabled={!canSend}
            >
                <Send size={18} color="white" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    inputContainer: {
        flexDirection: "row",
        alignItems: "flex-end",
        backgroundColor: "white",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "rgba(15, 23, 42, 0.08)",
        paddingHorizontal: 12,
        paddingVertical: 8,
        shadowColor: "#0F172A",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
    },
    input: {
        flex: 1,
        fontFamily: "Poppins-Regular",
        fontSize: 15,
        color: "#0F172A",
        paddingVertical: 8,
        paddingHorizontal: 4,
        maxHeight: 120,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#2563EB",
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 8,
    },
});

