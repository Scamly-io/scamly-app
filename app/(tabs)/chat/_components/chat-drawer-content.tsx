import { useChatStore } from "@/store/chatStore";
import { useTheme } from "@/theme";
import { deleteConversationId } from "@/utils/ai/chat";
import { trackUserVisibleError } from "@/utils/shared/analytics";
import type { CachedChatSummary } from "@/utils/chat/chat-history-cache";
import {
  getChatHistoryCache,
  setChatHistoryCache,
} from "@/utils/chat/chat-history-cache";
import { captureChatError, captureDataFetchError } from "@/utils/shared/sentry";
import { supabase } from "@/utils/shared/supabase";
import { foregroundColor, frame, padding, scaleEffect } from "@expo/ui/swift-ui/modifiers";
import type { DrawerContentComponentProps } from "@react-navigation/drawer";
import {
  DrawerContentScrollView,
  useDrawerStatus,
} from "@react-navigation/drawer";
import { router, usePathname } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useColorScheme,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { openNewChatSession } from "@/utils/chat/chat-nav";

function formatChatTitleDate(iso: string): string {
  const date = new Date(iso);
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** Insert or merge so `created_at` descending matches the chats API order. */
function mergeChatSortedDesc(
  list: CachedChatSummary[],
  item: CachedChatSummary
): CachedChatSummary[] {
  if (list.some((c) => c.id === item.id)) return list;
  const next = [...list, item];
  next.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return next;
}

export default function ChatDrawerContent(props: DrawerContentComponentProps) {
  const { navigation } = props;
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const pathname = usePathname();
  const drawerStatus = useDrawerStatus();

  const currentChatId =
    pathname.startsWith("/chat/") && pathname !== "/chat"
      ? pathname.replace(/^\/chat\//, "").split("/")[0] ?? ""
      : "";

  const [userId, setUserId] = useState("");
  const [chats, setChats] = useState<CachedChatSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    const cached = getChatHistoryCache();
    if (cached) {
      setChats(cached);
      return;
    }
    if (!userId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("chats")
      .select("id, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    setLoading(false);
    if (error) {
      captureDataFetchError(error, "chat", "fetch_chats_drawer", "critical");
      return;
    }
    const rows = data ?? [];
    setChatHistoryCache(rows);
    setChats(rows);
  }, [userId]);

  useEffect(() => {
    void supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.id) setUserId(user.id);
    });
  }, []);

  useEffect(() => {
    if (drawerStatus === "open") {
      void loadHistory();
    }
  }, [drawerStatus, loadHistory]);

  const selectChat = useCallback(
    (id: string) => {
      navigation.closeDrawer();
      useChatStore.getState().setConversationId(null);
      router.replace(`/chat/${id}`);
    },
    [navigation]
  );

  const deleteChatOptimistic = useCallback(
    (item: CachedChatSummary) => {
      const targetId = item.id;
      const deletingCurrentChat = targetId === currentChatId;

      setChats((prev) => prev.filter((c) => c.id !== targetId));
      const cached = getChatHistoryCache();
      if (cached) {
        setChatHistoryCache(cached.filter((c) => c.id !== targetId));
      }

      let navigatedToNewChat = false;
      if (deletingCurrentChat) {
        navigation.closeDrawer();
        openNewChatSession();
        navigatedToNewChat = true;
      }

      void (async () => {
        try {
          await deleteConversationId(targetId);
        } catch (err) {
          setChats((prev) => mergeChatSortedDesc(prev, item));

          const rolledCache = getChatHistoryCache();
          setChatHistoryCache(mergeChatSortedDesc(rolledCache ?? [], item));

          if (navigatedToNewChat) {
            router.replace(`/chat/${targetId}`);
          }

          trackUserVisibleError("chat", "chat_delete_failed", true);
          Alert.alert(
            "Couldn't delete chat",
            "There was an issue deleting this chat. Please try again later."
          );
          captureChatError(err, "delete_chat_optimistic");
        }
      })();
    },
    [currentChatId, navigation]
  );

  const confirmDeleteChat = useCallback(
    (item: CachedChatSummary) => {
      Alert.alert("Delete chat", "This conversation will be permanently deleted.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => deleteChatOptimistic(item),
        },
      ]);
    },
    [deleteChatOptimistic]
  );

  const maxTitleWidth = Math.min(360, Math.round(width * 0.7)) - 32;

  return (
    <DrawerContentScrollView
      {...props}
      contentContainerStyle={[
        styles.scrollContent,
        {
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 16,
          backgroundColor: colors.surface,
        },
      ]}
    >
      <Text style={[styles.mainTitle, { color: colors.textPrimary }]} selectable>
        Scamly AI Chat
      </Text>
      <Text style={[styles.sectionLabel, { color: colors.textSecondary }]} selectable>
        Previous Chats
      </Text>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={chats}
          scrollEnabled={false}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          renderItem={({ item }) => (
            <DrawerChatRow
              title={formatChatTitleDate(item.created_at)}
              selected={item.id === currentChatId}
              colors={colors}
              maxTitleWidth={maxTitleWidth}
              onPress={() => selectChat(item.id)}
              onConfirmDelete={() => confirmDeleteChat(item)}
            />
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.textSecondary }]} selectable>
              No saved chats yet
            </Text>
          }
        />
      )}
    </DrawerContentScrollView>
  );
}

