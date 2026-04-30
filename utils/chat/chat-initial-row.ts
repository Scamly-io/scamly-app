import type { SupabaseClient } from "@supabase/supabase-js";

/** Row shape for first-time insert into `public.chats` before the first outbound edge message */
export type InitialChatRowPayload = {
  id: string;
  user_id: string;
  last_message: string;
};

export function needsInitialChatRowInsert(params: {
  chatRowPersistedInDb: boolean;
  messageCount: number;
}): boolean {
  return !params.chatRowPersistedInDb && params.messageCount === 0;
}

export function buildInitialChatRowPayload(params: {
  chatId: string;
  userId: string;
  lastMessage: string;
}): InitialChatRowPayload {
  return {
    id: params.chatId,
    user_id: params.userId,
    last_message: params.lastMessage,
  };
}

/** Inserts the chat row for a client-generated id. Duplicate key is treated as success. */
export async function insertInitialChatRow(
  client: SupabaseClient,
  payload: InitialChatRowPayload
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { error } = await client.from("chats").insert(payload);
  if (!error) return { ok: true };
  if (error.code === "23505") return { ok: true };
  return { ok: false, message: error.message };
}
