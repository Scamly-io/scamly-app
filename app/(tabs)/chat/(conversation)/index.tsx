import { Redirect, useLocalSearchParams } from "expo-router";
import { useMemo } from "react";
import uuid from "react-native-uuid";

/**
 * Chat tab entry.
 *
 * - When the user landed here from a chat detail (close button passes `?exit=1`),
 *   redirect to the home tab so the chat stack stays cleared.
 * - Otherwise (tab press, home shortcut, etc.) mint a new id and hand off to `[id]`.
 */
export default function ChatIndex() {
  const { exit } = useLocalSearchParams<{ exit?: string }>();
  const chatId = useMemo(() => uuid.v4().toString(), []);

  if (exit === "1") {
    return <Redirect href="/home" />;
  }

  return <Redirect href={`/chat/${chatId}`} />;
}
