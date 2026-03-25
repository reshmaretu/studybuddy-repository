// components/EmbeddedCheckout.tsx
"use client";
import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

export default function StripeEmbedded({ clientSecret }: { clientSecret: string }) {
    return (
        <div className="bg-(--bg-card) border border-(--border-color) rounded-[32px] overflow-hidden p-2 min-h-[500px] animate-in fade-in zoom-in-95 duration-500">
            <div className="p-4 border-b border-(--border-color) flex justify-between items-center">
                <span className="text-[10px] font-black uppercase text-(--accent-teal) tracking-widest">Neural Encryption Active</span>
            </div>
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
                <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
        </div>
    );
}