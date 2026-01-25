import { trackUserVisibleError } from '@/utils/analytics';
import { captureDataFetchError, captureError } from '@/utils/sentry';
import { supabase } from '@/utils/supabase';
import { SearchResult } from '@/utils/types';
import Perplexity from '@perplexity-ai/perplexity_ai';

const client = new Perplexity({
    apiKey: process.env.EXPO_PUBLIC_PERPLEXITY_API_KEY,
});

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
 * Generate the search prompt for a given company name.
 */
function getSearchPrompt(companyName: string): string {
    return `
      Search specifically for "${companyName} contact information", "${companyName} phone number", and "${companyName} contact us".

      You MUST prioritise the company's official website and pages with URLs containing:
      - /contact
      - /contact-us
      - /support
      - /help
      - /about

      Do NOT rely on Wikipedia, Crunchbase, or legal/company profile pages for phone numbers.
      Those sources may only be used to confirm the official company name or website domain.

      From the official website, extract the following:
      - Official company name
      - General enquiries phone number
      - International enquiries phone number
      - Official website domain (domain only, no protocol or paths, e.g "apple.com", not "www.apple.com" or "https://apple.com")
      - Contact us page (domain + path only, e.g. "example.com/contact")

      Rules:
      - Only use information found on the company's official website
      - Do not guess, infer, or fabricate phone numbers
      - If a field cannot be found, set it to "0"
      - Return JSON only, matching the provided schema
      - Always include found_all_fields. False if any of "company_name", "local_phone_number", "international_phone_number", or "contact_us_page" is set to "0", otherwise True
      - Always include missing_fields. List of keys if any of "company_name", "local_phone_number", "international_phone_number", or "contact_us_page" are set to "0", otherwise return an empty array`;
}

/**
 * Search result response type
 */
export interface SearchResponse {
    success: true;
    data: SearchResult;
    warning: string | null;
}

export async function search(companyName: string, userId: string): Promise<SearchResponse> {
    // Check if the user is on a free plan
    try {
        const { data: profile, error: profileError } = await supabase
            .from("profiles")
            .select("subscription_plan")
            .eq("id", userId)
            .single();

        if (profileError || !profile) {
            captureDataFetchError(profileError || new Error("No profile found"), "info_search", "get_profile", "critical");
            trackUserVisibleError("info_search", "profile_fetch_failed", true);
            throw new SearchError("Error fetching user profile for search", "subscription_check");
        }

        if (profile.subscription_plan === "free") {
            trackUserVisibleError("info_search", "free_user_blocked", false);
            throw new SearchError("Free users cannot use the search feature", "subscription_check");
        }
    } catch (error) {
        if (error instanceof SearchError) {
            throw error;
        }
        captureError(error, { feature: "info_search", action: "subscription_check", severity: "critical" });
        trackUserVisibleError("info_search", "subscription_check_failed", true);
        throw new SearchError("Error checking subscription", "subscription_check");
    }

    // Validate input
    if (!companyName || typeof companyName !== "string" || !companyName.trim()) {
        trackUserVisibleError("info_search", "invalid_input", true);
        throw new SearchError("Company name is required", "validation");
    }

    // Perform the search
    try {
        const prompt = getSearchPrompt(companyName);

        const completion = await client.chat.completions.create({
            model: 'sonar',
            messages: [{ role: 'user', content: prompt }],
            response_format: {
                type: 'json_schema',
                json_schema: {
                    schema: {
                        type: 'object',
                        properties: {
                            company_name: { type: 'string' },
                            local_phone_number: { type: 'string' },
                            international_phone_number: { type: 'string' },
                            website_domain: { type: 'string' },
                            contact_us_page: { type: 'string' },
                            found_all_fields: { type: 'boolean' },
                            missing_fields: { type: 'array', items: { type: 'string' } },
                        },
                        required: [
                            'company_name',
                            'local_phone_number',
                            'international_phone_number',
                            'website_domain',
                            'contact_us_page',
                            'found_all_fields',
                            'missing_fields',
                        ],
                    },
                },
            },
        });

        const messageContent = completion?.choices[0]?.message?.content;

        if (!messageContent) {
            throw new SearchError("No response from Perplexity", "ai_response");
        }

        // Remove any thinking content from the response
        const output = messageContent.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

        // Ensure the output is valid JSON
        let result: SearchResult;
        try {
            result = JSON.parse(output);
        } catch {
            throw new SearchError("Invalid JSON response from Perplexity", "ai_response");
        }

        return {
            success: true,
            data: result,
            warning: result.found_all_fields ? null : "Some information could not be found, missing fields set to 0",
        };
    } catch (error) {
        if (error instanceof SearchError) {
            captureError(error, { feature: "info_search", action: "search_company", severity: "critical", extra: { companyName } });
            trackUserVisibleError("info_search", "search_failed", true);
            throw error;
        }
        captureError(error, { feature: "info_search", action: "search_company", severity: "critical", extra: { companyName } });
        trackUserVisibleError("info_search", "search_failed", true);
        throw new SearchError("Failed to search for company information", "ai_response");
    }
}
