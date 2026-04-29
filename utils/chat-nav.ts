import { router } from "expo-router";

import { useChatStore } from "@/store/chatStore";
import { clearChatHistoryCache } from "@/utils/chat-history-cache";

/**
 * Starts a fresh chat session by replacing the current route with `/chat`, which
 * runs `index` and redirects to `/chat/{id}`. Always use `replace` (never `push`)
 * so the navigation stack does not accumulate chat screens.
 */
export function openNewChatSession() {
  clearChatHistoryCache();
  useChatStore.getState().resetSession();
  router.replace("/chat");
}
