import { Stack } from "expo-router";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function ChatLayout() {
    
    return (
        <SafeAreaProvider>
            <View style={{ flex: 1, backgroundColor: "#FAF9F6" }}>
                <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "transparent" } }}>
                    <Stack.Screen name="index" />
                </Stack>
            </View>
        </SafeAreaProvider>
    )
}
