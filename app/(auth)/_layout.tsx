import { SignUpProvider } from "@/contexts/SignUpContext";
import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <SignUpProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" options={{ title: "Login" }} />
        <Stack.Screen name="SignupConfirm" options={{ title: "Confirm" }} />
        <Stack.Screen name="AccountDeleted" options={{ title: "Account Deleted" }} />
        <Stack.Screen name="onboarding" options={{ title: "Onboarding", gestureEnabled: false }} />
        <Stack.Screen name="SubscriptionSuccess" options={{ title: "Subscription", gestureEnabled: false }} />
      </Stack>
    </SignUpProvider>
  );
}