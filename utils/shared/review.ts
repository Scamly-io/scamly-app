import * as StoreReview from 'expo-store-review';
import { captureError } from './sentry';
import { supabase } from './supabase';

export async function promptReview(userId: string) {
    if (!userId) return;

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('review_prompted')
        .eq('id', userId)
        .single();

    if (profile?.review_prompted || profileError) return;

    if (await StoreReview.hasAction()) {
        const { count: scanCount } = await supabase
            .from('scans')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)

        if (scanCount >= 5) {
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ review_prompted: true })
                .eq('id', userId)

            if (updateError) {
                captureError(updateError, {
                    feature: 'review',
                    action: 'prompt_review',
                    severity: 'error',
                })
                // Do not prompt the review if the update fails - this will cause an infinite loop
                return;
            }

            StoreReview.requestReview();
        }
    }
    return;
}
