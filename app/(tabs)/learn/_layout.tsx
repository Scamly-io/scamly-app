import { Stack } from "expo-router";

export default function LearnLayout() {
    return (
        <Stack>
            <Stack.Screen name="index" options={{ title: "Learn", headerShown: false }} />
        </Stack>
    )
}