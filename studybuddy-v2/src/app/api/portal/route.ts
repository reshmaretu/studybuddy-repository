import { Stripe } from 'stripe';
import { supabase } from '@/lib/supabase';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        // Fetch the Stripe ID from your receipts table
        const { data, error } = await supabase
            .from('receipts')
            .select('stripe_customer_id')
            .eq('user_id', user.id)
            .maybeSingle();

        if (!data?.stripe_customer_id) {
            return Response.json({
                error: "Neural records empty. Complete an upgrade to unlock the portal."
            }, { status: 404 });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: data.stripe_customer_id,
            return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/account`,
        });

        return Response.json({ url: session.url });
    } catch (error: any) {
        return Response.json({ error: "Portal uplink failed." }, { status: 500 });
    }
}