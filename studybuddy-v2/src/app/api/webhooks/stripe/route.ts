import { Stripe } from 'stripe';
import { headers } from 'next/headers';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// 1. Initialize Admin Client (Bypass RLS)
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! // 🔥 Use Service Role Key here
);

export async function POST(req: Request) {
    const body = await req.text();
    const head = await headers(); // Next.js 15+ requires awaiting headers
    const sig = head.get('stripe-signature')!;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(body, sig, endpointSecret);
    } catch (err: any) {
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }

    // 2. Handle Subscription Lifecycle
    const session = event.data.object as any;
    const userId = session.metadata?.userId; // Metadata passed from Checkout Session

    if (userId) {
        switch (event.type) {
            case 'customer.subscription.created':
            case 'invoice.payment_succeeded':
                // 🔥 Mark as Premium
                await supabaseAdmin
                    .from('profiles')
                    .update({ is_premium: true })
                    .eq('id', userId);
                console.log(`✅ Architect ${userId} elevated to Plus.`);
                break;

            case 'customer.subscription.deleted':
            case 'customer.subscription.trial_will_end': // Optional: notify user
                // ⚠️ Revoke Premium
                await supabaseAdmin
                    .from('profiles')
                    .update({ is_premium: false })
                    .eq('id', userId);
                console.log(`❌ Architect ${userId} returned to Standard.`);
                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });
    }
}