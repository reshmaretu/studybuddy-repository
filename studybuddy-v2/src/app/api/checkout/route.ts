import { Stripe } from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
    try {
        const { userId, email } = await req.json();

        // 🚨 DEBUG: Check if data is actually arriving
        console.log("Uplink Request:", { userId, email });

        if (!userId || !email) {
            return Response.json({ error: "Neural Ident or Coordinate missing." }, { status: 400 });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_collection: 'always',
            line_items: [{
                price: 'price_1R6A...', // 🔥 MUST BE YOUR REAL STRIPE PRICE ID
                quantity: 1,
            }],
            mode: 'subscription',
            customer_email: email,
            metadata: { userId },
            success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/account?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/account?canceled=true`,
        });

        return Response.json({ url: session.url });
    } catch (error: any) {
        // 🚨 DEBUG: This prints the EXACT Stripe error to your console
        console.error("STRIPE CORE ERROR:", error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
}