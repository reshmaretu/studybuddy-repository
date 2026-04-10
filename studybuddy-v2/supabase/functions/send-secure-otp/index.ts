import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
    // 2. Handle the Preflight (OPTIONS) request
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

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

            if (!emailResponse.ok) throw new Error("EmailJS OTP Relay Failed")

            // 3. Add headers to your success response
            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            })
        }

        // --- ACTION: SEND PASSWORD RESET ---
        if (action === 'reset_password') {
            const { data, error } = await supabaseAdmin.auth.admin.generateLink({
                type: 'recovery',
                email: email,
                options: { redirectTo: 'https://studybuddy-v2.vercel.app/reset-password' }
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

            if (!emailResponse.ok) throw new Error("EmailJS Reset Relay Failed")

            return new Response(JSON.stringify({ success: true }), {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            })
        }

    } catch (err: any) {
        // 3. Add headers to your error response
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
    }
})