import { Stripe } from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);



export async function POST(req: Request) {
    try {
        const { userId, email } = await req.json();

        const session = await stripe.checkout.sessions.create({
            // 🔥 Do NOT use payment_method_types or automatic_payment_methods here.
            // 🚀 Use this instead to let the Dashboard handle it:
            payment_method_collection: 'always',
            line_items: [{
                price: 'price_YOUR_ID',
                quantity: 1,
            }],
            mode: 'subscription',
            subscription_data: {
                trial_period_days: 30,
            },
            customer_email: email,
            metadata: { userId },
            success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/account?success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/account?canceled=true`,
        });

        return Response.json({ url: session.url });
    } catch (error: any) {
        console.error("Stripe Error:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
}