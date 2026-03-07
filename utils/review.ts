/*
import * as StoreReview from 'expo-store-review';
import { supabase } from './supabase';

export async function promptReview() {
    const { user } = useAuth();
    if (!user) return;

    if (await StoreReview.hasAction()) {
        const { count: scanCount } = await supabase
            .from('scans')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id)

        if (scanCount >= 5) {
            StoreReview.requestReview();
        }
    }
}
    */
