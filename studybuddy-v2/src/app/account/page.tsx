"use client";

import { useStudyStore } from "@/store/useStudyStore";
import {
    User, Mail, Lock, Trash2, Crown, LogOut,
    Camera, Download, Zap, CheckCircle2,
    AlertCircle, RefreshCcw, Save, ShieldCheck
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
    const [activeSection, setActiveSection] = useState<string | null>(null);
    const [avatarTab, setAvatarTab] = useState<'personal' | 'chum'>('personal');
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

    const handleVerifyEmail = async () => {
        if (isResending) return;
        setIsResending(true);
        const { error } = await supabase.auth.resend({
            type: 'signup',
            email: userEmail,
            options: { emailRedirectTo: `${window.location.origin}/auth/confirm` }
        });

        if (error) triggerChumToast(error.message, "warning");
        else triggerChumToast("Verification link sent to your inbox.", "success");
        setIsResending(false);
    };

    const handleUpdateProfile = async () => {
        setLoading(true);
        const { error } = await supabase.auth.updateUser({
            data: { display_name: formData.newDisplayName }
        });
        if (error) triggerChumToast(error.message, "warning");
        else triggerChumToast("Identity updated in the matrix.", "success");
        setLoading(false);
    };

    const handleUpgrade = async () => {
        setActiveSection('stripe');
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
            triggerChumToast("Stripe link failed.", "warning");
        }
    };

    return (
        <div className="min-h-full w-full flex flex-col items-center justify-center p-4 md:p-8 animate-in fade-in duration-700">
            <div className="w-full max-w-2xl space-y-6">

                {/* 1. IDENTITY HEADER */}
                <div className="flex flex-col md:flex-row items-center gap-6 bg-white/5 border border-white/10 p-8 rounded-[40px] backdrop-blur-sm">
                    <div className="relative group cursor-pointer" onClick={() => setActiveSection('avatar')}>
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
                    <div className="hidden md:block text-right">
                        <span className="block text-[8px] font-black uppercase opacity-30 mb-1 tracking-widest">Efficiency</span>
                        <div className="flex items-center gap-2 text-xl font-black text-(--accent-teal)">
                            {focusScore}% <Zap size={16} className="fill-(--accent-yellow) text-(--accent-yellow)" />
                        </div>
                    </div>
                </div>

                {/* 2. HORIZONTAL ACTION GRID (Responsive 2x2 or 4x1) */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                        { id: 'identity', label: 'Identity', icon: <User size={16} /> },
                        { id: 'email', label: 'Relay', icon: <Mail size={16} /> },
                        { id: 'password', label: 'Cipher', icon: <Lock size={16} /> },
                        { id: 'delete', label: 'Archive', icon: <Trash2 size={16} />, color: 'hover:border-red-500/50 text-red-400' }
                    ].map((btn) => (
                        <button
                            key={btn.id}
                            onClick={() => setActiveSection(activeSection === btn.id ? null : btn.id)}
                            className={`flex flex-col items-center justify-center gap-2 p-5 rounded-[32px] border transition-all duration-300 ${activeSection === btn.id ? 'bg-white text-black border-white scale-95' : 'bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20'} ${btn.color || ''}`}
                        >
                            {btn.icon}
                            <span className="text-[9px] font-black uppercase tracking-[0.15em]">{btn.label}</span>
                        </button>
                    ))}
                </div>

                {/* 3. INLINE CONTENT EXPANSION */}
                {activeSection && (
                    <div className="bg-white/5 border border-white/10 rounded-[40px] p-8 animate-in slide-in-from-top-4 duration-500">
                        {/* IDENTITY FORM */}
                        {activeSection === 'identity' && (
                            <div className="space-y-6">
                                <h2 className="text-[10px] font-black uppercase tracking-widest italic opacity-50">Identity Module</h2>
                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-[9px] font-black uppercase ml-2 opacity-30">Public Callsign</label>
                                        <input
                                            value={formData.newDisplayName}
                                            onChange={(e) => setFormData({ ...formData, newDisplayName: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-(--accent-teal) transition-colors"
                                            placeholder="Enter new display name..."
                                        />
                                    </div>
                                    <button onClick={handleUpdateProfile} disabled={loading} className="w-full py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 hover:bg-(--accent-teal) transition-all">
                                        <Save size={14} /> {loading ? 'Syncing...' : 'Commit Changes'}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* EMAIL / VERIFICATION FORM */}
                        {activeSection === 'email' && (
                            <div className="space-y-6">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-[10px] font-black uppercase tracking-widest italic opacity-50">Neural Relay</h2>
                                    {!isVerified && (
                                        <button onClick={handleVerifyEmail} disabled={isResending} className="flex items-center gap-2 text-[9px] font-black uppercase text-(--accent-teal) hover:opacity-70 transition-opacity">
                                            <RefreshCcw size={12} className={isResending ? "animate-spin" : ""} /> Resend Auth Link
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-4">
                                    <div className="p-4 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between">
                                        <span className="text-[11px] font-medium opacity-60 tracking-tight">{userEmail}</span>
                                        {isVerified ? (
                                            <div className="flex items-center gap-1.5 text-teal-400 text-[9px] font-black uppercase">
                                                <CheckCircle2 size={14} /> Secured
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-red-400 text-[9px] font-black uppercase">
                                                <AlertCircle size={14} /> Pending
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-2 pt-2">
                                        <label className="text-[9px] font-black uppercase ml-2 opacity-30">New Route</label>
                                        <input className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-blue-500" placeholder="Enter new email address..." />
                                    </div>
                                    <button className="w-full py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-blue-500 transition-all">Update Relay Path</button>
                                </div>
                            </div>
                        )}

                        {/* PASSWORD FORM */}
                        {activeSection === 'password' && (
                            <div className="space-y-6">
                                <h2 className="text-[10px] font-black uppercase tracking-widest italic opacity-50">Cipher Encryption</h2>
                                <div className="space-y-4">
                                    <input type="password" placeholder="Current Secret" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-purple-500" />
                                    <input type="password" placeholder="New Secret" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm outline-none focus:border-purple-500" />
                                    <button className="w-full py-4 bg-purple-600 text-white rounded-2xl text-[10px] font-black uppercase">Rotate Keys</button>
                                </div>
                            </div>
                        )}

                        {/* AVATAR TOGGLE */}
                        {activeSection === 'avatar' && (
                            <div className="flex flex-col items-center gap-6">
                                <div className="flex bg-white/5 p-1.5 rounded-3xl w-full">
                                    <button onClick={() => setAvatarTab('personal')} className={`flex-1 py-3 text-[9px] font-black uppercase rounded-2xl transition-all ${avatarTab === 'personal' ? 'bg-white text-black' : 'opacity-40 hover:opacity-60'}`}>Personal</button>
                                    <button onClick={() => setAvatarTab('chum')} className={`flex-1 py-3 text-[9px] font-black uppercase rounded-2xl transition-all ${avatarTab === 'chum' ? 'bg-white text-black' : 'opacity-40 hover:opacity-60'}`}>Chum AI</button>
                                </div>
                                <div className="py-12 w-full border-2 border-dashed border-white/10 rounded-[32px] flex flex-col items-center justify-center gap-4 group cursor-pointer hover:bg-white/5 transition-colors">
                                    <div className="p-4 bg-white/5 rounded-full group-hover:scale-110 transition-transform">
                                        <Camera size={24} className="opacity-40" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-20">
                                        {avatarTab === 'personal' ? "Upload Image Protocol" : "AI Generation Offline"}
                                    </span>
                                </div>
                            </div>
                        )}

                        <button onClick={() => setActiveSection(null)} className="mt-8 w-full text-[9px] font-black uppercase opacity-20 hover:opacity-100 transition-opacity tracking-widest">Collapse Module</button>
                    </div>
                )}

                {/* 4. SUBSCRIPTION CARD (INLINE STRIPE) */}
                <div className={`p-8 rounded-[40px] border transition-all duration-500 ${isPremiumUser ? 'bg-(--accent-teal)/5 border-(--accent-teal)/20 shadow-[0_0_50px_-12px_rgba(45,212,191,0.1)]' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-white/5 rounded-3xl text-(--accent-teal) ring-1 ring-white/10"><Crown size={28} /></div>
                            <div>
                                <h4 className="text-[11px] font-black uppercase tracking-[0.2em]">{isPremiumUser ? "Grandmaster Status" : "Standard Tier"}</h4>
                                <p className="text-[9px] opacity-40 uppercase font-bold mt-1 tracking-tight">{isPremiumUser ? "Neural Network Access Active" : "Initialize Plus for ₱99.00"}</p>
                            </div>
                        </div>
                        {isPremiumUser ? (
                            <button className="flex items-center gap-2 px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-[9px] font-black uppercase hover:bg-white/10 transition-colors">
                                <Download size={14} /> Data Receipt
                            </button>
                        ) : (
                            !clientSecret && (
                                <button onClick={handleUpgrade} className="group relative px-10 py-4 bg-white text-black rounded-2xl text-[9px] font-black uppercase overflow-hidden transition-all hover:pr-12">
                                    <span className="relative z-10">Upgrade Link</span>
                                    <Zap size={14} className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-all" />
                                </button>
                            )
                        )}
                    </div>
                    {clientSecret && activeSection === 'stripe' && (
                        <div className="mt-8 pt-8 border-t border-white/10 animate-in slide-in-from-bottom-8 duration-700">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-[10px] font-black uppercase tracking-widest italic text-(--accent-teal)">Secure Checkout Terminal</h3>
                                <button onClick={() => { setClientSecret(null); setActiveSection(null); }} className="text-[9px] font-black uppercase opacity-40 hover:opacity-100">Abort</button>
                            </div>
                            <StripeEmbedded clientSecret={clientSecret} />
                        </div>
                    )}
                </div>

                {/* 5. LOGOUT FOOTER */}
                <div className="flex justify-center pt-6">
                    <button
                        onClick={() => supabase.auth.signOut()}
                        className="group flex items-center gap-3 px-6 py-3 text-[10px] font-black uppercase opacity-30 hover:opacity-100 hover:text-red-500 transition-all duration-300"
                    >
                        <LogOut size={16} className="group-hover:-translate-x-1 transition-transform" />
                        Disconnect Neural Link
                    </button>
                </div>
            </div>
        </div>
    );
}