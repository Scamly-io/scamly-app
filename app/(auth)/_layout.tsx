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
        <Stack.Screen name="account-deleted" options={{ title: "Account Deleted" }} />
        <Stack.Screen name="onboarding" options={{ title: "Onboarding", gestureEnabled: false }} />
        <Stack.Screen name="subscription-success" options={{ title: "Subscription", gestureEnabled: false }} />
      </Stack>
    </SignUpProvider>
  );
}