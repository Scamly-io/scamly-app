import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

const supabaseUrl = 'https://rdrumcjwntyfnjhownbd.supabase.co';
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkcnVtY2p3bnR5Zm5qaG93bmJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2OTU3MzEsImV4cCI6MjA2MjI3MTczMX0.axhI-Icvl60tN1oYeyJ70z_6dgz1bdFTpLKW_NGTN_M";

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
