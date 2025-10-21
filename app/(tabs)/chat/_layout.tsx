import { Stack } from "expo-router";

export default function ChatLayout() {
    return (
        <Stack
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: "#ffffff" },
            }}
        >
            <Stack.Screen name="index" />
            <Stack.Screen
                name="[id]"
                options={{
                    tabBarStyle: { display: "none" },
                }}
            />
        </Stack>
    )
}
