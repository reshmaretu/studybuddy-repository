import { createClient } from '@supabase/supabase-js';

// 1. NO fallbacks. If Next.js can't find the keys, we want to know immediately.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 2. Strict Safety Check
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("CRITICAL: Missing NEXT_PUBLIC_SUPABASE environment variables! Check Vercel dashboard.");
}

// 3. Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);