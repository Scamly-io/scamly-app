import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/theme";
import { Tabs, usePathname } from "expo-router";
import { BookOpen, House, MessageCircle, SearchCode, Sparkles } from "lucide-react-native";
import { Platform, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function TabsLayout() {
  const { colors } = useTheme();
  const pathName = usePathname();
  const isChatDetail = pathName.includes("/chat/") && pathName !== "/chat";
  const isHomeSubPage = pathName.startsWith("/home/") && pathName !== "/home";
  const isScanSubPage = pathName.startsWith("/scan/") && pathName !== "/scan";
  const hideTabBar = isChatDetail || isHomeSubPage || isScanSubPage;
  const insets = useSafeAreaInsets();

  const bottomPadding = Platform.OS === "ios" ? 24 : Math.max(12, insets.bottom + 6);
  const tabBarHeight = Platform.OS === "ios" ? 88 : 56 + bottomPadding;

  return (
    <ProtectedRoute>
      <Tabs
        screenOptions={{
          tabBarStyle: hideTabBar
            ? { display: "none" }
            : {
                backgroundColor: colors.tabBar,
                borderTopColor: colors.tabBarBorder,
                borderTopWidth: StyleSheet.hairlineWidth,
                paddingTop: 8,
                paddingBottom: bottomPadding,
                height: tabBarHeight,
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
            tabBarIcon: ({ focused, color }) => (
              <House size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="scan"
          options={{
            title: "Scan",
            tabBarIcon: ({ focused, color }) => (
              <Sparkles size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: "Chat",
            tabBarIcon: ({ focused, color }) => (
              <MessageCircle size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="contact-search"
          options={{
            title: "Search",
            tabBarIcon: ({ focused, color }) => (
              <SearchCode size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
        <Tabs.Screen
          name="learn"
          options={{
            title: "Library",
            tabBarIcon: ({ focused, color }) => (
              <BookOpen size={22} color={color} strokeWidth={focused ? 2.5 : 2} />
            ),
          }}
        />
      </Tabs>
    </ProtectedRoute>
  );
}
