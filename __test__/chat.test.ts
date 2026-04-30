import fs from "node:fs";
import path from "node:path";

import { useChatStore } from "@/store/chatStore";
import {
  clearChatHistoryCache,
  getChatHistoryCache,
  setChatHistoryCache,
  type CachedChatSummary,
} from "@/utils/chat/chat-history-cache";
import {
  buildChatImageStoragePath,
  chatImageSignedUrlExpirySeconds,
  joinImageIdCsv,
  normalizePickerBase64,
  parseImageIdCsv,
} from "@/utils/chat/chat-images";
import { buildInitialChatRowPayload, needsInitialChatRowInsert } from "@/utils/chat/chat-initial-row";
import { streamAssistantMessage } from "@/utils/ai/consume-assistant-stream";

describe("chat-images", () => {
  describe("normalizePickerBase64", () => {
    it("returns null for empty input", () => {
      expect(normalizePickerBase64(null)).toBeNull();
      expect(normalizePickerBase64(undefined)).toBeNull();
      expect(normalizePickerBase64("")).toBeNull();
      expect(normalizePickerBase64("   ")).toBeNull();
    });

    it("strips data URL prefix when present", () => {
      expect(normalizePickerBase64("data:image/png;base64,ABCxyz+/=")).toBe("ABCxyz+/=");
    });

    it("returns trimmed raw payload when no data URL prefix", () => {
      expect(normalizePickerBase64("  SGVsbG8=  ")).toBe("SGVsbG8=");
    });
  });

  describe("parseImageIdCsv", () => {
    it("returns empty array for null, undefined, and empty string", () => {
      expect(parseImageIdCsv(null)).toEqual([]);
      expect(parseImageIdCsv(undefined)).toEqual([]);
      expect(parseImageIdCsv("")).toEqual([]);
      expect(parseImageIdCsv("   ")).toEqual([]);
    });

    it("splits comma-separated filenames and trims whitespace", () => {
      expect(parseImageIdCsv("a.jpg,b.png")).toEqual(["a.jpg", "b.png"]);
      expect(parseImageIdCsv(" a.jpg , b.png ")).toEqual(["a.jpg", "b.png"]);
    });

    it("accepts string[] from jsonb image_id", () => {
      expect(parseImageIdCsv(["a.jpg", " b.png "])).toEqual(["a.jpg", "b.png"]);
      expect(parseImageIdCsv(["x.jpg,y.jpg"])).toEqual(["x.jpg", "y.jpg"]);
    });

    it("returns empty for non-string non-array values", () => {
      expect(parseImageIdCsv(42)).toEqual([]);
      expect(parseImageIdCsv({})).toEqual([]);
      expect(parseImageIdCsv(true)).toEqual([]);
    });
  });

  describe("joinImageIdCsv", () => {
    it("joins non-empty entries with commas", () => {
      expect(joinImageIdCsv(["x", "y"])).toBe("x,y");
    });

    it("returns empty string for empty input", () => {
      expect(joinImageIdCsv([])).toBe("");
    });
  });

  describe("buildChatImageStoragePath", () => {
    it("uses userId and filename only (no extra slash)", () => {
      expect(buildChatImageStoragePath("user-1", "f9c2.jpg")).toBe("user-1/f9c2.jpg");
    });
  });

  describe("chatImageSignedUrlExpirySeconds", () => {
    it("is 24 hours", () => {
      expect(chatImageSignedUrlExpirySeconds()).toBe(86_400);
    });
  });
});

