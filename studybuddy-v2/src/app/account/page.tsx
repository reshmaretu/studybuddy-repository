"use client";

import { useStudyStore } from "@/store/useStudyStore";
import {
    ShieldAlert, Terminal, Sparkles, CreditCard,
    History, Zap, Crown, User, ArrowUpRight,
    MailCheck, AlertCircle
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function AccountPage() {
    // 🔥 Pull everything from the store
    const {
        isPremiumUser, isDev, devOverlayEnabled,
        setDevOverlayEnabled, level, focusScore,
        displayName, isVerified
    } = useStudyStore();

    const [loading, setLoading] = useState(false);
    const [verifying, setVerifying] = useState(false);

    // Function to handle verification resend
    const handleVerifyEmail = async () => {
        setVerifying(true);
        const { data: { user } } = await supabase.auth.getUser();

        if (user?.email) {
            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: user.email,
                options: {
                    emailRedirectTo: `${window.location.origin}/auth/confirm`,
                },
            });

            if (error) {
                toast.error("Signal lost: " + error.message);
            } else {
                toast.success("Verification link transmitted to your neural inbox.");
            }
        }
        setVerifying(false);
    };

    const handleUpgrade = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const res = await fetch("/api/checkout", {
                method: "POST",
                body: JSON.stringify({ userId: user?.id, email: user?.email }),
            });
            const { url } = await res.json();
            window.location.href = url; // Redirects to real Stripe Checkout
        } catch (error) {
            toast.error("Network disruption. Could not reach Stripe.");
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto p-4 md:p-8 pb-24 space-y-8">
            <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black text-(--text-main) tracking-tight italic uppercase">Portal Settings</h1>
                    {/* Header Identity */}
                    <p className="text-(--text-muted) font-medium italic">Architect Ident: <span className="text-(--accent-teal)">{displayName}</span></p>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-(--bg-card) border border-(--border-color) rounded-2xl shadow-sm">
                    <Zap size={14} className="text-(--accent-yellow)" />
                    <span className="text-xs font-black uppercase tracking-widest text-(--text-main)">Focus Score: {focusScore}</span>
                </div>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">

                    {/* Protocol / Subscription Card */}
                    <div className="relative overflow-hidden bg-(--bg-card) border border-(--border-color) rounded-[32px] p-8 shadow-sm">
                        {isPremiumUser && (
                            <div className="absolute top-0 right-0 p-6 opacity-10">
                                <Crown size={120} className="text-(--accent-yellow)" />
                            </div>
                        )}
                        <div className="relative z-10">
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-(--text-muted) mb-6">Current Protocol</h3>
                            <div className="flex items-start justify-between mb-8">
                                <div>
                                    <h2 className="text-3xl font-black text-(--text-main) mb-2">
                                        {isPremiumUser ? "StudyBuddy Plus" : "Standard Explorer"}
                                    </h2>
                                    <p className="text-xs text-(--text-muted) max-w-sm leading-relaxed">
                                        {isPremiumUser
                                            ? "Your neural link is optimized. You have full access to Premium Analytics, Pro Tutor Mode, and the Burnout Matrix."
                                            : "You are currently on the free tier. Upgrade to unlock deep-dive analytics and advanced AI tutoring."}
                                    </p>
                                </div>
                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${isPremiumUser ? 'bg-(--accent-yellow)/10 border-(--accent-yellow)/30 text-(--accent-yellow)' : 'bg-(--bg-dark) border-(--border-color) text-(--text-muted)'}`}>
                                    {isPremiumUser ? "Active" : "Free"}
                                </div>
                            </div>

                            {!isPremiumUser && (
                                <button
                                    onClick={handleUpgrade}
                                    disabled={loading}
                                    className="group flex items-center gap-3 bg-(--accent-teal) text-[#0b1211] px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:scale-[1.02] transition-all shadow-[0_10px_25px_rgba(20,184,166,0.25)] hover:shadow-[0_15px_35px_rgba(20,184,166,0.4)] disabled:opacity-50"
                                >
                                    <Sparkles size={18} />
                                    {loading ? "Initializing..." : "Upgrade to Plus"}
                                    <ArrowUpRight size={18} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Transaction Logs */}
                    <div className="bg-(--bg-card) border border-(--border-color) rounded-[32px] p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <History size={20} className="text-(--accent-teal)" />
                            <h3 className="text-lg font-bold text-(--text-main)">Neural Transaction Logs</h3>
                        </div>
                        <div className="space-y-3">
                            {isPremiumUser ? (
                                <div className="flex items-center justify-between p-4 bg-(--bg-dark) border border-(--border-color) rounded-2xl hover:border-(--accent-teal)/50 transition-colors group cursor-pointer">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 bg-(--accent-teal)/10 rounded-lg text-(--accent-teal)"><CreditCard size={18} /></div>
                                        <div>
                                            <p className="text-sm font-bold text-(--text-main)">Lifetime Upgrade</p>
                                            <p className="text-[10px] text-(--text-muted) uppercase font-bold tracking-widest">March 2026 • ₱299.00</p>
                                        </div>
                                    </div>
                                    <button className="text-[10px] font-black uppercase tracking-widest text-(--accent-teal) opacity-0 group-hover:opacity-100 transition-opacity">Download PDF</button>
                                </div>
                            ) : (
                                <div className="text-center py-12 border-2 border-dashed border-(--border-color) rounded-2xl">
                                    <p className="text-xs text-(--text-muted) font-medium">No transactions detected in your neural history.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ─── RIGHT COLUMN ─── */}
                <div className="space-y-6">
                    <div className="bg-(--bg-card) border border-(--border-color) rounded-[32px] p-6 text-center space-y-4">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-(--accent-teal) to-(--accent-cyan) mx-auto flex items-center justify-center border-4 border-(--bg-dark) shadow-xl">
                            <User size={40} className="text-[#0b1211]" />
                        </div>
                        <div>
                            {/* 🔥 Real Name and Level from Store */}
                            <h3 className="text-xl font-black text-(--text-main)">{displayName}</h3>
                            <p className="text-xs text-(--text-muted)">Level {level} Architect</p>
                        </div>

                        <div className="flex flex-col gap-3 items-center pt-2">
                            <div className="flex justify-center gap-2">
                                {/* 🔥 Uses Store isVerified */}
                                {isVerified ? (
                                    <div className="px-3 py-1 bg-(--accent-teal)/10 border border-(--accent-teal)/30 rounded-full text-[9px] font-bold text-(--accent-teal) uppercase flex items-center gap-1">
                                        <MailCheck size={10} /> Verified
                                    </div>
                                ) : (
                                    <div className="px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full text-[9px] font-bold text-red-400 uppercase flex items-center gap-1">
                                        <AlertCircle size={10} /> Unverified
                                    </div>
                                )}
                            </div>
                            {!isVerified && (
                                <button
                                    onClick={handleVerifyEmail}
                                    disabled={verifying}
                                    className="text-[10px] font-black uppercase text-(--accent-teal) hover:underline transition-all disabled:opacity-50"
                                >
                                    {verifying ? "Transmitting..." : "Resend Link"}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Architect Settings */}
                    {isDev && (
                        <div className="bg-[#120808] border border-red-500/20 rounded-[32px] p-6 space-y-6">
                            <div className="flex items-center gap-3">
                                <ShieldAlert className="text-red-500" size={20} />
                                <h3 className="text-sm font-black text-(--text-main) uppercase tracking-widest">Architect Access</h3>
                            </div>
                            <div className="p-4 bg-black/40 rounded-2xl border border-white/5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <Terminal size={14} className="text-red-500" />
                                        <span className="text-xs font-bold text-white/80">Dev Overlay</span>
                                    </div>
                                    <button
                                        onClick={() => setDevOverlayEnabled(!devOverlayEnabled)}
                                        className={`w-10 h-5 rounded-full transition-all relative ${devOverlayEnabled ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.4)]' : 'bg-white/10'}`}
                                    >
                                        <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${devOverlayEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>
                                <p className="text-[10px] text-white/30 leading-relaxed italic">Neural core override enabled. Global hotkeys active.</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}