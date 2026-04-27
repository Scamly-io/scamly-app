import { useTheme } from "@/theme";
import type { CachedChatSummary } from "@/utils/chat-history-cache";
import { ChevronRight } from "lucide-react-native";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import Animated, {
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  visible: boolean;
  onClose: () => void;
  chats: CachedChatSummary[];
  loading: boolean;
  currentChatId: string;
  onSelectChat: (id: string) => void;
  onDeleteChat: (id: string) => void;
};

function formatChatTitleDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

type RadiusTokens = ReturnType<typeof useTheme>["radius"];
type ThemeColors = ReturnType<typeof useTheme>["colors"];

export default function ChatHistoryDrawer({
  visible,
  onClose,
  chats,
  loading,
  currentChatId,
  onSelectChat,
  onDeleteChat,
}: Props) {
  const { colors, radius } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(360, Math.round(width * 0.86));
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, { duration: 300 });
  }, [progress, visible]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 1], [0, 0.48]),
  }));

  const drawerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: interpolate(progress.value, [0, 1], [-drawerWidth, 0]) }],
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Animated.View style={[styles.backdropFill, backdropStyle]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close menu" />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawerPane,
            drawerStyle,
            {
              width: drawerWidth,
              paddingTop: insets.top + 12,
              paddingBottom: insets.bottom + 16,
              backgroundColor: colors.surface,
              borderRightWidth: StyleSheet.hairlineWidth,
              borderRightColor: colors.border,
            },
          ]}
        >
          <Text style={[styles.drawerTitle, { color: colors.textPrimary }]} selectable>
            Chats
          </Text>

          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <FlatList
              data={chats}
              keyExtractor={(item) => item.id}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <ChatHistoryRow
                  title={formatChatTitleDate(item.created_at)}
                  selected={item.id === currentChatId}
                  colors={colors}
                  radius={radius}
                  onPress={() => {
                    onSelectChat(item.id);
                    onClose();
                  }}
                  onDelete={() => onDeleteChat(item.id)}
                />
              )}
              ListEmptyComponent={
                <Text style={[styles.empty, { color: colors.textSecondary }]} selectable>
                  No saved chats yet
                </Text>
              }
            />
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}

function ChatHistoryRow({
  title,
  selected,
  colors,
  radius,
  onPress,
  onDelete,
}: {
  title: string;
  selected: boolean;
  colors: ThemeColors;
  radius: RadiusTokens;
  onPress: () => void;
  onDelete: () => void;
}) {
  const [androidMenuOpen, setAndroidMenuOpen] = useState(false);

  const rowInner = (
    <>
      <Text style={[styles.rowTitle, { color: colors.textPrimary }]} numberOfLines={2} selectable>
        {title}
      </Text>
      <ChevronRight size={18} color={colors.textTertiary} />
    </>
  );

  if (Platform.OS === "ios") {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Host, ContextMenu, Button: SwiftUIButton } = require("@expo/ui/swift-ui") as typeof import("@expo/ui/swift-ui");
    return (
      <View style={{ marginBottom: 10 }}>
        <Host matchContents>
          <ContextMenu>
            <ContextMenu.Trigger>
              <Pressable
                accessibilityRole="button"
                onPress={onPress}
                style={[
                  styles.row,
                  {
                    borderRadius: radius.lg,
                    backgroundColor: selected ? colors.accentMuted : colors.backgroundSecondary,
                    borderWidth: selected ? StyleSheet.hairlineWidth : 0,
                    borderColor: colors.border,
                  },
                ]}
              >
                {rowInner}
              </Pressable>
            </ContextMenu.Trigger>
            <ContextMenu.Items>
              <SwiftUIButton role="destructive" label="Delete" onPress={onDelete} />
            </ContextMenu.Items>
          </ContextMenu>
        </Host>
      </View>
    );
  }

  return (
    <>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        onLongPress={() => setAndroidMenuOpen(true)}
        delayLongPress={380}
        style={({ pressed }) => [
          styles.row,
          {
            borderRadius: radius.lg,
            backgroundColor: pressed || androidMenuOpen ? colors.accentMuted : colors.backgroundSecondary,
            borderWidth: selected ? StyleSheet.hairlineWidth : 0,
            borderColor: colors.border,
          },
        ]}
      >
        {rowInner}
      </Pressable>

      <Modal
        visible={androidMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setAndroidMenuOpen(false)}
      >
        <Pressable style={styles.androidMenuBackdrop} onPress={() => setAndroidMenuOpen(false)}>
          <Pressable
            onPress={(e) => e.stopPropagation()}
            style={[styles.androidMenuCard, { backgroundColor: colors.surface, borderRadius: radius.lg }]}
          >
            <Pressable
              onPress={() => {
                setAndroidMenuOpen(false);
                onDelete();
              }}
              style={styles.androidDeleteBtn}
            >
              <Text style={[styles.androidDeleteLabel, { color: colors.error }]}>Delete</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
  },
  backdropFill: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#000",
  },
  drawerPane: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    paddingHorizontal: 16,
    zIndex: 2,
    elevation: 12,
  },
  drawerTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 22,
    marginBottom: 16,
  },
  loader: {
    paddingVertical: 24,
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 24,
  },
  empty: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    marginTop: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 10,
  },
  rowTitle: {
    flex: 1,
    fontFamily: "Poppins-SemiBold",
    fontSize: 15,
    lineHeight: 21,
  },
  androidMenuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  androidMenuCard: {
    width: "100%",
    maxWidth: 280,
    overflow: "hidden",
    boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
  },
  androidDeleteBtn: {
    paddingVertical: 16,
    alignItems: "center",
  },
  androidDeleteLabel: {
    fontFamily: "Poppins-SemiBold",
    fontSize: 17,
  },
});
