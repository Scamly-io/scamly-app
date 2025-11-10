import { Ionicons } from "@expo/vector-icons";
import { Tabs, usePathname } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Platform } from "react-native";

export default function TabsLayout() {
  const pathName = usePathname();
  const isChatDetail = pathName.includes("/chat/") && pathName !== "/chat";

  const getIcon = (
    iosSymbol: string,
    iosSymbolFocused: string,
    androidIcon: keyof typeof Ionicons.glyphMap,
    androidIconFocused: keyof typeof Ionicons.glyphMap,
    focused: boolean,
    color: string
  ) => {
    if (Platform.OS === "ios") {
      return <SymbolView name={focused ? iosSymbolFocused : iosSymbol} tintColor={color} />;
    } else {
      return <Ionicons name={focused ? androidIconFocused : androidIcon} size={22} color={color} />;
    }
  };

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: isChatDetail ? { display: "none" } : {},
        headerShown: false,
        tabBarActiveTintColor: "black",
        tabBarInactiveTintColor: "gray",
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: "Home",
          tabBarIcon: ({ focused, color }) =>
            getIcon("house", "house.fill", "home-outline", "home", focused, color),
        }}
      />
      <Tabs.Screen
        name="scan"
        options={{
          title: "Scan",
          tabBarIcon: ({ focused, color }) => (Platform.OS === "ios" ? 
            <SymbolView name="sparkles.2" tintColor={color} /> : 
            focused ? 
              <Ionicons name="sparkles" size={22} color={color} /> : 
              <Ionicons name="sparkles-outline" size={22} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: "Chat",
          tabBarIcon: ({ focused, color }) =>
            getIcon("message", "message.fill", "chatbubble-outline", "chatbubble", focused, color),
        }}
      />
      <Tabs.Screen
        name="info-search"
        options={{
          title: "Info Search",
          tabBarIcon: ({ focused, color }) => (Platform.OS === "ios" ? 
            <SymbolView name="sparkle.magnifyingglass" tintColor={color} /> : 
            focused ? 
              <Ionicons name="search" size={22} color={color} /> : 
              <Ionicons name="search-outline" size={22} color={color} />
          )
        }}
      />
      <Tabs.Screen
        name="learn"
        options={{
          title: "Learn",
          tabBarIcon: ({ focused, color }) =>
            getIcon("book", "book.fill", "book-outline", "book", focused, color),
        }}
      />
    </Tabs>
  );
}
