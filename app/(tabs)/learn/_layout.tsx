import { Stack } from "expo-router";

export default function LearnLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ title: "Learn", headerShown: false }} />
            <Stack.Screen name="AllArticles" options={{ title: "All Articles", headerShown: false }} />
            <Stack.Screen name="AllQuickTips" options={{ title: "Quick Tips", headerShown: false }} />
            <Stack.Screen name="[slug]" options={{ title: null, headerShown: false }} />
        </Stack>
    )
}