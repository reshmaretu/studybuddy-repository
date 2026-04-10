import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        // Safety check for empty body
        const rawBody = await req.text();
        if (!rawBody) throw new Error("Request body is empty");

        const body = JSON.parse(rawBody);
        const userEmail = body.userEmail || body.email; // Catch both naming styles
        const { userId, action, type } = body;

        if (!userEmail) throw new Error("Recipient email is missing from the payload");

        if (action === 'send_otp') {
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

            // 1. Save to DB (This will work now that you created the table)
            const { error: dbError } = await supabaseAdmin
                .from('recovery_codes')
                .upsert({
                    user_id: userId,
                    code: otpCode,
                    type: 'verify'
                })

            if (dbError) console.error("DB Error:", dbError.message)
            // We don't 'throw' here so the email still sends even if DB fails during testing

            // 2. Send via EmailJS
            const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: Deno.env.get('EMAILJS_SERVICE_ID'),
                    template_id: Deno.env.get('EMAILJS_OTP_TEMPLATE_ID'),
                    user_id: Deno.env.get('EMAILJS_PUBLIC_KEY'),
                    template_params: {
                        email: userEmail,
                        otp_code: otpCode // Matches your {{otp_code}} exactly
                    },
                }),
            })

            const resText = await emailResponse.text()
            if (!emailResponse.ok) throw new Error(`EmailJS: ${resText}`)

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            })
        }
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: corsHeaders
        })
    }
})