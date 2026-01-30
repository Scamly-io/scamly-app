import { trackUserVisibleError } from '@/utils/analytics';
import { supabase } from '@/utils/supabase';
import { SearchResult } from '@/utils/types';

/**
 * Custom error class for search-related errors.
 * Allows distinguishing between different failure stages.
 */
export class SearchError extends Error {
    stage: 'subscription_check' | 'validation' | 'ai_response';
    
    constructor(message: string, stage: 'subscription_check' | 'validation' | 'ai_response') {
        super(message);
        this.name = 'SearchError';
        this.stage = stage;
    }
}

/**
 * Search result response type
 */
export interface SearchResponse {
    success: true;
    data: SearchResult;
    warning: string | null;
}

export async function search(companyName: string, userId: string): Promise<SearchResult> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const accessToken = session.access_token;

        const result = await fetch("https://rdrumcjwntyfnjhownbd.supabase.co/functions/v1/ai-search", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                action: "search",
                companyName,
                userId,
            })
        })

        if (!result.ok) {
            throw new SearchError("Error searching", "ai_response");
        }

        const response = await result.json();
        if (!response.success) {
            throw new SearchError(response.error.message, "ai_response");
        }
        
        console.log("response: ", response.data);
        return response.data as SearchResult;
    } catch (error) {
        if (error instanceof SearchError) {
            captureSearchError(error, "search_failed");
            trackUserVisibleError("search", "search_failed", true);
            throw error;
        }
        captureSearchError(error, "search_failed");
        trackUserVisibleError("search", "search_failed", true);
        throw new SearchError("Failed to search", "ai_response");
    }
}
