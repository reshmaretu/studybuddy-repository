"use client";
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function StripeEmbedded({ clientSecret }: { clientSecret: string }) {
    return (
        <div className="min-h-[500px] animate-in fade-in duration-500">
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
                <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
        </div>
    );
}