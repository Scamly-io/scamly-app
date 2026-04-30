/**
 * Stream the assistant response token-by-token in React Native using XHR + SSE.
 *
 * Why XHR instead of `fetch`?
 *   React Native (Hermes / RN 0.83) does not expose `Response.body` as a ReadableStream.
 *   `fetch` buffers the entire response; `response.body` is null. XHR.onprogress is the
 *   only first-class incremental API on both iOS and Android.
 *
 * Why SSE (`text/event-stream`) instead of raw text?
 *   Supabase Edge Functions run on Deno Deploy behind Cloudflare. Cloudflare buffers
 *   `text/plain` chunked responses and delivers them all at once when the stream closes.
 *   `text/event-stream` is explicitly not buffered by Cloudflare — each `data:` frame is
 *   forwarded immediately.
 *
 * Wire contract (must match `supabase/functions/ai-chat[-dev]/index.ts`):
 *   `sendMessage` body may include `imageUrls` and `imageIds` (string[] storage filenames for `messages.image_id`).
 *   Content-Type: text/event-stream
 *   Each token delta → `data: ${JSON.stringify(delta)}\n\n`
 *   X-Conversation-Id exposed via Access-Control-Expose-Headers
 */

export type StreamAssistantMessageArgs = {
  url: string;
  token: string;
  body: Record<string, unknown>;
  onChunk: (chunk: string) => void;
  onConversationId?: (id: string) => void;
  signal?: AbortSignal;
};

export function streamAssistantMessage({
  url,
  token,
  body,
  onChunk,
  onConversationId,
  signal,
}: StreamAssistantMessageArgs): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    // Intentionally no xhr.responseType — the default "" gives progressive text in RN.

    let lastIndex = 0;
    let sseBuffer = "";
    let conversationIdSent = false;
    let abortListener: (() => void) | null = null;

    const cleanupSignal = () => {
      if (signal && abortListener) {
        signal.removeEventListener("abort", abortListener);
        abortListener = null;
      }
    };

    const tryEmitConversationId = () => {
      if (conversationIdSent || !onConversationId) return;
      const id =
        xhr.getResponseHeader("X-Conversation-Id") ??
        xhr.getResponseHeader("x-conversation-id");
      if (id) {
        conversationIdSent = true;
        onConversationId(id);
      }
    };

    const parseSseBuffer = () => {
      let boundary = sseBuffer.indexOf("\n\n");
      while (boundary !== -1) {
        const event = sseBuffer.slice(0, boundary);
        sseBuffer = sseBuffer.slice(boundary + 2);
        boundary = sseBuffer.indexOf("\n\n");

        for (const line of event.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const delta = JSON.parse(payload) as string;
            if (delta) onChunk(delta);
          } catch {
            onChunk(payload);
          }
        }
      }
    };

    const drainNewText = () => {
      if (xhr.status < 200 || xhr.status >= 300) return;
      const text = xhr.responseText ?? "";
      if (text.length <= lastIndex) return;
      sseBuffer += text.slice(lastIndex);
      lastIndex = text.length;
      parseSseBuffer();
    };

    xhr.onreadystatechange = () => {
      if (xhr.readyState === XMLHttpRequest.HEADERS_RECEIVED) {
        tryEmitConversationId();
      }
    };

    xhr.onprogress = () => {
      tryEmitConversationId();
      drainNewText();
    };

    xhr.onload = () => {
      tryEmitConversationId();
      if (xhr.status < 200 || xhr.status >= 300) {
        cleanupSignal();
        reject(new Error(xhr.responseText || `Request failed (${xhr.status})`));
        return;
      }
      drainNewText();
      // Flush any partial SSE line that arrived without a trailing \n\n
      if (sseBuffer.trim()) {
        for (const line of sseBuffer.split("\n")) {
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          try {
            const delta = JSON.parse(payload) as string;
            if (delta) onChunk(delta);
          } catch {
            onChunk(payload);
          }
        }
      }
      cleanupSignal();
      resolve();
    };

    xhr.onerror = () => {
      cleanupSignal();
      reject(new Error("Network request failed"));
    };
    xhr.ontimeout = () => {
      cleanupSignal();
      reject(new Error("Request timed out"));
    };
    xhr.onabort = () => {
      cleanupSignal();
      reject(new DOMException("Aborted", "AbortError"));
    };

    if (signal) {
      if (signal.aborted) {
        try { xhr.abort(); } catch { /* noop */ }
        reject(new DOMException("Aborted", "AbortError"));
        return;
      }
      abortListener = () => { try { xhr.abort(); } catch { /* noop */ } };
      signal.addEventListener("abort", abortListener);
    }

    xhr.send(JSON.stringify(body));
  });
}
