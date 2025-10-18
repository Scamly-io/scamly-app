import { Tabs, usePathname } from "expo-router";

export default function TabsLayout() {
  const pathName = usePathname();

  const isChatDetail = pathName.includes("/chat/") && pathName !== "/chat";

  return (
    <Tabs screenOptions={{ tabBarStyle: isChatDetail ? { display: "none" } : {} }}>
      <Tabs.Screen name="home" options={{ title: "Home", headerShown: false }} />
      <Tabs.Screen name="scan" options={{ title: "Scan", headerShown: false }} />
      <Tabs.Screen name="learn" options={{ title: "Learn", headerShown: false }} />
      <Tabs.Screen name="chat" options={{ title: "Chat", headerShown: false }} />
      <Tabs.Screen name="phone-database" options={{ title: "Phone Database", headerShown: false }} />
      <Tabs.Screen name="profile" options={{ title: "Profile", headerShown: false }} />
    </Tabs>
  );
}