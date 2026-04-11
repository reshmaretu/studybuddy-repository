import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req: Request) => {
    // 1. Handle Preflight immediately
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { code, userId } = await req.json()

        if (!userId || !code) {
            throw new Error("Missing credentials in the neural relay.")
        }

        // 2. Database verification
        const { data, error } = await supabaseAdmin
            .from('recovery_codes')
            .select('*')
            .eq('user_id', userId)
            .eq('code', code)
            .single()

        if (error || !data) {
            throw new Error("Neural match failed. Incorrect or expired code.")
        }

        // 3. Success Logic
        const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update({ is_verified: true })
            .eq('id', userId)

        if (updateError) throw updateError

        // 4. Cleanup
        await supabaseAdmin.from('recovery_codes').delete().eq('id', data.id)

        return new Response(JSON.stringify({ success: true }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200
        })

    } catch (err: any) {
        console.error("Verification Error:", err.message)
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 400,
            // Ensure headers are sent even on failure to prevent CORS blocks
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
    }
})