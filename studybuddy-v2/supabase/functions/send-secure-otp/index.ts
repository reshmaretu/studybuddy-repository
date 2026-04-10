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
        const body = await req.json();
        // Try to grab the email from any common key name
        const email = body.userEmail || body.email;
        const { userId, action } = body;

        if (!email) {
            console.error("Payload missing email:", body);
            return new Response(JSON.stringify({ error: "Missing recipient" }), { status: 400, headers: corsHeaders });
        }

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
                    service_id: Deno.env.get('service_4jxw1y4'),
                    template_id: Deno.env.get('template_651g35l'),
                    user_id: Deno.env.get('frRtvfcT_euNuaTxx'),
                    template_params: {
                        email: email,      // Ensure this matches {{email}} in EmailJS
                        otp_code: otpCode  // Ensure this matches {{otp_code}} in EmailJS
                    },
                }),
            })

            if (!emailResponse.ok) {
                const errorText = await emailResponse.text()
                console.error("EmailJS Error:", errorText) // This WILL show in Supabase logs
                throw new Error(`EmailJS failed: ${errorText}`)
            }
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
                    service_id: Deno.env.get('service_4jxw1y4'),
                    template_id: Deno.env.get('template_2pf96wo'),
                    user_id: Deno.env.get('frRtvfcT_euNuaTxx'),
                    template_params: { email: email, reset_link: data.properties.action_link },
                }),
            })

            if (!emailResponse.ok) {
                const errorText = await emailResponse.text()
                console.error("EmailJS Error:", errorText) // This WILL show in Supabase logs
                throw new Error(`EmailJS failed: ${errorText}`)
            }
            return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } })
        }

    } catch (err: any) {
        console.error("FUNCTION_ERROR:", err.message); // This shows up in Supabase Logs
        return new Response(JSON.stringify({
            success: false,
            error: err.message,
            stack: err.stack
        }), {
            status: 500, // Changed from 401 to 500 to clearly flag a server failure
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        })
    }
})