"use client";

import { useStudyStore } from "@/store/useStudyStore";
import {
    User, MailCheck, ShieldAlert, Terminal, AlertCircle,
    Sparkles, Crown, Zap, LogOut, X
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import dynamic from "next/dynamic";

// 🔥 Use dynamic import to prevent SSR issues and fix the export error
const StripeEmbedded = dynamic(() => import("@/components/EmbeddedCheckout"), {
    ssr: false,
    loading: () => <div className="h-[500px] flex items-center justify-center text-(--accent-teal) animate-pulse uppercase font-black text-[10px]">Initializing Neural Tunnel...</div>
});

export default function AccountPage() {
    const {
        isPremiumUser, level, focusScore,
        displayName, isVerified, triggerChumToast
    } = useStudyStore();

    const [loading, setLoading] = useState(false);
    const [userEmail, setUserEmail] = useState("");
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    useEffect(() => {
        const getEmail = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) setUserEmail(user.email);
        };
        getEmail();
    }, []);

    // Verification Polling
    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        if (query.get('session_id') && !isPremiumUser) {
            triggerChumToast("Verifying transaction...", "normal");
            const interval = setInterval(async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return clearInterval(interval);
                const { data } = await supabase.from('profiles').select('is_premium').eq('id', user.id).single();
                if (data?.is_premium) {
                    useStudyStore.setState({ isPremiumUser: true });
                    triggerChumToast("Uplink Complete. Welcome, Architect.", "normal");
                    window.history.replaceState({}, document.title, window.location.pathname);
                    clearInterval(interval);
                }
            }, 2000);
            return () => clearInterval(interval);
        }
    }, [isPremiumUser, triggerChumToast]);

    const handleUpgrade = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user?.id, email: user?.email }),
            });
            const data = await res.json();

            if (data.clientSecret) {
                setClientSecret(data.clientSecret);
                setIsCheckoutOpen(true);
            } else {
                throw new Error(data.error || "Uplink rejected.");
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen max-w-4xl mx-auto p-6 md:p-10 flex flex-col relative">
            <header className="bg-(--bg-card) border border-(--border-color) rounded-[32px] p-8 mb-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-(--accent-teal) to-(--accent-cyan) flex items-center justify-center border-4 border-(--bg-dark) shadow-xl">
                            <User size={48} className="text-[#0b1211]" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-(--text-main) italic uppercase tracking-tighter">{displayName}</h1>
                            <p className="text-sm text-(--text-muted) font-medium italic mb-3">{userEmail}</p>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Standard Settings Buttons... */}
                <div className="md:col-span-2 bg-(--bg-card) border border-(--border-color) rounded-[32px] p-8 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className={`p-5 rounded-2xl ${isPremiumUser ? 'bg-(--accent-yellow)/10 text-(--accent-yellow)' : 'bg-(--bg-dark) text-(--text-muted)'}`}>
                            {isPremiumUser ? <Crown size={40} /> : <Sparkles size={40} />}
                        </div>
                        <h4 className="text-xl font-black italic uppercase text-(--text-main)">{isPremiumUser ? "Plus Member" : "Standard Tier"}</h4>
                    </div>
                    {!isPremiumUser && (
                        <button onClick={handleUpgrade} disabled={loading} className="px-8 py-4 bg-(--accent-teal) text-[#0b1211] rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg transition-all active:scale-95">
                            {loading ? "Syncing..." : "Upgrade"}
                        </button>
                    )}
                </div>
            </div>

            {/* 💎 NEURAL MODAL OVERLAY */}
            {isCheckoutOpen && clientSecret && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsCheckoutOpen(false)} />
                    <div className="relative w-full max-w-2xl bg-[#0b1211] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5">
                            <span className="text-[10px] font-black uppercase text-(--accent-teal) tracking-[0.2em]">Neural Encryption Tunnel</span>
                            <button onClick={() => setIsCheckoutOpen(false)} className="p-2 hover:bg-white/10 rounded-full text-white/50 transition-colors">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-4 max-h-[80vh] overflow-y-auto no-scrollbar">
                            <StripeEmbedded clientSecret={clientSecret} />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}