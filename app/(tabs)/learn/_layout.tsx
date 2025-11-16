import { Stack } from "expo-router";

export default function LearnLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ title: "Learn", headerShown: false }} />
            <Stack.Screen name="all-articles" options={{ title: "All Articles", headerShown: true }} />
            <Stack.Screen name="quick-tips" options={{ title: "Quick Tips", headerShown: true }} />
            <Stack.Screen name="[id]" options={{ title: "Article", headerShown: true }} />
        </Stack>
    )
}