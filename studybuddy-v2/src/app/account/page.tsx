"use client";

import { useStudyStore } from "@/store/useStudyStore";
import {
    User, Mail, Lock, Trash2, Crown, LogOut,
    Camera, Download, Zap, CheckCircle2,
    AlertCircle, RefreshCcw, Save, ShieldCheck, X
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import StripeEmbedded from "@/components/EmbeddedCheckout";

export default function AccountPage() {
    const {
        isPremiumUser, level, focusScore,
        displayName, fullName, userEmail, setUserEmail,
        triggerChumToast
    } = useStudyStore();

    // UI States
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isVerified, setIsVerified] = useState(false);
    const [isResending, setIsResending] = useState(false);
    const [loading, setLoading] = useState(false);

    // Form States
    const [formData, setFormData] = useState({
        newDisplayName: displayName || "",
        newEmail: "",
        currentPassword: "",
        newPassword: "",
    });

    useEffect(() => {
        const syncUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                setUserEmail(user.email);
                setIsVerified(!!user?.email_confirmed_at);
            }
        };
        syncUser();
    }, [setUserEmail]);

    // --- FUNCTIONALITY HANDLERS ---

    const handleVerifyEmail = async () => {
        if (isResending) return;
        setIsResending(true);
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: userEmail,
            options: { emailRedirectTo: `${window.location.origin}/auth/confirm` }
        });

        if (error) triggerChumToast(error.message, "warning");
        else triggerChumToast("Verification link dispatched.", "success");
        setIsResending(false);
    };

    const handleUpdateIdentity = async () => {
        setLoading(true);
        const { error } = await supabase.auth.updateUser({
            data: { display_name: formData.newDisplayName }
        });
        if (error) triggerChumToast(error.message, "warning");
        else {
            triggerChumToast("Identity updated.", "success");
            setActiveModal(null);
        }
        setLoading(false);
    };

    const handleUpgrade = async () => {
        setActiveModal('stripe');
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId: user?.id, email: user?.email }),
            });
            const data = await res.json();
            if (data.clientSecret) setClientSecret(data.clientSecret);
        } catch (error) {
            triggerChumToast("Stripe terminal failed.", "warning");
        }
    };

    return (
        <div className="min-h-full w-full flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in duration-700">
            <div className="w-full max-w-2xl space-y-6">

                {/* IDENTITY HEADER */}
                <div className="flex flex-col md:flex-row items-center gap-6 bg-white/5 border border-white/10 p-8 rounded-[40px] backdrop-blur-sm">
                    <div className="relative group cursor-pointer" onClick={() => setActiveModal('avatar')}>
                        <div className="w-24 h-24 rounded-full border-2 border-(--accent-teal)/30 p-1 bg-(--bg-card) flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105">
                            <User size={40} className="text-(--accent-teal)" />
                        </div>
                        <div className="absolute -bottom-1 -right-1 bg-(--accent-teal) p-1.5 rounded-full text-black border-2 border-(--bg-dark)">
                            <Camera size={12} />
                        </div>
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <h1 className="text-2xl font-black uppercase italic tracking-tighter">{displayName || fullName || "Architect"}</h1>
                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.2em]">{userEmail}</p>
                        <div className="flex gap-2 mt-3 justify-center md:justify-start">
                            <span className="px-2 py-0.5 bg-white/10 rounded-full text-[8px] font-black uppercase">Level {level}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase flex items-center gap-1 ${isVerified ? 'bg-teal-500/10 text-teal-400' : 'bg-red-500/10 text-red-400'}`}>
                                {isVerified ? <ShieldCheck size={8} /> : <AlertCircle size={8} />}
                                {isVerified ? 'Verified' : 'Unverified'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* HORIZONTAL ACTION GRID */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                        { id: 'identity', label: 'Identity', icon: <User size={16} /> },
                        { id: 'email', label: 'Relay', icon: <Mail size={16} /> },
                        { id: 'password', label: 'Cipher', icon: <Lock size={16} /> },
                        { id: 'delete', label: 'Archive', icon: <Trash2 size={16} />, color: 'hover:border-red-500/50 text-red-400' }
                    ].map((btn) => (
                        <button
                            key={btn.id}
                            onClick={() => setActiveModal(btn.id)}
                            className={`flex flex-col items-center justify-center gap-2 p-5 rounded-[32px] border bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 transition-all duration-300 ${btn.color || ''}`}
                        >
                            {btn.icon}
                            <span className="text-[9px] font-black uppercase tracking-[0.15em]">{btn.label}</span>
                        </button>
                    ))}
                </div>

                {/* SUBSCRIPTION DISPLAY */}
                <div className={`p-8 rounded-[40px] border transition-all duration-500 ${isPremiumUser ? 'bg-(--accent-teal)/5 border-(--accent-teal)/20' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-white/5 rounded-3xl text-(--accent-teal)"><Crown size={28} /></div>
                            <div>
                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em]">{isPremiumUser ? "Grandmaster Status" : "Standard Tier"}</h4>
                                <p className="text-[9px] opacity-40 uppercase font-bold mt-1 tracking-tight">{isPremiumUser ? "Neural Network Active" : "Initialize Plus for ₱99.00"}</p>
                            </div>
                        </div>
                        {!isPremiumUser && (
                            <button onClick={handleUpgrade} className="px-10 py-4 bg-white text-black rounded-2xl text-[9px] font-black uppercase hover:bg-(--accent-teal) transition-all">
                                Upgrade Link
                            </button>
                        )}
                    </div>
                </div>

                {/* LOGOUT */}
                <div className="flex justify-center pt-6">
                    <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 text-[10px] font-black uppercase opacity-20 hover:opacity-100 hover:text-red-500 transition-all">
                        <LogOut size={16} /> Disconnect Session
                    </button>
                </div>
            </div>

            {/* --- FLAWLESS MODAL SYSTEM --- */}
            {activeModal && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div
                        className={`bg-(--bg-card) border border-white/10 w-full rounded-[40px] relative shadow-2xl animate-in zoom-in-95 duration-300 flex flex-col max-h-[90vh] ${activeModal === 'stripe' ? 'max-w-4xl' : 'max-w-md'
                            }`}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Static Header / Close Button */}
                        <button
                            onClick={() => setActiveModal(null)}
                            className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors z-10"
                        >
                            <X size={16} />
                        </button>

                        {/* Scrollable Content Area */}
                        <div className="p-8 overflow-y-auto custom-scrollbar flex-1">

                            {/* Modal: Identity */}
                            {activeModal === 'identity' && (
                                <div className="space-y-6">
                                    <h2 className="text-xl font-black uppercase italic tracking-tighter">Update Identity</h2>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase ml-2 opacity-30 tracking-widest">Callsgn</label>
                                            <input
                                                value={formData.newDisplayName}
                                                onChange={(e) => setFormData({ ...formData, newDisplayName: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-(--accent-teal)"
                                            />
                                        </div>
                                        <button onClick={handleUpdateIdentity} className="w-full py-4 bg-(--accent-teal) text-black rounded-2xl text-[10px] font-black uppercase">Save to Matrix</button>
                                    </div>
                                </div>
                            )}

                            {/* Modal: Email */}
                            {activeModal === 'email' && (
                                <div className="space-y-6">
                                    <div className="flex justify-between items-end">
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Relay Route</h2>
                                        {!isVerified && (
                                            <button onClick={handleVerifyEmail} className="text-[9px] font-black uppercase text-(--accent-teal) mb-1 underline underline-offset-4">Resend Link</button>
                                        )}
                                    </div>
                                    <div className="space-y-4">
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                                            <span className="text-[11px] font-medium opacity-50">{userEmail}</span>
                                            {isVerified ? <CheckCircle2 size={16} className="text-teal-400" /> : <AlertCircle size={16} className="text-red-400" />}
                                        </div>
                                        <input className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none" placeholder="New Email Address" />
                                        <button className="w-full py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase">Migrate Route</button>
                                    </div>
                                </div>
                            )}

                            {/* Modal: Stripe (Optimized for Desktop & Scrolling) */}
                            {activeModal === 'stripe' && (
                                <div className="space-y-6">
                                    <div className="mb-4">
                                        <h2 className="text-xl font-black uppercase italic tracking-tighter">Payment Terminal</h2>
                                        <p className="text-[9px] uppercase font-bold opacity-30 tracking-widest">Secure checkout via Stripe</p>
                                    </div>

                                    <div className="min-h-[400px]">
                                        {clientSecret ? (
                                            <StripeEmbedded clientSecret={clientSecret} />
                                        ) : (
                                            <div className="py-20 flex flex-col items-center gap-4">
                                                <RefreshCcw className="animate-spin text-(--accent-teal)" size={32} />
                                                <span className="text-[9px] font-black uppercase opacity-20 tracking-widest">Handshaking with Gateway...</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {/* Modal: Delete */}
                            {activeModal === 'delete' && (
                                <div className="space-y-6 text-center py-4">
                                    <Trash2 size={40} className="mx-auto text-red-500" />
                                    <h2 className="text-xl font-black uppercase italic">Terminate Account?</h2>
                                    <p className="text-[10px] uppercase font-bold opacity-40 tracking-tighter">This will wipe your focus history and levels from the database permanently.</p>
                                    <div className="flex gap-4">
                                        <button onClick={() => setActiveModal(null)} className="flex-1 py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase">Abort</button>
                                        <button className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase">Confirm Wipe</button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}