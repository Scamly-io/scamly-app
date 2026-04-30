import { create } from "zustand";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
  /** Storage filenames under `chat-images` (CSV string or JSON array from DB). */
  imageId?: string | string[] | null;
  /** Ephemeral signed URLs for rendering; re-generated on hydrate when missing. */
  imageUrls?: string[];
}

export interface ChatStore {
  activeConversationId: string | null;
  messages: Message[];
  isStreaming: boolean;
  /** True once `chats` row exists for this thread (hydrated from DB or inserted before first edge send). */
  chatRowPersistedInDb: boolean;
  setConversationId: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (msg: Message) => void;
  appendToLastMessage: (chunk: string) => void;
  completeLastAssistantMessage: () => void;
  failLastAssistant: (errorText: string) => void;
  patchMessage: (id: string, patch: Partial<Message>) => void;
  clearMessages: () => void;
  setStreaming: (val: boolean) => void;
  setChatRowPersistedInDb: (value: boolean) => void;
  resetSession: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  activeConversationId: null,
  messages: [],
  isStreaming: false,
  chatRowPersistedInDb: false,

  setConversationId: (id) => set({ activeConversationId: id }),

  setMessages: (messages) => set({ messages }),

  addMessage: (msg) => set({ messages: [...get().messages, msg] }),

  appendToLastMessage: (chunk) =>
    set((state) => {
      const msgs = [...state.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "assistant") {
          msgs[i] = { ...msgs[i], content: msgs[i].content + chunk };
          break;
        }
      }
      return { messages: msgs };
    }),

  completeLastAssistantMessage: () =>
    set((state) => {
      const msgs = [...state.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "assistant") {
          msgs[i] = { ...msgs[i], streaming: false };
          break;
        }
      }
      return { messages: msgs, isStreaming: false };
    }),

  failLastAssistant: (errorText) =>
    set((state) => {
      const msgs = [...state.messages];
      for (let i = msgs.length - 1; i >= 0; i--) {
        if (msgs[i].role === "assistant") {
          msgs[i] = { ...msgs[i], content: errorText, streaming: false };
          break;
        }
      }
      return { messages: msgs, isStreaming: false };
    }),

  patchMessage: (id, patch) =>
    set((state) => {
      const idx = state.messages.findIndex((m) => m.id === id);
      if (idx === -1) return state;
      const msgs = [...state.messages];
      msgs[idx] = { ...msgs[idx], ...patch };
      return { messages: msgs };
    }),

  clearMessages: () => set({ messages: [] }),

  setStreaming: (val) => set({ isStreaming: val }),

  setChatRowPersistedInDb: (value) => set({ chatRowPersistedInDb: value }),

  resetSession: () =>
    set({
      activeConversationId: null,
      messages: [],
      isStreaming: false,
      chatRowPersistedInDb: false,
    }),
}));
