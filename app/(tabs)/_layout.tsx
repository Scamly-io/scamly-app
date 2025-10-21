import { Tabs, usePathname } from "expo-router";

export default function TabsLayout() {
  const pathName = usePathname();

  const isChatDetail = pathName.includes("/chat/") && pathName !== "/chat";

  return (
    <Tabs screenOptions={{ 
      tabBarStyle: isChatDetail ? { display: "none" } : {}, 
      // Avoid forcing a black content background that can flash during transitions
      headerShown: false
    }}>
      <Tabs.Screen name="home" options={{ title: "Home" }} />
      <Tabs.Screen name="scan" options={{ title: "Scan" }} />
      <Tabs.Screen name="learn" options={{ title: "Learn" }} />
      <Tabs.Screen name="chat" options={{ title: "Chat" }} />
      <Tabs.Screen name="contact-search" options={{ title: "Contact Search" }} />
      <Tabs.Screen name="profile" options={{ title: "Profile" }} />
    </Tabs>
  );
}