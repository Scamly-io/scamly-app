import { useTheme } from "@/theme";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, usePathname } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Platform, StyleSheet, View } from "react-native";
import { BlurView } from "expo-blur";

export default function TabsLayout() {
  const { colors, isDark } = useTheme();
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
        tabBarStyle: isChatDetail
          ? { display: "none" }
          : {
              backgroundColor: colors.tabBar,
              borderTopColor: colors.tabBarBorder,
              borderTopWidth: StyleSheet.hairlineWidth,
              paddingTop: 8,
              paddingBottom: Platform.OS === "ios" ? 24 : 12,
              height: Platform.OS === "ios" ? 88 : 68,
            },
        headerShown: false,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: {
          fontFamily: "Poppins-Medium",
          fontSize: 11,
          marginTop: 4,
        },
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
          tabBarIcon: ({ focused, color }) =>
            Platform.OS === "ios" ? (
              <SymbolView name="sparkles.2" tintColor={color} />
            ) : focused ? (
              <Ionicons name="sparkles" size={22} color={color} />
            ) : (
              <Ionicons name="sparkles-outline" size={22} color={color} />
            ),
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
          title: "Search",
          tabBarIcon: ({ focused, color }) =>
            Platform.OS === "ios" ? (
              <SymbolView name="sparkle.magnifyingglass" tintColor={color} />
            ) : focused ? (
              <Ionicons name="search" size={22} color={color} />
            ) : (
              <Ionicons name="search-outline" size={22} color={color} />
            ),
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
