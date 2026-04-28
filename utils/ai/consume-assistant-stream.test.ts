import { streamAssistantMessage } from "./consume-assistant-stream";

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
      onConversationId: (id) => { conversationId = id; },
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
