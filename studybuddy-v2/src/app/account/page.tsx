"use client";

import { useStudyStore } from "@/store/useStudyStore";
import {
    User, Mail, Lock, Trash2, Crown, LogOut,
    Camera, CheckCircle2, AlertCircle, RefreshCcw, X, ShieldAlert, ShieldCheck
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import StripeEmbedded from "@/components/EmbeddedCheckout";

export default function AccountPage() {
    const {
        isPremiumUser, level, displayName, userEmail, setUserEmail, triggerChumToast
    } = useStudyStore();

    // UI States
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);
    const [isVerified, setIsVerified] = useState(false);
    const [loading, setLoading] = useState(false);

    // Cooldown/Meta States
    const [meta, setMeta] = useState({
        firstName: "",
        fullName: "",
        lastIdentityUpdate: 0,
        lastDisplayUpdate: 0
    });

    // Form States
    const [formData, setFormData] = useState({
        newDisplayName: displayName || "",
        newFirstName: "",
        newFullName: "",
        newEmail: "",
        newPassword: "",
        confirmPassword: ""
    });

    useEffect(() => {
        const syncUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || "");
                setIsVerified(!!user.email_confirmed_at);
                setMeta({
                    firstName: user.user_metadata?.first_name || "",
                    fullName: user.user_metadata?.full_name || "",
                    lastIdentityUpdate: user.user_metadata?.last_identity_update || 0,
                    lastDisplayUpdate: user.user_metadata?.last_display_update || 0,
                });
                setFormData(prev => ({
                    ...prev,
                    newDisplayName: user.user_metadata?.display_name || "",
                    newFirstName: user.user_metadata?.first_name || "",
                    newFullName: user.user_metadata?.full_name || ""
                }));
            }
        };
        syncUser();
    }, [setUserEmail, displayName]);

    // --- LOGIC HELPERS ---

    const checkCooldown = (lastUpdate: number, days: number) => {
        if (!lastUpdate) return true;
        const msPerDay = 24 * 60 * 60 * 1000;
        const now = Date.now();
        return (now - lastUpdate) > (days * msPerDay);
    };

    // --- ACTION HANDLERS ---

    const handleUpdateIdentity = () => {
        const isNameChanging = formData.newFirstName !== meta.firstName || formData.newFullName !== meta.fullName;
        const isDisplayChanging = formData.newDisplayName !== displayName;

        if (isNameChanging && !checkCooldown(meta.lastIdentityUpdate, 30)) {
            return triggerChumToast("Legal identity locked for 30 days.", "warning");
        }
        if (isDisplayChanging && !checkCooldown(meta.lastDisplayUpdate, 7)) {
            return triggerChumToast("Display name locked for 7 days.", "warning");
        }

        setActiveModal('confirm-identity');
    };

    const commitIdentity = async () => {
        setLoading(true);
        const now = Date.now();
        const updateData: any = {
            display_name: formData.newDisplayName,
            first_name: formData.newFirstName,
            full_name: formData.newFullName,
        };

        // Only update timestamps if the value actually changed
        if (formData.newFirstName !== meta.firstName || formData.newFullName !== meta.fullName) {
            updateData.last_identity_update = now;
        }
        if (formData.newDisplayName !== displayName) {
            updateData.last_display_update = now;
        }

        const { error } = await supabase.auth.updateUser({ data: updateData });

        if (error) triggerChumToast(error.message, "warning");
        else {
            triggerChumToast("Identity synchronized.", "success");
            setActiveModal(null);
            setTimeout(() => window.location.reload(), 1000);
        }
        setLoading(false);
    };

    const handlePasswordChange = async () => {
        if (formData.newPassword.length < 6) return triggerChumToast("Cipher must be 6+ chars.", "warning");
        if (formData.newPassword !== formData.confirmPassword) return triggerChumToast("Ciphers do not match.", "warning");

        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password: formData.newPassword });
        if (error) triggerChumToast(error.message, "warning");
        else {
            triggerChumToast("Security cipher updated.", "success");
            setActiveModal(null);
        }
        setLoading(false);
    };

    const handleEmailChange = async () => {
        if (!formData.newEmail.includes("@")) return triggerChumToast("Invalid relay address.", "warning");
        setLoading(true);
        const { error } = await supabase.auth.updateUser({ email: formData.newEmail });
        if (error) triggerChumToast(error.message, "warning");
        else {
            triggerChumToast("Check both emails to confirm migration.", "success");
            setActiveModal(null);
        }
        setLoading(false);
    };

    const handleDeleteAccount = async () => {
        setLoading(true);
        // Note: For true deletion, you usually call a Supabase Edge Function 
        // because users cannot delete themselves via the Client SDK for security.
        const { error } = await supabase.rpc('delete_user_own_account');

        if (error) triggerChumToast("Contact admin for manual archive.", "warning");
        else {
            await supabase.auth.signOut();
            window.location.href = "/";
        }
        setLoading(false);
    };

    return (
        <div className="min-h-full w-full flex flex-col items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-2xl space-y-6">

                {/* Profile Header */}
                <div className="flex flex-col md:flex-row items-center gap-6 bg-white/5 border border-white/10 p-8 rounded-[40px] backdrop-blur-sm">
                    <div className="w-24 h-24 rounded-full border-2 border-(--accent-teal)/30 p-1 bg-(--bg-card) flex items-center justify-center">
                        <User size={40} className="text-(--accent-teal)" />
                    </div>
                    <div className="text-center md:text-left flex-1">
                        <h1 className="text-2xl font-black uppercase italic tracking-tighter">{displayName || "Architect"}</h1>
                        <p className="text-[10px] font-bold opacity-40 uppercase tracking-[0.2em]">{userEmail}</p>
                        <div className="flex gap-2 mt-3 justify-center md:justify-start">
                            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase flex items-center gap-1 ${isVerified ? 'bg-teal-500/10 text-teal-400' : 'bg-red-500/10 text-red-400'}`}>
                                {isVerified ? <ShieldCheck size={8} /> : <AlertCircle size={8} />}
                                {isVerified ? 'Verified' : 'Unverified'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Grid Navigation */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <button onClick={() => setActiveModal('identity')} className="flex flex-col items-center gap-2 p-5 rounded-[32px] border bg-white/5 border-white/10 hover:bg-white/10 transition-all">
                        <User size={16} /><span className="text-[9px] font-black uppercase tracking-widest">Identity</span>
                    </button>
                    <button onClick={() => setActiveModal('email')} className="flex flex-col items-center gap-2 p-5 rounded-[32px] border bg-white/5 border-white/10 hover:bg-white/10 transition-all">
                        <Mail size={16} /><span className="text-[9px] font-black uppercase tracking-widest">Relay</span>
                    </button>
                    <button onClick={() => setActiveModal('password')} className="flex flex-col items-center gap-2 p-5 rounded-[32px] border bg-white/5 border-white/10 hover:bg-white/10 transition-all">
                        <Lock size={16} /><span className="text-[9px] font-black uppercase tracking-widest">Cipher</span>
                    </button>
                    <button onClick={() => setActiveModal('delete')} className="flex flex-col items-center gap-2 p-5 rounded-[32px] border bg-white/5 border-white/10 hover:border-red-500/50 text-red-400 transition-all">
                        <Trash2 size={16} /><span className="text-[9px] font-black uppercase tracking-widest">Archive</span>
                    </button>
                </div>

                <div className="flex justify-center pt-6">
                    <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-3 text-[10px] font-black uppercase opacity-20 hover:opacity-100 hover:text-red-500 transition-all">
                        <LogOut size={16} /> Disconnect Session
                    </button>
                </div>
            </div>

            {/* --- MODAL SYSTEM --- */}
            {activeModal && (
                <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-(--bg-card) border border-white/10 w-full max-w-md rounded-[40px] relative shadow-2xl flex flex-col p-8" onClick={(e) => e.stopPropagation()}>
                        <button onClick={() => setActiveModal(null)} className="absolute top-6 right-6 p-2 rounded-full bg-white/5 hover:bg-white/10 z-10"><X size={16} /></button>

                        {/* Identity Config */}
                        {activeModal === 'identity' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-black uppercase italic tracking-tighter">Identity Config</h2>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black uppercase opacity-30 ml-2">First Name</label>
                                            <input value={formData.newFirstName} onChange={e => setFormData({ ...formData, newFirstName: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs outline-none focus:border-(--accent-teal)" />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[8px] font-black uppercase opacity-30 ml-2">Full Name</label>
                                            <input value={formData.newFullName} onChange={e => setFormData({ ...formData, newFullName: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs outline-none focus:border-(--accent-teal)" />
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[8px] font-black uppercase opacity-30 ml-2">Display Name (7d Lock)</label>
                                        <input value={formData.newDisplayName} onChange={e => setFormData({ ...formData, newDisplayName: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs outline-none focus:border-(--accent-teal)" />
                                    </div>
                                    <button onClick={handleUpdateIdentity} className="w-full py-4 bg-(--accent-teal) text-black rounded-2xl text-[10px] font-black uppercase">Verify Changes</button>
                                </div>
                            </div>
                        )}

                        {/* Confirmation Modal */}
                        {activeModal === 'confirm-identity' && (
                            <div className="space-y-6 text-center py-4">
                                <ShieldAlert size={40} className="mx-auto text-(--accent-teal)" />
                                <h2 className="text-xl font-black uppercase italic">Sync Changes?</h2>
                                <p className="text-[10px] uppercase font-bold opacity-40 leading-relaxed">Identity locks for 30 days. Display name for 7 days. Proceed?</p>
                                <div className="flex gap-4 pt-4">
                                    <button onClick={() => setActiveModal('identity')} className="flex-1 py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase">Abort</button>
                                    <button onClick={commitIdentity} disabled={loading} className="flex-1 py-4 bg-(--accent-teal) text-black rounded-2xl text-[10px] font-black uppercase">
                                        {loading ? <RefreshCcw className="animate-spin mx-auto" size={14} /> : "Commit"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Password Modal */}
                        {activeModal === 'password' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-black uppercase italic tracking-tighter">Update Cipher</h2>
                                <div className="space-y-4">
                                    <input type="password" placeholder="New Password" value={formData.newPassword} onChange={e => setFormData({ ...formData, newPassword: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs outline-none focus:border-(--accent-teal)" />
                                    <input type="password" placeholder="Confirm Password" value={formData.confirmPassword} onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs outline-none focus:border-(--accent-teal)" />
                                    <button onClick={handlePasswordChange} disabled={loading} className="w-full py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase">
                                        {loading ? <RefreshCcw className="animate-spin mx-auto" size={14} /> : "Update Password"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Email Modal */}
                        {activeModal === 'email' && (
                            <div className="space-y-6">
                                <h2 className="text-xl font-black uppercase italic tracking-tighter">Relay Route</h2>
                                <div className="space-y-4">
                                    <input type="email" placeholder="New Email Address" value={formData.newEmail} onChange={e => setFormData({ ...formData, newEmail: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs outline-none focus:border-(--accent-teal)" />
                                    <button onClick={handleEmailChange} disabled={loading} className="w-full py-4 bg-white text-black rounded-2xl text-[10px] font-black uppercase">
                                        {loading ? <RefreshCcw className="animate-spin mx-auto" size={14} /> : "Migrate Route"}
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Delete Modal */}
                        {activeModal === 'delete' && (
                            <div className="space-y-6 text-center py-4">
                                <Trash2 size={40} className="mx-auto text-red-500" />
                                <h2 className="text-xl font-black uppercase italic">Terminate Account?</h2>
                                <p className="text-[10px] uppercase font-bold opacity-40">This action is irreversible. All progress will be wiped.</p>
                                <div className="flex gap-4">
                                    <button onClick={() => setActiveModal(null)} className="flex-1 py-4 bg-white/5 rounded-2xl text-[10px] font-black uppercase">Abort</button>
                                    <button onClick={handleDeleteAccount} disabled={loading} className="flex-1 py-4 bg-red-600 text-white rounded-2xl text-[10px] font-black uppercase">
                                        {loading ? <RefreshCcw className="animate-spin mx-auto" size={14} /> : "Confirm Wipe"}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}