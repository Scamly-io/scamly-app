export type CachedChatSummary = {
  id: string;
  created_at: string;
};

let cache: CachedChatSummary[] | undefined;

export function getChatHistoryCache(): CachedChatSummary[] | undefined {
  return cache;
}

export function setChatHistoryCache(next: CachedChatSummary[]): void {
  cache = next;
}

export function clearChatHistoryCache(): void {
  cache = undefined;
}
