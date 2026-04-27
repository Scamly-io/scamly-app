import {
  clearChatHistoryCache,
  getChatHistoryCache,
  setChatHistoryCache,
  type CachedChatSummary,
} from "@/utils/chat-history-cache";

const sample: CachedChatSummary[] = [
  { id: "a", created_at: "2025-01-01T00:00:00Z" },
  { id: "b", created_at: "2025-01-02T00:00:00Z" },
];

describe("chat-history-cache", () => {
  beforeEach(() => {
    clearChatHistoryCache();
  });

  it("returns undefined when cache is empty", () => {
    expect(getChatHistoryCache()).toBeUndefined();
  });

  it("returns the same array reference after set", () => {
    setChatHistoryCache(sample);
    expect(getChatHistoryCache()).toBe(sample);
  });

  it("clears stored cache", () => {
    setChatHistoryCache(sample);
    clearChatHistoryCache();
    expect(getChatHistoryCache()).toBeUndefined();
  });
});
