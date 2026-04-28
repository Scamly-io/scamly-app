import {
  buildInitialChatRowPayload,
  needsInitialChatRowInsert,
} from "./chat-initial-row";

describe("needsInitialChatRowInsert", () => {
  it("returns true only when no DB row yet and conversation has no messages (first send)", () => {
    expect(needsInitialChatRowInsert({ chatRowPersistedInDb: false, messageCount: 0 })).toBe(true);
  });

  it("returns false when chat row already exists or was already inserted", () => {
    expect(needsInitialChatRowInsert({ chatRowPersistedInDb: true, messageCount: 0 })).toBe(false);
    expect(needsInitialChatRowInsert({ chatRowPersistedInDb: true, messageCount: 4 })).toBe(false);
  });

  it("returns false after the first messages are in memory (subsequent sends)", () => {
    expect(needsInitialChatRowInsert({ chatRowPersistedInDb: false, messageCount: 2 })).toBe(false);
  });
});

describe("buildInitialChatRowPayload", () => {
  it("builds chats row payload with id, user_id, last_message", () => {
    expect(
      buildInitialChatRowPayload({
        chatId: "550e8400-e29b-41d4-a716-446655440000",
        userId: "user-1",
        lastMessage: "Hello there",
      })
    ).toEqual({
      id: "550e8400-e29b-41d4-a716-446655440000",
      user_id: "user-1",
      last_message: "Hello there",
    });
  });
});
