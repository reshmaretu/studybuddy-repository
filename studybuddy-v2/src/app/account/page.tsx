"use client";

import { useStudyStore } from "@/store/useStudyStore";
import {
    ShieldAlert, Terminal, Sparkles, CreditCard,
    History, Zap, Crown, User, ArrowUpRight,
    MailCheck, AlertCircle, X, LogOut
} from "lucide-react";
import { useState, useEffect, ComponentType } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import dynamic from "next/dynamic";

// 🔥 Dynamically load Stripe to prevent SSR issues and define props type
const StripeEmbedded = dynamic(() => import("@/components/EmbeddedCheckout"), {
    ssr: false,
    loading: () => (
        <div className="h-[400px] flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 border-4 border-(--accent-teal) border-t-transparent rounded-full animate-spin" />
            <span className="text-[10px] font-black uppercase text-(--accent-teal) tracking-[0.2em] animate-pulse">
                Establishing Secure Tunnel
            </span>
        </div>
    )
}) as ComponentType<{ clientSecret: string }>;

export default function AccountPage() {
    const {
        isPremiumUser, level, focusScore,
        displayName, isVerified, setDisplayName, triggerChumToast
    } = useStudyStore();

    // UI States
    const [activeModal, setActiveModal] = useState<'email' | 'password' | 'identity' | 'delete' | null>(null);
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [secondInputValue, setSecondInputValue] = useState("");
    const [userEmail, setUserEmail] = useState("");

    // 🔥 Payment States
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    useEffect(() => {
        const getEmail = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) setUserEmail(user.email);
        };
        getEmail();
    }, []);

    // 🔥 FIXED NEURAL RECEIPT POLLING
    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        const hasSession = query.get('session_id') || query.get('success');

        if (hasSession && !isPremiumUser) {
            triggerChumToast("Neural upgrade detected. Finalizing uplink...", "normal");

            const interval = setInterval(async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return clearInterval(interval);

                const { data } = await supabase
                    .from('profiles')
                    .select('is_premium')
                    .eq('id', user.id)
                    .single();

                if (data?.is_premium) {
                    // ✅ SUCCESS: Update global state
                    useStudyStore.setState({ isPremiumUser: true });

                    // ✅ UI RESET: Close modal and clear secret
                    setIsCheckoutOpen(false);
                    setClientSecret(null);

                    triggerChumToast("Uplink Complete. Welcome, Architect.", "normal");
                    window.history.replaceState({}, document.title, window.location.pathname);
                    clearInterval(interval);
                }
            }, 2500);

            return () => clearInterval(interval);
        }
    }, [isPremiumUser, triggerChumToast]);

    // ─── ACTION HANDLERS ───

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

    const handleModalSubmit = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;
        try {
            if (activeModal === 'email') {
                const { error } = await supabase.auth.updateUser({ email: inputValue });
                if (error) throw error;
                toast.success("Coordinates updated.");
            } else if (activeModal === 'identity') {
                await setDisplayName(inputValue);
                toast.success("Identity recalibrated.");
            }
            setActiveModal(null);
            setInputValue("");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen max-w-6xl mx-auto p-4 md:p-8 flex flex-col gap-6 overflow-hidden relative">
            {/* TOP IDENTITY HEADER */}
            <header className="flex items-center justify-between bg-(--bg-card) border border-(--border-color) rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-(--accent-teal) to-(--accent-cyan) flex items-center justify-center border-4 border-(--bg-dark) shadow-xl">
                        <User size={40} className="text-[#0b1211]" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-(--text-main) italic uppercase tracking-tight leading-none mb-1">{displayName}</h1>
                        <p className="text-sm text-(--text-muted) font-medium italic">{userEmail}</p>
                        <div className="flex gap-2 mt-2">
                            {isVerified && <span className="px-2 py-0.5 bg-(--accent-teal)/10 border border-(--accent-teal)/30 rounded-full text-[8px] font-black text-(--accent-teal) uppercase">Verified</span>}
                            <span className="px-2 py-0.5 bg-(--accent-yellow)/10 border border-(--accent-yellow)/30 rounded-full text-[8px] font-black text-(--accent-yellow) uppercase">Level {level} Architect</span>
                        </div>
                    </div>
                </div>
                <div className="hidden md:flex items-center gap-4">
                    <div className="text-right">
                        <p className="text-[10px] font-black text-(--text-muted) uppercase">Neural Focus</p>
                        <p className="text-2xl font-black text-(--accent-teal)">{focusScore}%</p>
                    </div>
                    <Zap size={32} className="text-(--accent-yellow)" />
                </div>
            </header>

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">
                {/* LEFT COLUMN: Settings & Subscription */}
                <div className="lg:col-span-7 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onClick={() => setActiveModal('email')} className="group flex items-center justify-between p-5 bg-(--bg-card) border border-(--border-color) rounded-2xl hover:border-(--accent-teal)/50 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><MailCheck size={20} /></div>
                                <span className="text-sm font-bold text-(--text-main)">Change Email</span>
                            </div>
                            <ArrowUpRight size={16} />
                        </button>
                        <button onClick={() => setActiveModal('identity')} className="group flex items-center justify-between p-5 bg-(--bg-card) border border-(--border-color) rounded-2xl hover:border-(--accent-teal)/50 transition-all">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-teal-500/10 rounded-xl text-teal-400"><Terminal size={20} /></div>
                                <span className="text-sm font-bold text-(--text-main)">Update Identity</span>
                            </div>
                            <ArrowUpRight size={16} />
                        </button>
                    </section>

                    {/* SUBSCRIPTION BOX */}
                    <div className="bg-(--bg-card) border border-(--border-color) rounded-[32px] p-6 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-6">
                            <div className={`p-4 rounded-2xl ${isPremiumUser ? 'bg-(--accent-yellow)/10 text-(--accent-yellow)' : 'bg-(--bg-dark) text-(--text-muted)'}`}>
                                {isPremiumUser ? <Crown size={32} /> : <Sparkles size={32} />}
                            </div>
                            <div>
                                <h4 className="text-lg font-black italic uppercase text-(--text-main)">{isPremiumUser ? "Plus Member" : "Standard Tier"}</h4>
                                <p className="text-[10px] font-bold text-(--text-muted) uppercase tracking-widest mt-1">
                                    {isPremiumUser ? "Subscription Active" : "Unlock Pro Tutor & Matrix Analytics"}
                                </p>
                            </div>
                        </div>
                        {!isPremiumUser && (
                            <button onClick={handleUpgrade} disabled={loading} className="px-6 py-3 bg-(--accent-teal) text-[#0b1211] rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">
                                {loading ? "..." : "Upgrade"}
                            </button>
                        )}
                    </div>

                    <button onClick={() => supabase.auth.signOut()} className="w-full flex items-center justify-center gap-3 p-5 bg-white/5 border border-white/5 rounded-2xl text-xs font-black uppercase text-(--text-muted)">
                        <LogOut size={16} /> Signal Disconnect
                    </button>
                </div>

                {/* RIGHT COLUMN: Customization */}
                <div className="lg:col-span-5 bg-(--bg-card) border border-(--border-color) rounded-[32px] p-6 flex flex-col shadow-sm">
                    <h3 className="text-sm font-black uppercase tracking-widest text-(--text-muted) mb-6">Neural Customization</h3>
                    <div className="space-y-3">
                        <div className="w-full p-4 bg-(--bg-dark) border border-(--accent-teal)/30 rounded-2xl flex items-center justify-between">
                            <span className="text-xs font-bold text-(--text-main)">🌙 Dark Forest</span>
                            <div className="w-2 h-2 rounded-full bg-(--accent-teal) shadow-[0_0_10px_var(--accent-teal)]" />
                        </div>
                    </div>
                </div>
            </div>

            {/* 💎 STRIPE CHECKOUT MODAL */}
            {isCheckoutOpen && clientSecret && (
                <div className="absolute inset-0 z-[200] flex items-center justify-center bg-(--bg-dark)/90 backdrop-blur-xl p-4">
                    <div className="w-full max-w-2xl bg-(--bg-card) border border-(--border-color) rounded-[40px] overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-(--border-color) flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase text-(--accent-teal) tracking-[0.2em]">Secure Stripe Uplink</span>
                            <button onClick={() => { setIsCheckoutOpen(false); setClientSecret(null); }} className="text-(--text-muted) hover:text-white"><X size={20} /></button>
                        </div>
                        <div className="p-4 max-h-[70vh] overflow-y-auto no-scrollbar">
                            <StripeEmbedded clientSecret={clientSecret} />
                        </div>
                    </div>
                </div>
            )}

            {/* NEURAL SETTINGS MODALS */}
            {activeModal && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-(--bg-dark)/80 backdrop-blur-md p-4">
                    <div className="w-full max-w-md bg-(--bg-card) border border-(--border-color) rounded-[40px] p-8 space-y-6">
                        <div className="flex justify-between items-center border-b border-(--border-color) pb-4">
                            <h3 className="text-xl font-black italic uppercase text-(--text-main)">{activeModal} Protocol</h3>
                            <button onClick={() => setActiveModal(null)} className="text-(--text-muted)"><X size={20} /></button>
                        </div>
                        <input
                            type="text"
                            placeholder="Enter coordinates..."
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            className="w-full bg-(--bg-dark) border border-(--border-color) rounded-2xl px-6 py-5 text-sm outline-none focus:border-(--accent-teal)"
                        />
                        <button onClick={handleModalSubmit} className="w-full py-5 rounded-2xl bg-(--accent-teal) text-[#0b1211] font-black uppercase text-sm">Confirm</button>
                    </div>
                </div>
            )}
        </div>
    );
}