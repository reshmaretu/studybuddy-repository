import { createClient } from '@supabase/supabase-js';

// 1. Grab the environment variables we set in .env.local
// The '!' tells TypeScript that we guarantee these variables exist.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// 2. Safety Check: Warn us if the keys are missing
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️ Missing Supabase Environment Variables. Check your .env.local file.');
}

// 3. Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);