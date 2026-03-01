import ProtectedRoute from "@/components/ProtectedRoute";
import { useTheme } from "@/theme";
import { Tabs, usePathname } from "expo-router";
import { BookOpen, House, MessageCircle, SearchCode, Sparkles } from "lucide-react-native";
import { Platform, StyleSheet } from "react-native";

export default function TabsLayout() {
  const { colors, isDark } = useTheme();
  const pathName = usePathname();
  const isChatDetail = pathName.includes("/chat/") && pathName !== "/chat";

  return (
    <ProtectedRoute>
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
