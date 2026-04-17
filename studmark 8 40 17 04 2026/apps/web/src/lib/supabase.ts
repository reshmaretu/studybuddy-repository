import { createClient } from '@supabase/supabase-js';

// 1. NO fallbacks. If Next.js can't find the keys, we want to know immediately.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 2. Strict Safety Check
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("CRITICAL: Missing NEXT_PUBLIC_SUPABASE environment variables! Check Vercel dashboard.");
}

// 3. Create a browser singleton to avoid multiple GoTrueClient instances
const createSupabaseClient = () => createClient(supabaseUrl, supabaseAnonKey);

type SupabaseClientType = ReturnType<typeof createSupabaseClient>;

const globalForSupabase = globalThis as typeof globalThis & {
    __studybuddy_supabase__?: SupabaseClientType;
};

export const supabase =
    globalForSupabase.__studybuddy_supabase__ ?? createSupabaseClient();

if (typeof window !== 'undefined') {
    globalForSupabase.__studybuddy_supabase__ = supabase;
}