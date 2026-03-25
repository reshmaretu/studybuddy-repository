"use client";

import { useStudyStore } from "@/store/useStudyStore";
import {
    ShieldAlert, Terminal, Sparkles, CreditCard,
    History, Zap, Crown, User, ArrowUpRight,
    MailCheck, AlertCircle, X, LogOut
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function AccountPage() {
    // 🔥 State from Zustand Store
    const {
        isPremiumUser, isDev, devOverlayEnabled,
        setDevOverlayEnabled, level, focusScore,
        displayName, isVerified, setDisplayName, triggerChumToast
    } = useStudyStore();

    // UI States
    const [activeModal, setActiveModal] = useState<'email' | 'password' | 'identity' | 'delete' | null>(null);
    const [loading, setLoading] = useState(false);
    const [inputValue, setInputValue] = useState("");
    const [secondInputValue, setSecondInputValue] = useState(""); // Used for Full Name
    const [userEmail, setUserEmail] = useState("");

    // Fetch user email on mount for display
    useEffect(() => {
        const getEmail = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) setUserEmail(user.email);
        };
        getEmail();
    }, []);

    useEffect(() => {
        const query = new URLSearchParams(window.location.search);

        // 🔥 Detect return from Stripe
        if (query.get('success') && !isPremiumUser) {
            triggerChumToast("Neural upgrade detected. Finalizing uplink...", "normal");

            let attempts = 0;
            const maxAttempts = 10; // Try for 20 seconds total

            const interval = setInterval(async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return clearInterval(interval);

                // Fetch the 'is_premium' flag directly from the source of truth
                const { data } = await supabase
                    .from('profiles')
                    .select('is_premium')
                    .eq('id', user.id)
                    .single();

                if (data?.is_premium) {
                    // ✅ Update the global Zustand store instantly
                    useStudyStore.setState({ isPremiumUser: true });

                    triggerChumToast("Uplink Complete. Welcome to StudyBuddy Plus, Architect.", "normal");

                    // Clean up the URL for a professional look
                    window.history.replaceState({}, document.title, window.location.pathname);
                    clearInterval(interval);
                }

                attempts++;
                if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    triggerChumToast("Uplink taking longer than expected. Check your neural inbox (Email).", "warning");
                }
            }, 2000);

            return () => clearInterval(interval);
        }
    }, [isPremiumUser, triggerChumToast]);

    // ─── ACTION HANDLERS ───

    const handleModalSubmit = async () => {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            if (activeModal === 'email') {
                const { error } = await supabase.auth.updateUser({ email: inputValue });
                if (error) throw error;
                toast.success("Coordinates updated. Check your new inbox.");
            }
            else if (activeModal === 'password') {
                const { error } = await supabase.auth.resetPasswordForEmail(user.email!, {
                    redirectTo: `${window.location.origin}/auth/reset-password`,
                });
                if (error) throw error;
                toast.success("Security reset link transmitted.");
            }
            else if (activeModal === 'identity') {
                // Cooldown logic
                const { data: profile } = await supabase.from('profiles').select('last_display_name_change').eq('id', user.id).single();
                const daysSince = (new Date().getTime() - new Date(profile?.last_display_name_change || 0).getTime()) / (1000 * 3600 * 24);

                if (daysSince < 7) {
                    toast.error(`Neural cooldown: ${Math.ceil(7 - daysSince)} days remaining.`);
                } else {
                    await setDisplayName(inputValue);
                    if (secondInputValue) {
                        await supabase.from('profiles').update({
                            full_name: secondInputValue,
                            last_full_name_change: new Date().toISOString()
                        }).eq('id', user.id);
                    }
                    toast.success("Identity recalibrated.");
                }
            }
            else if (activeModal === 'delete') {
                const { error: authError } = await supabase.auth.signInWithPassword({ email: user.email!, password: inputValue });
                if (authError) throw new Error("Incorrect credentials.");

                const res = await fetch('/api/auth/delete-user', { method: 'POST' });
                if (res.ok) {
                    await supabase.auth.signOut();
                    window.location.href = "/";
                }
            }
            setActiveModal(null);
            setInputValue("");
            setSecondInputValue("");
        } catch (err: any) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleUpgrade = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                triggerChumToast("Neural link unstable. Please log in again.", "warning");
                return;
            }

            const res = await fetch("/api/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    userId: user.id, // 🔥 Ensures ID is not undefined
                    email: user.email
                }),
            });

            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                throw new Error("No session URL received.");
            }
        } catch (error) {
            triggerChumToast("Stripe uplink failed. Check your connection.", "warning");
        } finally {
            setLoading(false);
        }
    };

    const handleManageBilling = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/checkout/portal", { method: "POST" });
            const data = await res.json();

            if (!res.ok) {
                // 🔥 This pipes the error directly into the sleek Chum bubble
                triggerChumToast(data.error, "warning");
                return;
            }

            window.location.href = data.url;
        } catch (error) {
            triggerChumToast("Network disruption: Could not reach billing server.", "warning");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen max-w-4xl mx-auto p-6 md:p-10 flex flex-col overflow-hidden relative">
            {/* IDENTITY HEADER */}
            <header className="bg-(--bg-card) border border-(--border-color) rounded-[32px] p-8 mb-6 shadow-sm">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-(--accent-teal) to-(--accent-cyan) flex items-center justify-center border-4 border-(--bg-dark) shadow-xl">
                            <User size={48} className="text-[#0b1211]" />
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
                    <div className="text-right flex flex-col items-end">
                        <p className="text-[10px] font-black text-(--text-muted) uppercase tracking-[0.2em]">Neural Focus</p>
                        <div className="flex items-center gap-2">
                            <span className="text-3xl font-black text-(--accent-teal)">{focusScore}%</span>
                            <Zap size={24} className="text-(--accent-yellow)" />
                        </div>
                    </div>
                </div>
            </header>

            {/* SETTINGS GRID - Takes up remaining space */}
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <button onClick={() => setActiveModal('email')} className="flex items-center gap-5 p-6 bg-(--bg-card) border border-(--border-color) rounded-[24px] hover:border-(--accent-teal)/50 transition-all text-left group shadow-sm">
                    <div className="p-4 bg-blue-500/10 rounded-2xl text-blue-400 group-hover:scale-110 transition-transform"><MailCheck size={24} /></div>
                    <span className="font-bold text-(--text-main)">Change Email</span>
                </button>
                <button onClick={() => setActiveModal('password')} className="flex items-center gap-5 p-6 bg-(--bg-card) border border-(--border-color) rounded-[24px] hover:border-(--accent-teal)/50 transition-all text-left group shadow-sm">
                    <div className="p-4 bg-indigo-500/10 rounded-2xl text-indigo-400 group-hover:scale-110 transition-transform"><ShieldAlert size={24} /></div>
                    <span className="font-bold text-(--text-main)">Security Reset</span>
                </button>
                <button onClick={() => setActiveModal('identity')} className="flex items-center gap-5 p-6 bg-(--bg-card) border border-(--border-color) rounded-[24px] hover:border-(--accent-teal)/50 transition-all text-left group shadow-sm">
                    <div className="p-4 bg-teal-500/10 rounded-2xl text-teal-400 group-hover:scale-110 transition-transform"><Terminal size={24} /></div>
                    <span className="font-bold text-(--text-main)">Update Identity</span>
                </button>
                <button onClick={() => setActiveModal('delete')} className="flex items-center gap-5 p-6 bg-red-500/5 border border-red-500/10 rounded-[24px] hover:bg-red-500/10 transition-all text-left group shadow-sm">
                    <div className="p-4 bg-red-500/10 rounded-2xl text-red-500 group-hover:scale-110 transition-transform"><AlertCircle size={24} /></div>
                    <span className="font-bold text-red-500">Terminate Account</span>
                </button>

                {/* SUBSCRIPTION CARD - Spans both columns if on desktop */}
                <div className="md:col-span-2 bg-(--bg-card) border border-(--border-color) rounded-[32px] p-8 flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-6">
                        <div className={`p-5 rounded-2xl ${isPremiumUser ? 'bg-(--accent-yellow)/10 text-(--accent-yellow)' : 'bg-(--bg-dark) text-(--text-muted)'}`}>
                            {isPremiumUser ? <Crown size={40} /> : <Sparkles size={40} />}
                        </div>
                        <div>
                            <h4 className="text-xl font-black italic uppercase text-(--text-main)">{isPremiumUser ? "Plus Member" : "Standard Tier"}</h4>
                            <p className="text-xs font-bold text-(--text-muted) uppercase tracking-widest mt-1">{isPremiumUser ? "Subscription Active • Automatic Receipts" : "Unlock Pro Tutor & Matrix Analytics"}</p>
                        </div>
                    </div>
                    {isPremiumUser ? (
                        <button onClick={handleManageBilling} className="px-8 py-4 bg-(--bg-dark) border border-(--border-color) rounded-2xl text-xs font-black uppercase text-(--accent-teal) hover:border-(--accent-teal) transition-all">Portal & PDFs</button>
                    ) : (
                        <button onClick={handleUpgrade} disabled={loading} className="px-8 py-4 bg-(--accent-teal) text-[#0b1211] rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-teal-500/20 active:scale-95 transition-all">
                            {loading ? "Transmitting..." : "Upgrade"}
                        </button>
                    )}
                </div>
            </div>

            {/* LOGOUT BUTTON - Snaps to bottom */}
            <button
                onClick={() => supabase.auth.signOut()}
                className="mt-auto w-full flex items-center justify-center gap-3 p-6 bg-white/5 border border-white/5 rounded-[24px] hover:bg-white/10 transition-all text-xs font-black uppercase tracking-[0.3em] text-(--text-muted)"
            >
                <LogOut size={18} /> Signal Disconnect (Logout)
            </button>

            {/* MODAL OVERLAY CODE (Keep your existing modal logic here) */}
        </div>
    );
}