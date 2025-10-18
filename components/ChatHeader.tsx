import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type ChatHeaderProps = {
    date?: string;
}

export default function ChatHeader({ date }: ChatHeaderProps) {
    const handleBackPress = () => {
        router.back();
    };

    const formattedDate = date ? new Date(date).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "";

    return (
        <SafeAreaView edges={["top", "left", "right"]} style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
                    <ArrowLeft size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>{formattedDate}</Text>
                <View style={styles.placeholder} />
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        backgroundColor: "white",
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: "#f5f5f5",
    },
    title: {
        fontSize: 18,
        fontFamily: "Poppins-Bold",
        color: "#333",
        flex: 1,
        textAlign: "center",
    },
    placeholder: {
        width: 40, // Same width as back button to center the title
    },
});
