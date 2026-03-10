import { createClient } from '@supabase/supabase-js';

// 1. Grab the environment variables, but provide a dummy fallback for Next.js build time
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL! || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! || 'placeholder';

// 2. Safety Check: Warn us in the console if the real keys are missing
if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Missing Supabase environment variables! Check your .env file or Vercel dashboard.");
}

// 3. Create and export the Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey);