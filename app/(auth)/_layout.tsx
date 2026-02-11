import { SignUpProvider } from "@/contexts/SignUpContext";
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <SignUpProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ title: "Login" }} />
        <Stack.Screen name="signup" options={{ title: "Sign Up" }} />
        <Stack.Screen name="signup-profile" options={{ title: "Profile" }} />
        <Stack.Screen name="signup-confirm" options={{ title: "Confirm" }} />
      </Stack>
    </SignUpProvider>
  );
}