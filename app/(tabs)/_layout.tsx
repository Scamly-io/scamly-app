import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/theme";
import { usePathname } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { createContext } from "react";

// --- Context for hiding the tab bar from child screens ---
export const TabBarContext = createContext<{
  setIsTabBarHidden: (hidden: boolean) => void;
}>({
  setIsTabBarHidden: () => {},
});

export default function TabsLayout() {
  const { colors } = useTheme();
  const pathName = usePathname();

  // NOTE: With NativeTabs you can also drive this from child screens
  // via useFocusEffect + TabBarContext (see below), but if you want to
  // keep the path-based logic you used before, this still works.
  const isChatDetail = pathName.includes("/chat/") && pathName !== "/chat";
  const isHomeSubPage = pathName.startsWith("/home/") && pathName !== "/home";
  const hideTabBar = isChatDetail || isHomeSubPage;

  return (
    <ProtectedRoute>
      <TabBarContext value={{ setIsTabBarHidden: () => {} }}>
        <NativeTabs
          hidden={hideTabBar}
          // Active icon/text tint color
          tintColor={colors.tabActive}
        >
          <NativeTabs.Trigger name="home">
            <NativeTabs.Trigger.Icon
              sf={{ default: "house", selected: "house.fill" }}
              md="home"
            />
            <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="scan">
            <NativeTabs.Trigger.Icon
              sf={{ default: "sparkles", selected: "sparkles" }}
              md="auto_awesome"
            />
            <NativeTabs.Trigger.Label>Scan</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="chat">
            <NativeTabs.Trigger.Icon
              sf={{ default: "message", selected: "message.fill" }}
              md="chat_bubble"
            />
            <NativeTabs.Trigger.Label>Chat</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="contact-search">
            <NativeTabs.Trigger.Icon
              sf={{ default: "magnifyingglass", selected: "magnifyingglass" }}
              md="search"
            />
            <NativeTabs.Trigger.Label>Search</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>

          <NativeTabs.Trigger name="learn">
            <NativeTabs.Trigger.Icon
              sf={{ default: "books.vertical", selected: "books.vertical.fill" }}
              md="menu_book"
            />
            <NativeTabs.Trigger.Label>Library</NativeTabs.Trigger.Label>
          </NativeTabs.Trigger>
        </NativeTabs>
      </TabBarContext>
    </ProtectedRoute>
  );
}