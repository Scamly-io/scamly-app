import { create } from "zustand";

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

export interface ChatStore {
  activeConversationId: string | null;
  messages: Message[];
  isStreaming: boolean;
  setConversationId: (id: string | null) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (msg: Message) => void;
  appendToLastMessage: (chunk: string) => void;
  completeLastAssistantMessage: () => void;
  failLastAssistant: (errorText: string) => void;
  clearMessages: () => void;
  setStreaming: (val: boolean) => void;
  resetSession: () => void;
}

export const useChatStore = create<ChatStore>((set, get) => ({
  activeConversationId: null,
  messages: [],
  isStreaming: false,

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

  clearMessages: () => set({ messages: [] }),

  setStreaming: (val) => set({ isStreaming: val }),

  resetSession: () =>
    set({
      activeConversationId: null,
      messages: [],
      isStreaming: false,
    }),
}));
