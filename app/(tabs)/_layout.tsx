import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen name="home" options={{ title: "Home", headerShown: false }} />
      <Tabs.Screen name="scan" options={{ title: "Scan", headerShown: false }} />
      <Tabs.Screen name="learn" options={{ title: "Learn", headerShown: false }} />
      <Tabs.Screen name="chat" options={{ title: "Chat", headerShown: false }} />
      <Tabs.Screen name="phone-database" options={{ title: "Phone Database", headerShown: false }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", headerShown: false }} />
    </Tabs>
  );
}