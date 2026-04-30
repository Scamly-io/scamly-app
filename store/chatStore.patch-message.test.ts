import { useChatStore } from "./chatStore";

describe("useChatStore patchMessage", () => {
  beforeEach(() => {
    useChatStore.getState().resetSession();
  });

  it("merges fields into an existing message by id", () => {
    useChatStore.getState().addMessage({
      id: "m1",
      role: "user",
      content: "hi",
      imageId: "a.jpg,b.jpg",
    });
    useChatStore.getState().patchMessage("m1", { imageUrls: ["https://x/a", "https://x/b"] });
    const m = useChatStore.getState().messages[0];
    expect(m.content).toBe("hi");
    expect(m.imageId).toBe("a.jpg,b.jpg");
    expect(m.imageUrls).toEqual(["https://x/a", "https://x/b"]);
  });

  it("no-ops when id is missing", () => {
    useChatStore.getState().addMessage({ id: "m1", role: "user", content: "hi" });
    useChatStore.getState().patchMessage("missing", { imageUrls: ["x"] });
    expect(useChatStore.getState().messages[0].imageUrls).toBeUndefined();
  });
});
