import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Initialize the Admin client with the Service Role Key
const supabaseAdmin = createClient(
    Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
    const { code, type, newEmail, userId } = await req.json()

    // 1. Check the code against your 'recovery_codes' table (Server-side)
    const { data: validCode } = await supabaseAdmin
        .from('recovery_codes')
        .select()
        .eq('user_id', userId)
        .eq('code', code)
        .single()

    if (!validCode) return new Response("Unauthorized", { status: 401 })

    // 2. Perform the sensitive action
    if (type === 'email') {
        // Securely update the email via Admin API
        await supabaseAdmin.auth.admin.updateUserById(userId, { email: newEmail })
    } else if (type === 'verify') {
        // Securely update verification status
        await supabaseAdmin.from('profiles').update({ is_verified: true }).eq('id', userId)
    }

    return new Response(JSON.stringify({ success: true }), { status: 200 })
})