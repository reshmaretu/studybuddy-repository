"use client";

import { useStudyStore } from "@/store/useStudyStore";
import {
    ShieldAlert, Terminal, Sparkles, Zap, Crown, User,
    MailCheck, AlertCircle, LogOut, ChevronLeft, X, Lock
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

    // UI States
    const [activeModal, setActiveModal] = useState<'email' | 'password' | 'identity' | 'delete' | null>(null);
    const [loading, setLoading] = useState(false);
    const [userEmail, setUserEmail] = useState("");
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

    // Form States
    const [forms, setForms] = useState({
        newDisplayName: "",
        fullName: "",
        currentPassword: "",
        newPassword: "",
        newEmail: ""
    });

    useEffect(() => {
        const getEmail = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) setUserEmail(user.email);
        };
        getEmail();
    }, []);

    const handleVerifyEmail = async () => {
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: userEmail,
            options: { emailRedirectTo: `${window.location.origin}/auth/confirm` }
        });
        if (error) toast.error("Uplink failed: " + error.message);
        else toast.success("Verification signal sent to " + userEmail);
    };

    const updateIdentity = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();

        // Maps to schema fields: last_display_name_change_at & last_full_name_change_at
        const { error } = await supabase
            .from('profiles')
            .update({
                display_name: forms.newDisplayName || displayName,
                full_name: forms.fullName,
            })
            .eq('id', user?.id);

        if (error) toast.error(error.message);
        else {
            toast.success("Identity synced with the Matrix.");
            setActiveModal(null);
        }
        setLoading(false);
    };

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
            }
        } catch (error: any) {
            toast.error("Stripe uplink failed.");
        } finally {
            setLoading(false);
        }
    };

    return (
        // Added h-screen and overflow-hidden to lock the page
        <div className="h-screen w-full max-w-5xl mx-auto p-6 flex flex-col overflow-hidden text-(--text-main)">

            {/* IDENTITY HEADER */}
            <header className="bg-(--bg-card) border border-(--border-color) rounded-[32px] p-6 mb-4 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-6">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-(--accent-teal) to-(--accent-cyan) flex items-center justify-center border-2 border-white/10 shadow-lg">
                        <User size={40} className="text-[#0b1211]" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black italic uppercase tracking-tighter">{displayName}</h1>
                        <p className="text-xs text-(--text-muted) font-medium italic mb-2">{userEmail}</p>
                        <div className="flex gap-2 items-center">
                            {isVerified ? (
                                <span className="px-2 py-0.5 bg-teal-500/10 border border-teal-500/30 rounded-full text-[8px] font-black text-(--accent-teal) uppercase">Verified</span>
                            ) : (
                                <button
                                    onClick={handleVerifyEmail}
                                    className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 rounded-full text-[8px] font-black text-red-400 uppercase hover:bg-red-500/20 transition-all group relative"
                                >
                                    Unverified
                                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-black text-white text-[7px] rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Click to send verification link</span>
                                </button>
                            )}
                            <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-[8px] font-black text-(--accent-yellow) uppercase tracking-widest">Level {level} Architect</span>
                        </div>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-black text-(--text-muted) uppercase tracking-widest">Neural Focus</p>
                    <div className="flex items-center gap-2 justify-end">
                        <span className="text-2xl font-black text-(--accent-teal)">{focusScore}%</span>
                        <Zap size={20} className="text-(--accent-yellow)" />
                    </div>
                </div>
            </header>

            {/* MAIN CONTENT AREA - NO SCROLL GRID */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0 mb-4">

                {/* Security Actions Column */}
                <div className="space-y-4 flex flex-col">
                    <button onClick={() => setActiveModal('email')} className="flex-1 flex items-center gap-4 p-5 bg-(--bg-card) border border-(--border-color) rounded-[24px] hover:border-blue-500/50 transition-all group">
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 group-hover:scale-110 transition-transform"><MailCheck size={20} /></div>
                        <div className="text-left leading-tight">
                            <p className="font-bold text-sm">Change Email</p>
                            <p className="text-[9px] text-(--text-muted) uppercase">Password Required</p>
                        </div>
                    </button>

                    <button onClick={() => setActiveModal('password')} className="flex-1 flex items-center gap-4 p-5 bg-(--bg-card) border border-(--border-color) rounded-[24px] hover:border-indigo-500/50 transition-all group">
                        <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover:scale-110 transition-transform"><Lock size={20} /></div>
                        <div className="text-left leading-tight">
                            <p className="font-bold text-sm">Update Password</p>
                            <p className="text-[9px] text-(--text-muted) uppercase">Neural Shielding</p>
                        </div>
                    </button>

                    <button onClick={() => setActiveModal('identity')} className="flex-1 flex items-center gap-4 p-5 bg-(--bg-card) border border-(--border-color) rounded-[24px] hover:border-teal-500/50 transition-all group">
                        <div className="p-3 bg-teal-500/10 rounded-xl text-teal-400 group-hover:scale-110 transition-transform"><Terminal size={20} /></div>
                        <div className="text-left leading-tight">
                            <p className="font-bold text-sm">Identity Sync</p>
                            <p className="text-[9px] text-(--text-muted) uppercase">Names & Display</p>
                        </div>
                    </button>
                </div>

                {/* Center Billing Card */}
                <div className="md:col-span-2 bg-(--bg-card) border border-(--border-color) rounded-[32px] p-8 flex flex-col justify-between relative overflow-hidden shadow-lg">
                    {clientSecret ? (
                        <div className="h-full flex flex-col animate-in fade-in duration-500">
                            <button onClick={() => setClientSecret(null)} className="flex items-center gap-2 mb-4 text-[10px] font-black uppercase text-(--accent-teal)">
                                <ChevronLeft size={14} /> Abort Link
                            </button>
                            <div className="flex-1 overflow-hidden rounded-2xl border border-white/5 no-scrollbar">
                                <StripeEmbedded clientSecret={clientSecret} />
                            </div>
                        </div>
                    ) : (
                        <>
                            <div className="flex justify-between items-start">
                                <div>
                                    <h4 className="text-2xl font-black italic uppercase leading-none">{isPremiumUser ? "Plus Member" : "Standard Tier"}</h4>
                                    <p className="text-[10px] font-bold text-(--text-muted) uppercase tracking-widest mt-2">
                                        {isPremiumUser ? "Subscription Active • ₱99/mo" : "Unlock Pro Tutors & Matrix Analytics"}
                                    </p>
                                </div>
                                <div className={`p-4 rounded-2xl ${isPremiumUser ? 'bg-yellow-500/10 text-yellow-500' : 'bg-white/5 text-white/20'}`}>
                                    {isPremiumUser ? <Crown size={36} /> : <Sparkles size={36} />}
                                </div>
                            </div>

                            <div className="mt-auto">
                                {isPremiumUser ? (
                                    <button className="w-full py-4 bg-white/5 border border-white/10 rounded-2xl text-[10px] font-black uppercase text-(--accent-teal) hover:bg-white/10 transition-all">Billing Portal & PDFs</button>
                                ) : (
                                    <button onClick={handleUpgrade} className="w-full py-4 bg-(--accent-teal) text-[#0b1211] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-teal-500/20 active:scale-95 transition-all">
                                        Initialize Plus Uplink — ₱99.00
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* BOTTOM ACTION ROW */}
            <footer className="flex gap-4">
                <button onClick={() => supabase.auth.signOut()} className="flex-1 py-4 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-(--text-muted) hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    <LogOut size={16} /> Signal Disconnect
                </button>
                <button onClick={() => setActiveModal('delete')} className="px-6 py-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-[10px] font-black uppercase text-red-500 hover:bg-red-500/10 transition-all flex items-center gap-2">
                    <AlertCircle size={16} /> Terminate
                </button>
            </footer>

            {/* --- MODAL SYSTEM --- */}
            {activeModal && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                    <div className="bg-[#0b1211] border border-white/10 rounded-[32px] p-8 w-full max-w-md shadow-2xl relative">
                        <button onClick={() => setActiveModal(null)} className="absolute top-6 right-6 text-white/30 hover:text-white"><X size={20} /></button>

                        {activeModal === 'identity' && (
                            <div className="space-y-4">
                                <h2 className="text-lg font-black uppercase italic text-(--accent-teal)">Identity Sync</h2>
                                <div>
                                    <label className="text-[10px] font-bold text-(--text-muted) uppercase">Display Name (7d cooldown)</label>
                                    <input
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-1 text-sm outline-none focus:border-(--accent-teal)"
                                        placeholder={displayName}
                                        onChange={(e) => setForms({ ...forms, newDisplayName: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-[10px] font-bold text-(--text-muted) uppercase">First (1m)</label>
                                        <input className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-1 text-sm outline-none focus:border-(--accent-teal)" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold text-(--text-muted) uppercase">Last (1m)</label>
                                        <input className="w-full bg-white/5 border border-white/10 rounded-xl p-3 mt-1 text-sm outline-none focus:border-(--accent-teal)" />
                                    </div>
                                </div>
                                <button onClick={updateIdentity} className="w-full py-4 bg-(--accent-teal) text-[#0b1211] rounded-xl text-[10px] font-black uppercase mt-4">Confirm Neural Change</button>
                            </div>
                        )}

                        {activeModal === 'email' && (
                            <div className="space-y-4">
                                <h2 className="text-lg font-black uppercase italic text-blue-400">Communication Link</h2>
                                <input type="email" placeholder="New Email Address" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none" />
                                <input type="password" placeholder="Verify Current Password" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none" />
                                <button className="w-full py-4 bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase">Update Primary Link</button>
                            </div>
                        )}

                        {activeModal === 'delete' && (
                            <div className="text-center space-y-6">
                                <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500"><AlertCircle size={32} /></div>
                                <div>
                                    <h2 className="text-xl font-black uppercase text-red-500">Total Termination</h2>
                                    <p className="text-xs text-(--text-muted) mt-2">This will erase your focus scores and neural profile permanently. No recovery possible.</p>
                                </div>
                                <div className="space-y-2">
                                    <input type="password" placeholder="Enter password to confirm" className="w-full bg-white/5 border border-red-500/20 rounded-xl p-3 text-sm outline-none" />
                                    <button className="w-full py-4 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase">Finalize Deletion</button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}