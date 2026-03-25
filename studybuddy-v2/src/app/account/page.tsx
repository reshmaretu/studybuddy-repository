"use client";

import { useStudyStore } from "@/store/useStudyStore";
import {
    ShieldAlert, Terminal, Sparkles, Zap, Crown, User,
    MailCheck, AlertCircle, LogOut, ChevronLeft, X
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import StripeEmbedded from "@/components/EmbeddedCheckout";

export default function AccountPage() {
    const {
        isPremiumUser, level, focusScore,
        displayName, isVerified, triggerChumToast
    } = useStudyStore();

    const [loading, setLoading] = useState(false);
    const [userEmail, setUserEmail] = useState("");
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    // Fetch user email on mount
    useEffect(() => {
        const getEmail = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) setUserEmail(user.email);
        };
        getEmail();
    }, []);

    // 🔥 NEURAL RECEIPT POLLING
    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        const hasSession = query.get('session_id');

        if (hasSession && !isPremiumUser) {
            triggerChumToast("Neural upgrade detected. Finalizing uplink...", "normal");

            let attempts = 0;
            const maxAttempts = 12;

            const interval = setInterval(async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return clearInterval(interval);

                const { data } = await supabase
                    .from('profiles')
                    .select('is_premium')
                    .eq('id', user.id)
                    .single();

                if (data?.is_premium) {
                    useStudyStore.setState({ isPremiumUser: true });
                    triggerChumToast("Uplink Complete. Welcome, Architect.", "normal");
                    window.history.replaceState({}, document.title, window.location.pathname);
                    clearInterval(interval);
                }

                attempts++;
                if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    triggerChumToast("Uplink delayed. Verify via email.", "warning");
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
                throw new Error(data.error);
            }
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen max-w-4xl mx-auto p-6 md:p-10 flex flex-col overflow-hidden relative">
            <header className="bg-(--bg-card) border border-(--border-color) rounded-[32px] p-8 mb-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-(--accent-teal) to-(--accent-cyan) flex items-center justify-center border-4 border-(--bg-dark) shadow-xl text-[#0b1211]">
                            <User size={48} />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-(--text-main) italic uppercase tracking-tighter mb-1">{displayName}</h1>
                            <p className="text-sm text-(--text-muted) font-medium italic mb-3">{userEmail}</p>
                            <div className="flex gap-2">
                                {isVerified && <span className="px-3 py-1 bg-(--accent-teal)/10 border border-(--accent-teal)/30 rounded-full text-[9px] font-black text-(--accent-teal) uppercase">Verified</span>}
                                <span className="px-3 py-1 bg-(--accent-yellow)/10 border border-(--accent-yellow)/30 rounded-full text-[9px] font-black text-(--accent-yellow) uppercase tracking-widest">Level {level} Architect</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 pb-6 overflow-y-auto no-scrollbar">
                {/* SETTINGS BUTTONS */}
                <button className="flex items-center gap-5 p-6 bg-(--bg-card) border border-(--border-color) rounded-[24px] hover:border-(--accent-teal)/50 transition-all text-left">
                    <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400"><MailCheck size={24} /></div>
                    <span className="font-bold text-(--text-main)">Change Email</span>
                </button>
                {/* ... other settings buttons ... */}

                <div className="md:col-span-2 bg-(--bg-card) border border-(--border-color) rounded-[32px] p-8 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-6">
                        <div className={`p-5 rounded-2xl ${isPremiumUser ? 'bg-(--accent-yellow)/10 text-(--accent-yellow)' : 'bg-(--bg-dark) text-(--text-muted)'}`}>
                            {isPremiumUser ? <Crown size={40} /> : <Sparkles size={40} />}
                        </div>
                        <div>
                            <h4 className="text-xl font-black italic uppercase text-(--text-main)">{isPremiumUser ? "Plus Member" : "Standard Tier"}</h4>
                            <p className="text-xs font-bold text-(--text-muted) uppercase tracking-widest mt-1">Unlock Pro Tutor & Analytics</p>
                        </div>
                    </div>
                    {!isPremiumUser && (
                        <button onClick={handleUpgrade} disabled={loading} className="px-8 py-4 bg-(--accent-teal) text-[#0b1211] rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg active:scale-95 transition-all">
                            {loading ? "Syncing..." : "Upgrade"}
                        </button>
                    )}
                </div>
            </div>

            {/* 💎 THE NEURAL MODAL */}
            {isCheckoutOpen && clientSecret && (
                <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/80 backdrop-blur-xl" onClick={() => setIsCheckoutOpen(false)} />

                    <div className="relative w-full max-w-2xl bg-[#0b1211] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
                        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 backdrop-blur-2xl">
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