import { Stack } from "expo-router";
import { View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";

export default function ChatLayout() {
    
    return (
        <SafeAreaProvider>
            <View style={{ flex: 1, backgroundColor: "#FAF9F6" }}>
                <Stack 
                    screenOptions={{ 
                        headerShown: false, 
                        contentStyle: { backgroundColor: "#FAF9F6" },
                        animation: "slide_from_right",
                        animationDuration: 100
                    }}
                >
                    <Stack.Screen name="index" />
                    <Stack.Screen 
                        name="[id]" 
                        options={{ 
                            tabBarStyle: { display: "none" },
                            contentStyle: { backgroundColor: "#FAF9F6" }
                        }}
                    />
                </Stack>
            </View>
        </SafeAreaProvider>
    )
}
