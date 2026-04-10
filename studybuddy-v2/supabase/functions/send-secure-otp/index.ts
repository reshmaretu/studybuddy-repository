import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 1. Setup CORS for your Vercel frontend
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-requested-with',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// 2. Initialize the Admin Client
// Supabase automatically provides these two env vars to all functions.
// We use these to bypass RLS and save the OTP to the database.
const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

Deno.serve(async (req: Request) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const body = await req.json()

        // Flexible variable mapping to prevent 422 errors
        const email = body.userEmail || body.email
        const { userId, action, type } = body

        if (!email) {
            throw new Error("Recipient email is missing from the request body")
        }

        // --- ACTION: SEND VERIFICATION OTP ---
        if (action === 'send_otp') {
            const otpCode = Math.floor(100000 + Math.random() * 900000).toString()

            console.log(`Generating OTP for ${email}`)

            // Save OTP to your database
            const { error: dbError } = await supabaseAdmin
                .from('recovery_codes')
                .upsert({
                    user_id: userId,
                    code: otpCode,
                    type: type || 'verify'
                })

            if (dbError) throw new Error(`Database Error: ${dbError.message}`)

            // Call EmailJS API
            const emailResponse = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    service_id: Deno.env.get('EMAILJS_SERVICE_ID'),
                    template_id: Deno.env.get('EMAILJS_OTP_TEMPLATE_ID'),
                    user_id: Deno.env.get('EMAILJS_PUBLIC_KEY'),
                    template_params: {
                        email: email,
                        otp_code: otpCode
                    },
                }),
            })

            if (!emailResponse.ok) {
                const errorText = await emailResponse.text()
                throw new Error(`EmailJS Error: ${errorText}`)
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            })
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
                    template_params: {
                        email: email,
                        reset_link: data.properties.action_link
                    },
                }),
            })

            if (!emailResponse.ok) {
                const errorText = await emailResponse.text()
                throw new Error(`EmailJS Error: ${errorText}`)
            }

            return new Response(JSON.stringify({ success: true }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            })
        }

        return new Response(JSON.stringify({ error: "Invalid action" }), {
            status: 400,
            headers: corsHeaders
        })

    } catch (err: any) {
        console.error("Function Error:", err.message)
        return new Response(JSON.stringify({
            success: false,
            error: err.message
        }), {
            status: 500, // Better for debugging than 401
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
    }
})