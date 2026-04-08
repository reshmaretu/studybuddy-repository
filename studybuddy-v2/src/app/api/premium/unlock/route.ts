import { createClient } from '@supabase/supabase-js';

// Initialize Admin Client (Bypass RLS)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        const { userId, cipher } = await req.json();

        // 🛡️ SECURITY: Fetch the Master Neural Key from ENV
        const MASTER_KEY = process.env.SECRET_NEURAL_KEY || "STUDYBUDDY-EXPO-2026";

        if (!userId || !cipher) {
            return Response.json({ error: "Neural Coords or Cipher missing." }, { status: 400 });
        }

        if (cipher !== MASTER_KEY) {
            return Response.json({ error: "Invalid Neural Cipher. Uplink rejected." }, { status: 403 });
        }

        // ⚡ UPDATE PREMIUM STATUS
        const { error } = await supabaseAdmin
            .from('profiles')
            .update({ is_premium: true })
            .eq('id', userId);

        if (error) throw error;

        // 📄 Record Receipt (Matches the existing table structure)
        await supabaseAdmin
            .from('receipts')
            .upsert({
                user_id: userId,
                stripe_customer_id: 'manual_activation',
                stripe_subscription_id: 'sub_neural_' + Date.now(),
                amount_paid: 0,
                currency: 'php',
                status: 'succeeded',
                receipt_url: 'MANUAL',
            }, { onConflict: 'user_id' });

        return Response.json({ success: true, message: "Neural System Upgraded." });

    } catch (error: any) {
        console.error("NEURAL UNLOCK ERROR:", error.message);
        return Response.json({ error: "Uplink failed: " + error.message }, { status: 500 });
    }
}
