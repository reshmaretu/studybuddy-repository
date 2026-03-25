"use client";

import { useStudyStore } from "@/store/useStudyStore";
import {
    ShieldAlert, Terminal, Sparkles, Zap, Crown, User,
    MailCheck, AlertCircle, LogOut, ChevronLeft, X, Lock, CheckCircle2
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import StripeEmbedded from "@/components/EmbeddedCheckout";

export default function AccountPage() {
    const {
        isPremiumUser, level, focusScore,
        displayName, fullName, triggerChumToast, userEmail, setUserEmail
    } = useStudyStore();

    // UI States
    const [pendingAction, setPendingAction] = useState<{ type: string; label: string; execute: () => void } | null>(null);
    const [loading, setLoading] = useState(false);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isVerified, setIsVerified] = useState(false);
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [isResending, setIsResending] = useState(false);

    // Form States
    const [forms, setForms] = useState({
        newDisplayName: "",
        firstName: "",
        lastName: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        newEmail: ""
    });

    useEffect(() => {
        const checkStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                setUserEmail(user.email); // Sync to store
                setIsVerified(!!user?.email_confirmed_at);
            }
        };
        checkStatus();
    }, [setUserEmail]);

    const handleVerifyEmail = async () => {
        if (isResending) return;
        setIsResending(true);

        try {
            const { data: { user } } = await supabase.auth.getUser();
            const emailToUse = userEmail || user?.email;

            if (!emailToUse) {
                // FIXED: Passing correct object structure to triggerChumToast
                triggerChumToast("Uplink failed: No neural address found.", "warning");
                return;
            }

            const { error } = await supabase.auth.resend({
                type: 'signup',
                email: emailToUse,
                options: { emailRedirectTo: `${window.location.origin}/auth/confirm` }
            });

            if (error) {
                triggerChumToast(`Uplink failed: ${error.message}`, "warning");
            } else {
                triggerChumToast(`Verification signal sent to ${emailToUse}`, "success");
            }
        } catch (err) {
            triggerChumToast("Critical relay error.", "warning");
        } finally {
            setIsResending(false);
        }
    };

    const triggerConfirm = (type: string, label: string, execute: () => void) => {
        setPendingAction({ type, label, execute });
        setActiveModal('confirm');
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
            if (data.clientSecret) setClientSecret(data.clientSecret);
        } catch (error: any) {
            triggerChumToast("Stripe uplink failed.", "warning");
        } finally {
            setLoading(false);
        }
    };

    const resolvedIdentity = displayName || fullName || "Architect";

    return (
        <div className="h-screen max-h-screen w-full max-w-5xl mx-auto p-6 flex flex-col overflow-hidden text-(--text-main)">
            <header className="bg-(--bg-card) border border-(--border-color) rounded-[32px] p-6 mb-4 flex items-center justify-between shrink-0 shadow-xl">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-(--accent-teal) to-(--accent-cyan) flex items-center justify-center border-2 border-white/10 shrink-0">
                        <User size={32} className="text-[#0b1211]" />
                    </div>
                    <div className="min-w-0">
                        <h1 className="text-2xl font-black italic uppercase tracking-tighter leading-none truncate">
                            {resolvedIdentity}
                        </h1>
                        <p className="text-[10px] text-(--text-muted) font-bold uppercase mt-1 tracking-widest">
                            {displayName ? `@${displayName}` : "Neural ID Unset"}
                        </p>

                        <div className="flex gap-2 items-center mt-3">
                            {!isVerified ? (
                                <button
                                    onClick={handleVerifyEmail}
                                    disabled={isResending}
                                    className="px-2 py-0.5 bg-red-500/10 border border-red-500/30 rounded-full text-[8px] font-black text-red-400 uppercase hover:bg-red-500/20 disabled:opacity-50"
                                >
                                    {isResending ? "Sending..." : "Unverified (Verify?)"}
                                </button>
                            ) : (
                                <span className="px-2 py-0.5 bg-teal-500/10 border border-teal-500/30 rounded-full text-[8px] font-black text-(--accent-teal) uppercase">Verified</span>
                            )}
                            <span className="px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded-full text-[8px] font-black text-(--accent-yellow) uppercase">Level {level} Architect</span>
                        </div>
                    </div>
                </div>
                <div className="text-right shrink-0">
                    <p className="text-[8px] font-black text-(--text-muted) uppercase tracking-widest mb-1">Neural Focus</p>
                    <div className="flex items-center gap-2 justify-end">
                        <span className="text-2xl font-black text-(--accent-teal)">{focusScore}%</span>
                        <Zap size={18} className="text-(--accent-yellow) fill-(--accent-yellow)" />
                    </div>
                </div>
            </header>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 min-h-0 mb-4 overflow-hidden">
                <div className="space-y-4 flex flex-col min-h-0">
                    <button onClick={() => setActiveModal('email')} className="flex-1 flex items-center gap-4 p-5 bg-(--bg-card) border border-(--border-color) rounded-[24px] hover:border-blue-500/50 transition-all group">
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400 group-hover:scale-110 transition-transform"><MailCheck size={20} /></div>
                        <div className="text-left leading-tight">
                            <p className="font-bold text-sm">Email</p>
                            <p className="text-[9px] text-(--text-muted) uppercase font-black">Neural Relay</p>
                        </div>
                    </button>

                    <button onClick={() => setActiveModal('password')} className="flex-1 flex items-center gap-4 p-5 bg-(--bg-card) border border-(--border-color) rounded-[24px] hover:border-indigo-500/50 transition-all group">
                        <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400 group-hover:scale-110 transition-transform"><Lock size={20} /></div>
                        <div className="text-left leading-tight">
                            <p className="font-bold text-sm">Security</p>
                            <p className="text-[9px] text-(--text-muted) uppercase font-black">Neural Shield</p>
                        </div>
                    </button>

                    <button onClick={() => setActiveModal('identity')} className="flex-1 flex items-center gap-4 p-5 bg-(--bg-card) border border-(--border-color) rounded-[24px] hover:border-teal-500/50 transition-all group">
                        <div className="p-3 bg-teal-500/10 rounded-xl text-teal-400 group-hover:scale-110 transition-transform"><Terminal size={20} /></div>
                        <div className="text-left leading-tight">
                            <p className="font-bold text-sm">Identity</p>
                            <p className="text-[9px] text-(--text-muted) uppercase font-black">Matrix Sync</p>
                        </div>
                    </button>
                </div>

                <div className="md:col-span-2 bg-(--bg-card) border border-(--border-color) rounded-[32px] p-8 flex flex-col relative overflow-hidden shadow-lg">
                    <div className="flex justify-between items-start shrink-0">
                        <div>
                            <h4 className="text-xl font-black italic uppercase tracking-tighter leading-none">
                                {isPremiumUser ? "Plus Member" : "Standard Tier"}
                            </h4>
                            <p className="text-[10px] font-bold text-(--text-muted) uppercase mt-2 tracking-widest">Status: Operational</p>
                        </div>
                        <div className={`p-3 rounded-2xl ${isPremiumUser ? 'bg-yellow-500/10 text-yellow-500' : 'bg-white/5 text-white/20'}`}>
                            {isPremiumUser ? <Crown size={28} /> : <Sparkles size={28} />}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col items-center justify-center text-center">
                        {!clientSecret ? (
                            <div className="space-y-3 opacity-20">
                                <Sparkles size={40} className="mx-auto" />
                                <p className="text-[9px] font-black uppercase tracking-[0.3em]">Link Offline</p>
                            </div>
                        ) : (
                            <div className="w-full h-full pt-4 no-scrollbar overflow-hidden rounded-2xl">
                                <StripeEmbedded clientSecret={clientSecret} />
                            </div>
                        )}
                    </div>

                    {!clientSecret && (
                        <div className="mt-auto shrink-0 pt-4">
                            <button onClick={handleUpgrade} className="w-full py-4 bg-(--accent-teal) text-[#0b1211] rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-teal-500/10 active:scale-95 transition-all">
                                {isPremiumUser ? "Manage Subscription" : "Initialize Plus — ₱99.00"}
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <footer className="flex gap-4 shrink-0 pb-4">
                <button onClick={() => supabase.auth.signOut()} className="flex-1 py-4 bg-white/5 border border-white/5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-(--text-muted) hover:bg-white/10 transition-all flex items-center justify-center gap-2">
                    <LogOut size={14} /> Disconnect
                </button>
                <button onClick={() => setActiveModal('delete')} className="px-6 py-4 bg-red-500/5 border border-red-500/10 rounded-2xl text-[10px] font-black uppercase text-red-500 hover:bg-red-500/10 transition-all">
                    Terminate
                </button>
            </footer>

            {/* MODAL SYSTEM */}
            {activeModal && activeModal !== 'confirm' && (
                <div className="fixed inset-0 z-[600] flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
                    <div className="bg-[#0b1211] border border-white/10 rounded-[32px] p-8 w-full max-w-md shadow-2xl relative animate-in fade-in zoom-in duration-200">
                        <button onClick={() => setActiveModal(null)} className="absolute top-6 right-6 text-white/30 hover:text-white"><X size={20} /></button>

                        {activeModal === 'identity' && (
                            <div className="space-y-4">
                                <h2 className="text-lg font-black uppercase italic text-(--accent-teal)">Identity Sync</h2>
                                <input className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-(--accent-teal)" placeholder="New Display Name" onChange={(e) => setForms({ ...forms, newDisplayName: e.target.value })} />
                                <div className="grid grid-cols-2 gap-4">
                                    <input className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-(--accent-teal)" placeholder="First Name" />
                                    <input className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-(--accent-teal)" placeholder="Last Name" />
                                </div>
                                <button onClick={() => triggerConfirm('identity', 'IDENTITY SYNC', () => { })} className="w-full py-4 bg-(--accent-teal) text-[#0b1211] rounded-xl text-[10px] font-black uppercase mt-4">Commit Neural Change</button>
                            </div>
                        )}

                        {activeModal === 'password' && (
                            <div className="space-y-4">
                                <h2 className="text-lg font-black uppercase italic text-indigo-400">Security Reset</h2>
                                <input type="password" placeholder="Current Password" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none" />
                                <div className="space-y-2">
                                    <input type="password" placeholder="New Password" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-indigo-500" />
                                    <input type="password" placeholder="Confirm New Password" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none focus:border-indigo-500" />
                                </div>
                                <button onClick={() => triggerConfirm('password', 'SECURITY RESET', () => { })} className="w-full py-4 bg-indigo-500 text-white rounded-xl text-[10px] font-black uppercase mt-2">Re-Encrypt Shield</button>
                            </div>
                        )}

                        {activeModal === 'email' && (
                            <div className="space-y-4">
                                <h2 className="text-lg font-black uppercase italic text-blue-400">Communication Link</h2>
                                <input type="email" placeholder="New Email Address" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none" />
                                <input type="password" placeholder="Confirm Password" className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-sm outline-none" />
                                <button onClick={() => triggerConfirm('email', 'RELAY UPDATE', () => { })} className="w-full py-4 bg-blue-500 text-white rounded-xl text-[10px] font-black uppercase">Update Primary Link</button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* CONFIRMATION OVERLAY */}
            {activeModal === 'confirm' && (
                <div className="fixed inset-0 z-[700] flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
                    <div className="bg-(--bg-card) border border-white/10 rounded-[32px] p-10 w-full max-w-sm text-center">
                        <ShieldAlert size={40} className="mx-auto mb-4 text-(--accent-teal)" />
                        <h2 className="text-xl font-black uppercase italic">Sync Changes?</h2>
                        <p className="text-[10px] text-(--text-muted) mt-3 mb-8 uppercase font-bold tracking-tighter">Synchronize {pendingAction?.label} with the central matrix?</p>
                        <div className="flex gap-4">
                            <button onClick={() => setActiveModal(null)} className="flex-1 py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase">Abort</button>
                            <button onClick={() => { pendingAction?.execute(); setActiveModal(null); }} className="flex-1 py-4 bg-(--accent-teal) text-[#0b1211] rounded-2xl text-[10px] font-black uppercase">Commit</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}