import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req: Request) => {
    // Handle CORS pre-flight
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { code, userId } = await req.json()

        // 1. Check the database for a matching code
        const { data, error } = await supabaseAdmin
            .from('recovery_codes')
            .select('*')
            .eq('user_id', userId)
            .eq('code', code)
            .single()

        if (error || !data) {
            throw new Error("Neural match failed. The code is incorrect or has expired.")
        }

        // 2. Success! Update the user profile
        await supabaseAdmin
            .from('profiles')
            .update({ is_verified: true })
            .eq('id', userId)

        // 3. Cleanup: Remove the used code
        await supabaseAdmin.from('recovery_codes').delete().eq('id', data.id)

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })

    } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 400,
            headers: corsHeaders
        })
    }
})