describe("chat-history-cache", () => {
  const sample: CachedChatSummary[] = [
    { id: "a", created_at: "2025-01-01T00:00:00Z" },
    { id: "b", created_at: "2025-01-02T00:00:00Z" },
  ];

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

describe("chat-initial-row", () => {
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
});

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

describe("chat premium upsell cta layout", () => {
  it("uses centered button styling instead of full-width paywall cta", () => {
    const sourcePath = path.join(process.cwd(), "app/(tabs)/chat/_components/chat-interface.tsx");
    const source = fs.readFileSync(sourcePath, "utf8");

    expect(source).toContain("Unlock AI Scam Chat");
    expect(source).not.toContain("fullWidth");
    expect(source).toContain("style={styles.paywallButton}");
  });
});

type Listener = () => void;

class MockXHR {
  static HEADERS_RECEIVED = 2 as const;
  static instances: MockXHR[] = [];

  readyState = 0;
  status = 0;
  responseText = "";
  responseType: XMLHttpRequestResponseType = "";

  onreadystatechange: Listener | null = null;
  onprogress: Listener | null = null;
  onload: Listener | null = null;
  onerror: Listener | null = null;
  ontimeout: Listener | null = null;
  onabort: Listener | null = null;

  private _headers: Record<string, string> = {};
  public sentBody: string | null = null;
  public requestHeaders: Record<string, string> = {};
  public method: string | null = null;
  public url: string | null = null;

  constructor() {
    MockXHR.instances.push(this);
  }

  open(method: string, url: string) {
    this.method = method;
    this.url = url;
  }
  setRequestHeader(k: string, v: string) {
    this.requestHeaders[k] = v;
  }
  send(body: string) {
    this.sentBody = body;
  }
  abort() {
    this.onabort?.();
  }

  getResponseHeader(name: string): string | null {
    const lower = name.toLowerCase();
    for (const k of Object.keys(this._headers)) {
      if (k.toLowerCase() === lower) return this._headers[k];
    }
    return null;
  }

  emitHeaders(status: number, headers: Record<string, string>) {
    this.status = status;
    this._headers = headers;
    this.readyState = MockXHR.HEADERS_RECEIVED;
    this.onreadystatechange?.();
  }

  /** Push an SSE-framed chunk (simulates onprogress firing as bytes arrive). */
  emitSseChunk(delta: string) {
    this.responseText += `data: ${JSON.stringify(delta)}\n\n`;
    this.onprogress?.();
  }

  emitDone() {
    this.onload?.();
  }
}

describe("streamAssistantMessage — SSE wire format", () => {
  let originalXHR: typeof XMLHttpRequest;

  beforeEach(() => {
    MockXHR.instances = [];
    originalXHR = (global as unknown as { XMLHttpRequest: typeof XMLHttpRequest }).XMLHttpRequest;
    (global as unknown as { XMLHttpRequest: unknown }).XMLHttpRequest = MockXHR;
  });

  afterEach(() => {
    (global as unknown as { XMLHttpRequest: typeof XMLHttpRequest }).XMLHttpRequest = originalXHR;
  });

  it("parses SSE data frames and emits one chunk per frame", async () => {
    const chunks: string[] = [];
    let conversationId: string | null = null;

    const promise = streamAssistantMessage({
      url: "https://example.test/functions/v1/ai-chat-dev",
      token: "tok",
      body: { action: "sendMessage" },
      onChunk: (c) => chunks.push(c),
      onConversationId: (id) => {
        conversationId = id;
      },
    });

    const xhr = MockXHR.instances[0];
    expect(xhr.requestHeaders.Authorization).toBe("Bearer tok");
    expect(xhr.requestHeaders["Content-Type"]).toBe("application/json");
    // responseType should NOT be set so RN uses progressive text mode
    expect(xhr.responseType).toBe("");

    xhr.emitHeaders(200, { "Content-Type": "text/event-stream", "X-Conversation-Id": "conv_abc" });
    xhr.emitSseChunk("Hello");
    xhr.emitSseChunk(" world");
    xhr.emitSseChunk("!");
    xhr.emitDone();

    await promise;

    expect(chunks).toEqual(["Hello", " world", "!"]);
    expect(conversationId).toBe("conv_abc");
  });

  it("handles token deltas that contain newlines (JSON-escaped in SSE frame)", async () => {
    const chunks: string[] = [];

    const promise = streamAssistantMessage({
      url: "https://example.test",
      token: "tok",
      body: {},
      onChunk: (c) => chunks.push(c),
    });

    const xhr = MockXHR.instances[0];
    xhr.emitHeaders(200, {});
    xhr.emitSseChunk("line1\nline2");
    xhr.emitDone();

    await promise;

    expect(chunks.join("")).toBe("line1\nline2");
  });

  it("handles multiple SSE frames arriving in a single onprogress call (batched delivery)", async () => {
    const chunks: string[] = [];

    const promise = streamAssistantMessage({
      url: "https://example.test",
      token: "tok",
      body: {},
      onChunk: (c) => chunks.push(c),
    });

    const xhr = MockXHR.instances[0];
    xhr.emitHeaders(200, {});
    // Simulate Cloudflare delivering two frames in one TCP segment
    xhr.responseText = `data: ${JSON.stringify("Hello")}\n\ndata: ${JSON.stringify(" world")}\n\n`;
    xhr.onprogress?.();
    xhr.emitDone();

    await promise;

    expect(chunks).toEqual(["Hello", " world"]);
  });

  it("rejects with error body when status is not 2xx", async () => {
    const promise = streamAssistantMessage({
      url: "https://example.test",
      token: "tok",
      body: {},
      onChunk: () => {},
    });

    const xhr = MockXHR.instances[0];
    xhr.emitHeaders(403, {});
    xhr.responseText = '{"error":"forbidden"}';
    xhr.emitDone();

    await expect(promise).rejects.toThrow("forbidden");
  });

  it("aborts XHR and rejects when AbortSignal fires", async () => {
    const controller = new AbortController();

    const promise = streamAssistantMessage({
      url: "https://example.test",
      token: "tok",
      body: {},
      onChunk: () => {},
      signal: controller.signal,
    });

    controller.abort();

    await expect(promise).rejects.toThrow("Aborted");
  });
});

