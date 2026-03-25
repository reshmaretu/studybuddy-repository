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
        displayName, isVerified, setDisplayName
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

        if (query.get('success')) {
            // 🔥 Trigger the sleek Chum bubble to show the uplink is in progress
            triggerChumToast("Neural upgrade detected. Finalizing uplink...", "normal");

            let attempts = 0;
            const maxAttempts = 10; // Try for up to 20 seconds

            const interval = setInterval(async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return clearInterval(interval);

                // Fetch the 'is_premium' flag directly from the database
                const { data } = await supabase
                    .from('profiles')
                    .select('is_premium')
                    .eq('id', user.id)
                    .single();

                if (data?.is_premium) {
                    // ✅ Uplink Complete: Update the global Zustand store
                    useStudyStore.setState({ isPremiumUser: true });

                    // Alert the user with the final success toast
                    triggerChumToast("Uplink Complete. Welcome to StudyBuddy Plus, Architect.", "normal");

                    // Clear the URL params so it doesn't poll again on next refresh
                    window.history.replaceState({}, document.title, window.location.pathname);

                    clearInterval(interval);
                }

                attempts++;
                if (attempts >= maxAttempts) {
                    clearInterval(interval);
                    triggerChumToast("Uplink taking longer than expected. Please check your signal.", "warning");
                }
            }, 2000); // Check every 2 seconds

            return () => clearInterval(interval);
        }
    }, [triggerChumToast]);

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
            const res = await fetch("/api/checkout", {
                method: "POST",
                body: JSON.stringify({ userId: user?.id, email: user?.email }),
            });
            const { url } = await res.json();
            window.location.href = url;
        } catch (error) {
            toast.error("Stripe uplink failed.");
        } finally {
            setLoading(false);
        }
    };

    const { triggerChumToast } = useStudyStore();

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
        <div className="h-screen max-w-6xl mx-auto p-4 md:p-8 flex flex-col gap-6 overflow-hidden relative">
            {/* TOP IDENTITY HEADER */}
            <header className="flex items-center justify-between bg-(--bg-card) border border-(--border-color) rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-6">
                    <div className="relative group">
                        <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-(--accent-teal) to-(--accent-cyan) flex items-center justify-center border-4 border-(--bg-dark) shadow-xl overflow-hidden">
                            <User size={40} className="text-[#0b1211]" />
                        </div>
                        <button className="absolute bottom-0 right-0 p-1.5 bg-(--accent-teal) rounded-full text-[#0b1211] hover:scale-110 transition-transform shadow-lg">
                            <ArrowUpRight size={12} />
                        </button>
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-(--text-main) italic uppercase tracking-tight leading-none mb-1">
                            {displayName}
                        </h1>
                        <p className="text-sm text-(--text-muted) font-medium italic mb-2">{userEmail}</p>
                        <div className="flex gap-2">
                            {isVerified && (
                                <span className="px-2 py-0.5 bg-(--accent-teal)/10 border border-(--accent-teal)/30 rounded-full text-[8px] font-black text-(--accent-teal) uppercase flex items-center gap-1">
                                    <MailCheck size={8} /> Verified
                                </span>
                            )}
                            <span className="px-2 py-0.5 bg-(--accent-yellow)/10 border border-(--accent-yellow)/30 rounded-full text-[8px] font-black text-(--accent-yellow) uppercase tracking-widest">Level {level} Architect</span>
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

            {/* MAIN SETTINGS GRID */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-0">

                {/* LEFT COLUMN (60%) */}
                <div className="lg:col-span-7 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
                    <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onClick={() => setActiveModal('email')} className="group flex items-center justify-between p-5 bg-(--bg-card) border border-(--border-color) rounded-2xl hover:border-(--accent-teal)/50 transition-all text-left shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400"><MailCheck size={20} /></div>
                                <span className="text-sm font-bold text-(--text-main)">Change Email</span>
                            </div>
                            <ArrowUpRight size={16} className="text-(--text-muted) group-hover:text-(--accent-teal) transition-colors" />
                        </button>

                        <button onClick={() => setActiveModal('password')} className="group flex items-center justify-between p-5 bg-(--bg-card) border border-(--border-color) rounded-2xl hover:border-(--accent-teal)/50 transition-all text-left shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400"><ShieldAlert size={20} /></div>
                                <span className="text-sm font-bold text-(--text-main)">Security Reset</span>
                            </div>
                            <ArrowUpRight size={16} className="text-(--text-muted) group-hover:text-(--accent-teal) transition-colors" />
                        </button>

                        <button onClick={() => setActiveModal('identity')} className="group flex items-center justify-between p-5 bg-(--bg-card) border border-(--border-color) rounded-2xl hover:border-(--accent-teal)/50 transition-all text-left shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-teal-500/10 rounded-xl text-teal-400"><Terminal size={20} /></div>
                                <span className="text-sm font-bold text-(--text-main)">Update Identity</span>
                            </div>
                            <ArrowUpRight size={16} className="text-(--text-muted) group-hover:text-(--accent-teal) transition-colors" />
                        </button>

                        <button onClick={() => setActiveModal('delete')} className="group flex items-center justify-between p-5 bg-red-500/5 border border-red-500/10 rounded-2xl hover:bg-red-500/10 transition-all text-left shadow-sm">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-500/10 rounded-xl text-red-500"><AlertCircle size={20} /></div>
                                <span className="text-sm font-bold text-red-500">Terminate Account</span>
                            </div>
                        </button>
                    </section>

                    {/* SUBSCRIPTION STATUS BOX */}
                    <div className="bg-(--bg-card) border border-(--border-color) rounded-[32px] p-6 flex items-center justify-between shadow-sm">
                        <div className="flex items-center gap-6">
                            <div className={`p-4 rounded-2xl ${isPremiumUser ? 'bg-(--accent-yellow)/10 text-(--accent-yellow)' : 'bg-(--bg-dark) text-(--text-muted)'}`}>
                                {isPremiumUser ? <Crown size={32} /> : <Sparkles size={32} />}
                            </div>
                            <div>
                                <h4 className="text-lg font-black italic uppercase text-(--text-main)">
                                    {isPremiumUser ? "Plus Member" : "Standard Tier"}
                                </h4>
                                <p className="text-[10px] font-bold text-(--text-muted) uppercase tracking-widest mt-1">
                                    {isPremiumUser ? "Subscription Active • Automatic Receipts" : "Unlock Pro Tutor & Matrix Analytics"}
                                </p>
                            </div>
                        </div>
                        {isPremiumUser ? (
                            <button onClick={handleManageBilling} className="flex items-center gap-2 px-6 py-3 bg-(--bg-dark) border border-(--border-color) rounded-xl text-[10px] font-black uppercase text-(--accent-teal) hover:border-(--accent-teal) transition-all shadow-sm">
                                <CreditCard size={14} /> Portal & PDFs
                            </button>
                        ) : (
                            <button onClick={handleUpgrade} disabled={loading} className="px-6 py-3 bg-(--accent-teal) text-[#0b1211] rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-teal-500/20 active:scale-95 transition-all">
                                {loading ? "..." : "Upgrade"}
                            </button>
                        )}
                    </div>

                    <button
                        onClick={() => supabase.auth.signOut()}
                        className="w-full flex items-center justify-center gap-3 p-5 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-all text-xs font-black uppercase tracking-widest text-(--text-muted)"
                    >
                        <LogOut size={16} /> Signal Disconnect (Logout)
                    </button>
                </div>

                {/* RIGHT COLUMN (40%) */}
                <div className="lg:col-span-5 flex flex-col gap-4 min-h-0">
                    <div className="flex-1 bg-(--bg-card) border border-(--border-color) rounded-[32px] p-6 space-y-6 overflow-hidden flex flex-col shadow-sm">
                        <h3 className="text-sm font-black uppercase tracking-widest text-(--text-muted)">Neural Customization</h3>

                        <div className="space-y-3">
                            <button className="w-full p-4 bg-(--bg-dark) border border-(--accent-teal)/30 rounded-2xl text-left flex items-center justify-between shadow-inner">
                                <span className="text-xs font-bold text-(--text-main)">🌙 Dark Forest (Default)</span>
                                <div className="w-2 h-2 rounded-full bg-(--accent-teal) shadow-[0_0_10px_var(--accent-teal)]" />
                            </button>
                            <button className="w-full p-4 bg-white/5 border border-transparent rounded-2xl text-left text-xs font-bold text-(--text-muted) opacity-50 cursor-not-allowed">☀️ Morning Light</button>
                        </div>

                        <div className="mt-auto p-4 bg-(--bg-dark)/50 border border-(--border-color) rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-(--bg-card) flex items-center justify-center border border-(--border-color) text-xl shadow-sm">🤖</div>
                                <span className="text-[10px] font-black uppercase text-(--text-muted)">Chum Interface</span>
                            </div>
                            <span className="text-[8px] font-black uppercase text-(--accent-teal) bg-(--accent-teal)/10 px-2 py-1 rounded-md border border-(--accent-teal)/20">Online</span>
                        </div>
                    </div>

                    {isDev && (
                        <div className="bg-[#120808] border border-red-500/20 rounded-[32px] p-6 space-y-4">
                            <div className="flex items-center gap-3">
                                <ShieldAlert className="text-red-500" size={18} />
                                <h3 className="text-xs font-black text-white/80 uppercase tracking-widest font-mono">Architect Root</h3>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-black/40 rounded-2xl border border-white/5">
                                <div className="flex items-center gap-3">
                                    <Terminal size={14} className="text-red-500" />
                                    <span className="text-xs font-bold text-white/50">Dev Overlay</span>
                                </div>
                                <button
                                    onClick={() => setDevOverlayEnabled(!devOverlayEnabled)}
                                    className={`w-10 h-5 rounded-full transition-all relative ${devOverlayEnabled ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-white/10'}`}
                                >
                                    <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-transform ${devOverlayEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* NEURAL OVERLAY MODAL */}
            {activeModal && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-(--bg-dark)/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
                    <div className="w-full max-w-md bg-(--bg-card) border border-(--border-color) rounded-[40px] p-8 shadow-2xl space-y-6">
                        <div className="flex justify-between items-center border-b border-(--border-color) pb-4">
                            <h3 className="text-xl font-black italic uppercase text-(--text-main) tracking-tighter">
                                {activeModal === 'identity' ? 'Recalibrate Ident' :
                                    activeModal === 'email' ? 'Update Coordinate' :
                                        activeModal === 'delete' ? 'Danger: Termination' : 'Security Reset'}
                            </h3>
                            <button onClick={() => setActiveModal(null)} className="text-(--text-muted) hover:text-white transition-colors"><X size={20} /></button>
                        </div>

                        <div className="space-y-4">
                            {activeModal === 'password' ? (
                                <p className="text-xs text-(--text-muted) italic leading-relaxed bg-(--bg-dark) p-4 rounded-2xl border border-(--border-color)">
                                    Initiating this protocol will transmit a recovery link to your registered coordinate. Proceed with reset?
                                </p>
                            ) : (
                                <>
                                    <input
                                        type={activeModal === 'delete' ? 'password' : 'text'}
                                        placeholder={activeModal === 'email' ? 'New Neural Email...' : activeModal === 'delete' ? 'Enter Password to Confirm...' : 'New Display Name...'}
                                        value={inputValue}
                                        onChange={(e) => setInputValue(e.target.value)}
                                        className="w-full bg-(--bg-dark) border border-(--border-color) rounded-2xl px-6 py-5 text-sm text-(--text-main) outline-none focus:border-(--accent-teal) transition-all shadow-inner"
                                    />
                                    {activeModal === 'identity' && (
                                        <input
                                            placeholder="Legal Full Name (Optional)..."
                                            value={secondInputValue}
                                            onChange={(e) => setSecondInputValue(e.target.value)}
                                            className="w-full bg-(--bg-dark) border border-(--border-color) rounded-2xl px-6 py-5 text-sm text-(--text-main) outline-none focus:border-(--accent-teal) transition-all shadow-inner"
                                        />
                                    )}
                                </>
                            )}
                        </div>

                        <button
                            disabled={loading}
                            onClick={handleModalSubmit}
                            className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest text-sm transition-all active:scale-[0.98] ${activeModal === 'delete' ? 'bg-red-500 text-white shadow-[0_10px_20px_rgba(239,68,68,0.2)]' : 'bg-(--accent-teal) text-[#0b1211] shadow-[0_10px_20px_rgba(20,184,166,0.2)]'}`}
                        >
                            {loading ? 'Transmitting...' : 'Confirm Protocol'}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}