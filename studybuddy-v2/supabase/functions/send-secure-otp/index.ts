import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Fallback logic for keys: checks both prefixed and non-prefixed versions
const getEnv = (name: string) => Deno.env.get(name) || Deno.env.get(`NEXT_PUBLIC_${name}`) || ''

const supabaseAdmin = createClient(
    getEnv('SUPABASE_URL'),
    getEnv('SUPABASE_SERVICE_ROLE_KEY')
)

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const { email, userId, action, type } = await req.json()

        // --- ACTION: SEND VERIFICATION OTP ---
        if (action === 'send_otp') {
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString()
            const { error: dbError } = await supabaseAdmin
                .from('recovery_codes')
                .upsert({ user_id: userId, code: otpCode, type: type || 'verify' })

            if (dbError) throw dbError

            const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: Deno.env.get('EMAILJS_SERVICE_ID'),
                    template_id: Deno.env.get('EMAILJS_OTP_TEMPLATE_ID'),
                    user_id: Deno.env.get('EMAILJS_PUBLIC_KEY'),
                    template_params: { to_email: email, otp_code: otpCode },
                }),
            })

            if (!emailResponse.ok) throw new Error(await emailResponse.text())
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
        }

        // --- ACTION: SEND PASSWORD RESET ---
        if (action === 'reset_password') {
            const { data, error } = await supabaseAdmin.auth.admin.generateLink({
                type: 'recovery',
                email: email,
                options: { redirectTo: 'https://studybuddy-repository.vercel.app/reset-password' }
            })

            if (error) throw error

            const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: Deno.env.get('EMAILJS_SERVICE_ID'),
                    template_id: Deno.env.get('EMAILJS_RESET_TEMPLATE_ID'),
                    user_id: Deno.env.get('EMAILJS_PUBLIC_KEY'),
                    template_params: { to_email: email, reset_link: data.properties.action_link },
                }),
            })

            if (!emailResponse.ok) throw new Error(await emailResponse.text())
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
        }

    } catch (err: any) {
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 401,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
    }
})