"use client";

import { useStudyStore } from "@/store/useStudyStore";
import {
    User, Mail, Lock, Trash2, Crown, LogOut,
    ChevronRight, Camera, Download, X, Zap, ShieldAlert
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
    const [avatarTab, setAvatarTab] = useState<'personal' | 'chum'>('personal');
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    // Sync Auth Data on Mount to prevent "Neural Address" errors
    useEffect(() => {
        const syncUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) setUserEmail(user.email);
        };
        syncUser();
    }, [setUserEmail]);

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

    const handleLogout = async () => {
        await supabase.auth.signOut();
        window.location.href = "/login";
    };

    const resolvedIdentity = displayName || fullName || "Architect";

    return (
        <div className="max-w-md mx-auto flex flex-col items-center pt-12 pb-24 space-y-8 text-(--text-main)">

            {/* 1. PROFILE PICTURE HEADER */}
            <div className="relative group cursor-pointer" onClick={() => setActiveModal('avatar')}>
                <div className="w-32 h-32 rounded-full border-4 border-(--accent-teal)/20 p-1 bg-(--bg-card) flex items-center justify-center overflow-hidden transition-transform group-hover:scale-105 shadow-2xl">
                    <User size={64} className="text-(--accent-teal)" />
                </div>
                <div className="absolute bottom-1 right-1 bg-(--accent-teal) p-2 rounded-full text-[#0b1211] shadow-lg border-2 border-(--bg-dark)">
                    <Camera size={16} />
                </div>
            </div>

            {/* 2. IDENTITY BLOCK */}
            <div className="text-center space-y-1">
                <h1 className="text-3xl font-black uppercase italic tracking-tighter">{resolvedIdentity}</h1>
                <div className="flex items-center justify-center gap-2 opacity-60">
                    <Mail size={12} className="text-(--accent-teal)" />
                    <p className="text-[10px] font-bold uppercase tracking-widest">
                        {userEmail || "NO_NEURAL_LINK"}
                    </p>
                </div>
            </div>

            {/* 3. STATS DISPLAY */}
            <div className="grid grid-cols-2 gap-4 w-full px-4">
                <div className="bg-white/5 border border-white/10 rounded-[24px] p-5 text-center group hover:border-(--accent-teal)/30 transition-colors">
                    <span className="block text-[8px] font-black uppercase text-(--text-muted) mb-1 tracking-[0.2em]">Focus Score</span>
                    <div className="flex items-center justify-center gap-2">
                        <span className="text-2xl font-black text-(--accent-teal)">{focusScore}</span>
                        <Zap size={14} className="text-(--accent-yellow) fill-(--accent-yellow)" />
                    </div>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-[24px] p-5 text-center group hover:border-white/30 transition-colors">
                    <span className="block text-[8px] font-black uppercase text-(--text-muted) mb-1 tracking-[0.2em]">Scholar Level</span>
                    <span className="text-2xl font-black text-white">{level}</span>
                </div>
            </div>

            {/* 4. SLEEK ACTION BUTTONS */}
            <div className="w-full space-y-2 px-4">
                {[
                    { icon: <User size={18} />, label: "Update Identity", id: "identity" },
                    { icon: <Mail size={18} />, label: "Modify Neural Link", id: "email" },
                    { icon: <Lock size={18} />, label: "Recode Password", id: "password" },
                    { icon: <Trash2 size={18} />, label: "Terminate Account", id: "delete", color: "text-red-400" },
                ].map((btn) => (
                    <button
                        key={btn.id}
                        onClick={() => setActiveModal(btn.id)}
                        className={`w-full group flex items-center justify-between p-5 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 transition-all ${btn.color || ""}`}
                    >
                        <div className="flex items-center gap-4">
                            <span className="opacity-40 group-hover:opacity-100 transition-opacity">{btn.icon}</span>
                            <span className="text-[10px] font-black uppercase tracking-widest">{btn.label}</span>
                        </div>
                        <ChevronRight size={14} className="opacity-20 group-hover:opacity-100 transition-transform group-hover:translate-x-1" />
                    </button>
                ))}
            </div>

            {/* 5. SUBSCRIPTION STATUS & STRIPE */}
            <div className="w-full px-4 pt-4">
                <div className={`p-8 rounded-[40px] border flex flex-col items-center gap-4 text-center transition-all ${isPremiumUser ? 'bg-(--accent-teal)/5 border-(--accent-teal)/20 shadow-[0_0_40px_rgba(45,212,191,0.05)]' : 'bg-white/5 border-white/10'}`}>
                    {isPremiumUser ? (
                        <>
                            <div className="w-16 h-16 bg-(--accent-teal)/10 rounded-full flex items-center justify-center mb-2">
                                <Crown className="text-(--accent-teal)" size={32} />
                            </div>
                            <div>
                                <h3 className="text-xs font-black uppercase tracking-tighter">Grandmaster Access Active</h3>
                                <button className="mt-6 flex items-center gap-2 text-[9px] font-black uppercase opacity-40 hover:opacity-100 transition-opacity mx-auto">
                                    <Download size={14} /> Download Latest Receipt (PDF)
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            {clientSecret ? (
                                <div className="w-full animate-in fade-in zoom-in duration-300">
                                    <StripeEmbedded clientSecret={clientSecret} />
                                    <button onClick={() => setClientSecret(null)} className="mt-4 text-[9px] font-black uppercase opacity-30 hover:opacity-100">Cancel Initialization</button>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-[10px] font-black uppercase italic opacity-30 tracking-[0.3em]">Standard Protocol</h3>
                                    <button
                                        onClick={handleUpgrade}
                                        disabled={loading}
                                        className="w-full py-5 bg-white text-black rounded-2xl text-[10px] font-black uppercase hover:bg-(--accent-teal) transition-all active:scale-95 disabled:opacity-50"
                                    >
                                        {loading ? "Synchronizing..." : "Upgrade to Premium"}
                                    </button>
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* 6. LOGOUT FOOTER */}
            <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-[10px] font-black uppercase text-white/20 hover:text-red-500 transition-colors pt-8 group"
            >
                <LogOut size={14} className="group-hover:-translate-x-1 transition-transform" />
                Sever Connection (Logout)
            </button>

            {/* --- AVATAR MODAL --- */}
            {activeModal === 'avatar' && (
                <div className="fixed inset-0 z-[800] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-200">
                    <div className="bg-(--bg-card) border border-white/10 w-full max-w-sm rounded-[40px] overflow-hidden shadow-2xl">
                        <div className="flex bg-white/5 p-2 gap-1">
                            <button
                                onClick={() => setAvatarTab('personal')}
                                className={`flex-1 py-4 text-[10px] font-black uppercase rounded-[24px] transition-all ${avatarTab === 'personal' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                            >
                                Personal
                            </button>
                            <button
                                onClick={() => setAvatarTab('chum')}
                                className={`flex-1 py-4 text-[10px] font-black uppercase rounded-[24px] transition-all ${avatarTab === 'chum' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                            >
                                Chum Avatar
                            </button>
                        </div>

                        <div className="p-12 text-center">
                            {avatarTab === 'personal' ? (
                                <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-300">
                                    <div className="w-28 h-28 bg-white/5 rounded-full mx-auto border-2 border-dashed border-white/10 flex items-center justify-center group hover:border-(--accent-teal)/50 transition-colors cursor-pointer">
                                        <Camera size={32} className="opacity-20 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase opacity-30 tracking-widest px-4">Upload a high-res neural snapshot</p>
                                    <label className="block w-full py-5 bg-(--accent-teal) text-[#0b1211] rounded-2xl text-[10px] font-black uppercase cursor-pointer hover:scale-105 transition-transform shadow-lg shadow-teal-500/20">
                                        Browse Files
                                        <input type="file" className="hidden" />
                                    </label>
                                </div>
                            ) : (
                                <div className="py-12 flex flex-col items-center gap-4 animate-in slide-in-from-bottom-4 duration-300">
                                    <div className="w-20 h-20 bg-(--accent-teal)/5 rounded-full flex items-center justify-center">
                                        <Zap size={32} className="text-(--accent-teal) opacity-20" />
                                    </div>
                                    <p className="text-[10px] uppercase font-black tracking-[0.3em] opacity-30 italic">
                                        Chum Synthesis Offline
                                    </p>
                                </div>
                            )}
                            <button onClick={() => setActiveModal(null)} className="mt-12 text-[10px] font-black uppercase opacity-20 hover:opacity-100 transition-opacity flex items-center gap-2 mx-auto">
                                <X size={12} /> Close Overlay
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* RE-USING YOUR DELETE MODAL STRUCTURE FOR CONSISTENCY */}
            {activeModal === 'delete' && (
                <div className="fixed inset-0 z-[900] bg-black/95 backdrop-blur-md flex items-center justify-center p-6">
                    <div className="bg-(--bg-card) border border-red-500/20 w-full max-w-sm rounded-[40px] p-10 text-center shadow-[0_0_50px_rgba(239,68,68,0.1)]">
                        <ShieldAlert size={48} className="text-red-500 mx-auto mb-6" />
                        <h2 className="text-2xl font-black uppercase italic tracking-tighter">Terminate?</h2>
                        <p className="text-[10px] font-bold text-(--text-muted) uppercase mt-4 mb-10 tracking-widest leading-relaxed px-4">
                            This will permanently sever your link to the central matrix. All study data will be purged.
                        </p>
                        <div className="flex gap-4">
                            <button onClick={() => setActiveModal(null)} className="flex-1 py-5 bg-white/5 rounded-2xl text-[10px] font-black uppercase hover:bg-white/10 transition-colors">Abort</button>
                            <button className="flex-1 py-5 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-red-500/20">Terminate</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}