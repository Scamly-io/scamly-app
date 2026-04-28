/**
 * Chat Utility Module for Scamly
 *

 * body.action Enum: createConversationId, deleteConversationId, generateResponse, sendMessage (streaming)
 */

import { trackUserVisibleError } from "@/utils/analytics";
import { captureChatError } from "@/utils/sentry";
import { supabase } from "@/utils/supabase";

const AI_CHAT_FUNCTION = __DEV__ ? "ai-chat-dev" : "ai-chat";
console.log("AI_CHAT_FUNCTION", AI_CHAT_FUNCTION);

/**
 * Base URL for the Supabase `ai-chat` / `ai-chat-dev` edge function.
 * In development (`__DEV__`), uses the `ai-chat-dev` function.
 */
export function getAiChatEdgeFunctionUrl(): string {
  const base = process.env.EXPO_PUBLIC_SUPABASE_URL;
  if (!base) {
    throw new Error("EXPO_PUBLIC_SUPABASE_URL is not set");
  }
  return `${base.replace(/\/$/, "")}/functions/v1/${AI_CHAT_FUNCTION}`;
}

/**
 * Custom error class for chat-related errors.
 * Allows distinguishing between different failure stages.
 */
export class ChatError extends Error {
    stage: 'subscription_check' | 'db_read' | 'db_write' | 'ai_response' | 'create_conversation_id';
    
    constructor(message: string, stage: 'subscription_check' | 'db_read' | 'db_write' | 'ai_response' | 'create_conversation_id') {
        super(message);
        this.name = 'ChatError';
        this.stage = stage;
    }
}



export async function createConversationID(chatId: string): Promise<string> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session.access_token;

        const result =await fetch(getAiChatEdgeFunctionUrl(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                action: "createConversationId",
                chatId
            })
        })

        if (!result.ok) {
            throw new ChatError("Error creating conversation ID", "create_conversation_id");
        }

        const response = await result.json();
        if (!response.success) {
            throw new ChatError(response.error.message, "create_conversation_id");
        }

        // The data is the conversationId
        return response.data as string;
    } catch (error) {
        if (error instanceof ChatError) {
            captureChatError(error, "create_conversation_id");
            trackUserVisibleError("chat", "create_conversation_id_failed", true);
            throw error;
        }
        captureChatError(error, "create_conversation_id");
        trackUserVisibleError("chat", "create_conversation_id_failed", true);
        throw new ChatError("Failed to create conversation ID", "create_conversation_id");
    }
}

export async function deleteConversationId(chatId: string): Promise<void> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session.access_token;
    
        const result = await fetch(getAiChatEdgeFunctionUrl(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                action: "deleteConversationId",
                chatId
            })
        })
    
        if (!result.ok) {
            throw new ChatError("Error deleting conversation ID", "delete_conversation_id");
        }
    
        const response = await result.json();
        if (!response.success) {
            throw new ChatError(response.error.message, "delete_conversation_id");
        }
    
        return;
    } catch (error) {
        if (error instanceof ChatError) {
            captureChatError(error, "delete_conversation_id");
            trackUserVisibleError("chat", "delete_conversation_id_failed", true);
            throw error;
        }
        captureChatError(error, "delete_conversation_id");
        trackUserVisibleError("chat", "delete_conversation_id_failed", true);
        throw new ChatError("Failed to delete conversation ID", "delete_conversation_id");
    }
}

/**
 * Generates a response from the AI based on the user's message.
 * 
 * @param content {string} The user's message
 * @param chatId {string} The ID of the chat
 * @param conversationId {string} The ID of the conversation
 * @param userId {string} The ID of the user
 * @returns {string} The generated response from the AI
 */
export async function generateResponse(content: string, chatId: string, conversationId: string, userId: string): Promise<string> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session.access_token;

        const result = await fetch(getAiChatEdgeFunctionUrl(), {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                action: "generateResponse",
                content,
                chatId,
                conversationId,
                userId,
            })
        })
    
        if (!result.ok) {
            throw new ChatError("Error generating response", "ai_response");
        }
    
        const response = await result.json();
        if (!response.success) {
            throw new ChatError(response.error.message, "ai_response");
        }
    
        return response.data.response;
    } catch (error) {
        if (error instanceof ChatError) {
            captureChatError(error, "generate_response");
            trackUserVisibleError("chat", "generate_response_failed", true);
            throw error;
        }
        captureChatError(error, "generate_response");
        trackUserVisibleError("chat", "generate_response_failed", true);
        throw new ChatError("Failed to generate response", "ai_response");
    }
}