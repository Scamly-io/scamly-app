import { useTheme } from "@/theme";
import { Drawer } from "expo-router/drawer";
import { useWindowDimensions } from "react-native";
import ChatDrawerContent from "./_components/chat-drawer-content";

export default function ChatLayout() {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(360, Math.round(width * 0.70));

  return (
    <Drawer
      drawerContent={(props) => <ChatDrawerContent {...props} />}
      screenOptions={{
        headerShown: false,
        drawerPosition: "left",
        drawerType: "front",
        swipeEnabled: true,
        overlayColor: "rgba(0,0,0,0.48)",
        drawerStyle: {
          width: drawerWidth,
          backgroundColor: colors.surface,
        },
        sceneContainerStyle: {
          backgroundColor: "#ffffff",
        },
      }}
    >
      <Drawer.Screen name="(conversation)" options={{ title: "Chat" }} />
    </Drawer>
  );
}
