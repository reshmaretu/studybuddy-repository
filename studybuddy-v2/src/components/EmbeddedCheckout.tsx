import { loadStripe } from '@stripe/stripe-js';
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

// Inside your AccountPage component:
const [clientSecret, setClientSecret] = useState<string | null>(null);

const handleUpgrade = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    const res = await fetch("/api/checkout", {
        method: "POST",
        body: JSON.stringify({ userId: user?.id, email: user?.email }),
    });
    const { clientSecret } = await res.json();
    setClientSecret(clientSecret); // This triggers the embedded UI to show
};

// In your JSX where the "Standard Tier" card used to be:
{
    clientSecret ? (
        <div className="bg-(--bg-card) border border-(--border-color) rounded-[32px] overflow-hidden p-2">
            <EmbeddedCheckoutProvider stripe={stripePromise} options={{ clientSecret }}>
                <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
        </div>
    ) : (
    // Your existing Upgrade Button UI
)
}