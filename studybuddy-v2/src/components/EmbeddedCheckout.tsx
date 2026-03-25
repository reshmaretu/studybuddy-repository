import { Stripe } from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

export async function POST(req: Request) {
    try {
        const { userId, email } = await req.json();

        if (!userId || !email) {
            return Response.json({ error: "Missing identity credentials." }, { status: 400 });
        }

        const session = await stripe.checkout.sessions.create({
            ui_mode: 'embedded', // 🔥 Required for modal/embedded usage
            line_items: [{
                price: 'price_1TElHtQyyYfUtkCR5TvWfLzJ',
                quantity: 1,
            }],
            mode: 'subscription',
            customer_email: email,
            metadata: { userId },
            return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/account?session_id={CHECKOUT_SESSION_ID}`,
        });

        return Response.json({ clientSecret: session.client_secret });
    } catch (error: any) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}