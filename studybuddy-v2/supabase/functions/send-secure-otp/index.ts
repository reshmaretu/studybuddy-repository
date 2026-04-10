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
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {
        const body = await req.json()

        // Fix: Explicitly define userEmail so the rest of the code can find it
        const userEmail = body.userEmail || body.email
        const { userId, action } = body

        if (!userEmail) throw new Error("userEmail missing in payload")

        if (action === 'send_otp') {
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

            // Database logic (Silently fails so email still sends)
            try {
                await supabaseAdmin.from('recovery_codes').upsert({
                    user_id: userId,
                    code: otpCode,
                    type: 'verify'
                })
            } catch (dbErr) {
                console.error("DB Save failed:", dbErr)
            }

            const emailParams = {
                service_id: Deno.env.get('EMAILJS_SERVICE_ID'),
                template_id: Deno.env.get('EMAILJS_OTP_TEMPLATE_ID'),
                user_id: Deno.env.get('EMAILJS_PUBLIC_KEY'),
                accessToken: Deno.env.get('EMAILJS_PRIVATE_KEY'),
                template_params: {
                    email: userEmail, // Uses the variable we defined above
                    otp_code: otpCode
                },
            }

            console.log("Attempting send to:", userEmail)

            const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(emailParams),
            })

            const responseText = await emailResponse.text()
            if (!emailResponse.ok) throw new Error(`EmailJS Error: ${responseText}`)

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            })
        }

        // Handle reset_password action similarly if needed...

    } catch (err: any) {
        console.error("Crash Log:", err.message)
        return new Response(JSON.stringify({ success: false, error: err.message }), {
            status: 500,
            headers: corsHeaders
        })
    }
})