function DrawerChatRow({
  title,
  selected,
  colors,
  maxTitleWidth,
  onPress,
  onConfirmDelete,
}: {
  title: string;
  selected: boolean;
  colors: ReturnType<typeof useTheme>["colors"];
  maxTitleWidth: number;
  onPress: () => void;
  /** Alert confirmation then delete (used by SwiftUI menu “Delete” and Android long-press). */
  onConfirmDelete: () => void;
}) {
  const colorScheme = useColorScheme();

  const label = (
    <Text
      style={[
        styles.rowText,
        {
          color: selected ? colors.accent : colors.textPrimary,
          fontFamily: selected ? "Poppins-SemiBold" : "Poppins-Regular",
          maxWidth: maxTitleWidth,
        },
      ]}
      numberOfLines={2}
      selectable
    >
      {title}
    </Text>
  );

  if (Platform.OS === "ios") {
    /* eslint-disable @typescript-eslint/no-require-imports */
    const { Host, ContextMenu, Text: SwiftText, Button: SwiftUIButton } =
      require("@expo/ui/swift-ui") as typeof import("@expo/ui/swift-ui");
    /* eslint-enable @typescript-eslint/no-require-imports */

    const previewModifiers = [
      foregroundColor(selected ? colors.accent : colors.textPrimary),
      padding({ vertical: 10, horizontal: 40 }),
      frame({ maxWidth: maxTitleWidth }),
      scaleEffect(1.2),
    ];

    return (
      <View style={styles.rowWrap}>
        <Host
          matchContents
          {...(colorScheme === "dark" || colorScheme === "light"
            ? { colorScheme }
            : {})}
        >
          <ContextMenu>
            <ContextMenu.Trigger>
              <Pressable
                accessibilityRole="button"
                accessibilityHint="Opens chat. Long press for delete options."
                onPress={onPress}
                style={({ pressed }) => [
                  styles.rowPressable,
                  pressed ? { opacity: 0.65 } : null,
                ]}
              >
                {label}
              </Pressable>
            </ContextMenu.Trigger>
            <ContextMenu.Preview>
              <SwiftText modifiers={previewModifiers}>{title}</SwiftText>
            </ContextMenu.Preview>
            <ContextMenu.Items>
              <SwiftUIButton role="destructive" label="Delete" onPress={onConfirmDelete} />
            </ContextMenu.Items>
          </ContextMenu>
        </Host>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint="Opens chat. Long press to delete."
      onPress={onPress}
      onLongPress={onConfirmDelete}
      delayLongPress={380}
      style={({ pressed }) => [styles.rowPressable, pressed ? { opacity: 0.65 } : null]}
    >
      {label}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
  },
  mainTitle: {
    fontFamily: "Poppins-Bold",
    fontSize: 22,
    marginBottom: 6,
  },
  sectionLabel: {
    fontFamily: "Poppins-Medium",
    fontSize: 13,
    marginBottom: 14,
  },
  loader: {
    paddingVertical: 24,
    alignItems: "center",
  },
  empty: {
    fontFamily: "Poppins-Regular",
    fontSize: 14,
    marginTop: 8,
  },
  rowWrap: {
    marginBottom: 2,
  },
  rowPressable: {
    paddingVertical: 12,
    paddingHorizontal: 0,
  },
  rowText: {
    fontSize: 15,
    lineHeight: 21,
  },
});
