import { Stripe } from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
    try {
        const { userId, email } = await req.json();

        if (!userId || !email) {
            return Response.json({ error: "Neural Ident or Coordinate missing." }, { status: 400 });
        }

        const session = await stripe.checkout.sessions.create({
            ui_mode: 'embedded', // 🔥 REQUIRED for Modal/Embedded view
            payment_method_types: ['card'], // Add 'gcash' here in Dashboard first
            line_items: [{
                price: 'price_1TElHtQyyYfUtkCR5TvWfLzJ',
                quantity: 1,
            }],
            mode: 'subscription',
            customer_email: email,
            metadata: { userId },
            // 🔥 Embedded mode uses return_url instead of success_url
            return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/account?session_id={CHECKOUT_SESSION_ID}`,
        });

        // We return the client_secret instead of a URL
        return Response.json({ clientSecret: session.client_secret });
    } catch (error: any) {
        console.error("STRIPE CORE ERROR:", error.message);
        return Response.json({ error: error.message }, { status: 500 });
    }
}