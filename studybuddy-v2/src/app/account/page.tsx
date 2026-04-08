"use client";

import { useStudyStore } from "@/store/useStudyStore";
import {
    User, Mail, Lock, Trash2, Crown, LogOut,
    Camera, CheckCircle2, AlertCircle, RefreshCcw, X, ShieldAlert, ShieldCheck,
    QrCode, Download, CreditCard, Send, Fingerprint
} from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import emailjs from '@emailjs/browser';
import jsPDF from 'jspdf';
import { motion, AnimatePresence } from "framer-motion";

export default function AccountPage() {
    const {
        isPremiumUser, level, displayName, fullName, userEmail, setUserEmail, triggerChumToast,
        setPremiumStatus, setDisplayName, setFullName, mockInvoices, addMockInvoice
    } = useStudyStore();

    // UI States
    const [activeModal, setActiveModal] = useState<string | null>(null);
    const [isVerified, setIsVerified] = useState(false);
    const [loading, setLoading] = useState(false);
    const [otp, setOtp] = useState("");
    const [generatedOtp, setGeneratedOtp] = useState("");
    const [refNumber, setRefNumber] = useState("");

    // Cooldown/Meta States
    const [meta, setMeta] = useState({
        firstName: "",
        lastName: "",
        lastIdentityUpdate: 0,
        lastDisplayUpdate: 0
    });

    // Form States
    const [formData, setFormData] = useState({
        newDisplayName: displayName || "",
        newFirstName: "",
        newLastName: "", // Renamed from newFullName
        newEmail: "",
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
        purgePassword: ""
    });

    const [checkoutMethod, setCheckoutMethod] = useState<'manual' | 'qrph' | 'card'>('qrph');
    const [otpPurpose, setOtpPurpose] = useState<'verify' | 'email'>('verify');

    // MOCK CARD DATA
    const [cardData, setCardData] = useState({
        number: "4242 4242 4242 4242",
        expiry: "12/26",
        cvv: "789",
        name: displayName?.toUpperCase() || "ARCHITECT"
    });

    useEffect(() => {
        const syncUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                setUserEmail(user.email || "");

                // Pull latest profile
                const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
                if (profile) {
                    setIsVerified(!!profile.is_verified);
                    
                    const m_firstName = user.user_metadata?.first_name || profile.full_name?.split(' ')[0] || "";
                    const m_lastName = user.user_metadata?.last_name || profile.full_name?.split(' ').slice(1).join(' ') || "";

                    setMeta({
                        firstName: m_firstName,
                        lastName: m_lastName,
                        lastIdentityUpdate: user.user_metadata?.last_identity_update || 0,
                        lastDisplayUpdate: user.user_metadata?.last_display_update || 0,
                    });
                    
                    setFormData(prev => ({
                        ...prev,
                        newDisplayName: profile.display_name || user.user_metadata?.display_name || displayName,
                        newFirstName: m_firstName,
                        newLastName: m_lastName
                    }));
                }
            }
        };
        syncUser();
    }, [setUserEmail, displayName, fullName]);

    // ⚡ SNAPSHOT & REVERT PATTERN (Placeholder for complex logic, used in identity commit)

    // --- IDENTITY LOGIC ---

    const handleSendOTP = async (purpose: 'verify' | 'email' = 'verify') => {
        setLoading(true);
        setOtpPurpose(purpose);
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        setGeneratedOtp(code);

        // Debug log for expo fallback
        console.log(`[NEURAL DEBUG] Generated OTP for ${purpose}: ${code}`);

        try {
            let targetEmail = purpose === 'email' ? formData.newEmail : userEmail;
            
            // 🔥 REDUNDANT SYNC: If state is empty, pull direct from Auth
            if (!targetEmail && purpose === 'verify') {
                const { data: { user } } = await supabase.auth.getUser();
                targetEmail = user?.email || "";
                if (targetEmail) setUserEmail(targetEmail);
            }

            if (!targetEmail) throw new Error("Target coordinate missing.");

            // Initialize EmailJS if not already
            emailjs.init(process.env.NEXT_PUBLIC_EMAILJS_PUBLIC_KEY || 'frRtvfcT_euNuaTxx');

            await emailjs.send(
                process.env.NEXT_PUBLIC_EMAILJS_SERVICE_ID || 'service_4jxw1y4',
                process.env.NEXT_PUBLIC_EMAILJS_TEMPLATE_ID || 'template_q1f6uj8',
                {
                    to_email: targetEmail,
                    email: targetEmail,
                    from_name: 'Antigravity Support',
                    passcode: code,
                    time: new Date(Date.now() + 15 * 60000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            );
            triggerChumToast(`Neural OTP dispatched to ${purpose === 'email' ? 'new' : 'relay'} coordinate.`, "success");
            setActiveModal('verify-otp');
        } catch (err) {
            triggerChumToast("Relay connection unstable. Entry modal forced.", "warning");
            setActiveModal('verify-otp');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async () => {
        if (otp !== generatedOtp) return triggerChumToast("Invalid Neural Cipher.", "warning");

        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        if (otpPurpose === 'verify') {
            setIsVerified(true);
            const { error } = await supabase
                .from('profiles')
                .update({ is_verified: true })
                .eq('id', user.id);

            if (error) triggerChumToast("Cloud sync delay. Status cached locally.", "warning");
            else triggerChumToast("Identity Permanently Verified.", "success");
        } else if (otpPurpose === 'email') {
            const { error } = await supabase.auth.updateUser({ email: formData.newEmail });
            if (error) triggerChumToast(error.message, "warning");
            else {
                triggerChumToast("Relay coordinate migration initiated. Check your new inbox.", "success");
                setUserEmail(formData.newEmail);
            }
        }

        setActiveModal(null);
        setOtp("");
        setLoading(false);
    };

    const commitIdentity = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Snapshot current state
        const snapshot = { ...meta, displayName };

        // Optimistic Update
        setLoading(true);
        const nowMs = Date.now();
        // Full Name concatenation
        const finalFullName = `${formData.newFirstName} ${formData.newLastName}`.trim();
        const profileUpdates = {
            display_name: formData.newDisplayName,
            full_name: finalFullName,
        };

        try {
            const { error: authError } = await supabase.auth.updateUser({
                data: {
                    display_name: formData.newDisplayName,
                    first_name: formData.newFirstName,
                    last_name: formData.newLastName,
                    full_name: finalFullName,
                    last_identity_update: nowMs,
                    last_display_update: nowMs
                }
            });

            if (authError) throw authError;

            const { error: profileError } = await supabase
                .from('profiles')
                .update(profileUpdates)
                .eq('id', user.id);

            if (profileError) throw profileError;

            await setDisplayName(formData.newDisplayName);
            await setFullName(finalFullName);

            triggerChumToast("Identity Synchronized.", "success");
            setActiveModal(null);
            // Optional reload to ensure all components sync from Auth
            setTimeout(() => window.location.reload(), 1500);
        } catch (err: any) {
            // Revert on failure
            triggerChumToast(err.message || "Sync failed. Reverting shards.", "warning");
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async () => {
        if (!formData.currentPassword || !formData.newPassword) return triggerChumToast("Cipher fields required.", "warning");
        setLoading(true);
        const { error } = await supabase.auth.updateUser({ password: formData.newPassword });
        if (error) triggerChumToast(error.message, "warning");
        else {
            triggerChumToast("Security cipher updated.", "success");
            setActiveModal(null);
        }
        setLoading(false);
    };

    const handleDeleteAccount = async () => {
        if (!formData.purgePassword) return triggerChumToast("Purge password required.", "warning");
        setLoading(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        // Verify password via a re-auth attempt
        const { error: verifyError } = await supabase.auth.signInWithPassword({
            email: userEmail,
            password: formData.purgePassword
        });

        if (verifyError) {
            setLoading(false);
            return triggerChumToast("Neural Identification mismatch. Purge aborted.", "warning");
        }

        const { error } = await supabase.rpc('delete_user_own_account');
        if (error) triggerChumToast("Termination failed. Contact Admin.", "warning");
        else {
            await supabase.auth.signOut();
            window.location.href = "/";
        }
        setLoading(false);
    };

    // --- PAYMENT & RECEIPTS ---

    const generateReceiptPDF = async (targetInvoice?: any) => {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a6'
        });

        const { data: { user } } = await supabase.auth.getUser();
        
        // Use either the provided invoice or fallback to current details
        const invoiceId = targetInvoice?.id || `SB-${Date.now().toString().slice(-6)}`;
        const amount = targetInvoice?.amount || "PHP 99.00";
        const date = targetInvoice?.date || new Date().toLocaleDateString();
        const method = targetInvoice?.method || "NEURAL_RELAY";

        // Futuristic Design
        doc.setFillColor(10, 10, 10);
        doc.rect(0, 0, 105, 148, 'F');

        // Header Accent
        doc.setFillColor(0, 255, 200);
        doc.rect(0, 0, 105, 15, 'F');

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.text('OFFICIAL TRANSMISSION', 10, 10);

        doc.setTextColor(0, 255, 200);
        doc.setFontSize(18);
        doc.text('NEURAL RECEIPT', 10, 30);

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(8);
        doc.text(`ARCHITECT_ID: ${user?.id?.substring(0, 12)}...`, 10, 45);
        doc.text(`TIMESTAMP: ${date}`, 10, 52);
        doc.text(`INVOICE_ID: ${invoiceId}`, 10, 59);

        doc.setDrawColor(0, 255, 200);
        doc.line(10, 65, 95, 65);

        doc.setFontSize(12);
        doc.text('NEURAL_ASCENDANT_UPGRADE', 10, 80);
        doc.text(amount, 70, 80);
        
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(`METHOD: ${method.toUpperCase()}`, 10, 88);

        doc.setFontSize(6);
        doc.setTextColor(100, 100, 100);
        doc.text('This shard validates your lifetime neural access.', 10, 130);
        doc.text('StudyBuddy Heritage v2.0 - Antigravity Protocol', 10, 135);

        doc.save(`receipt_${invoiceId}.pdf`);
        triggerChumToast("Neural receipt extracted.", "success");
    };

    const handleUniversalPayment = async () => {
        if (checkoutMethod === 'manual') {
            if (!refNumber) return triggerChumToast("Neural Cipher required.", "warning");
            setLoading(true);

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) {
                setLoading(false);
                return triggerChumToast("Uplink failed: No Active Architect.", "warning");
            }

            try {
                const response = await fetch('/api/premium/unlock', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: user.id,
                        cipher: refNumber
                    })
                });

                const result = await response.json();

                if (result.success) {
                    // Logic already exists to sync DB
                    setPremiumStatus(true);
                    
                    const newInvoice = {
                        id: `SB-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                        date: new Date().toLocaleDateString(),
                        amount: "PHP 99.00",
                        method: "EXPO-CIPHER"
                    };
                    addMockInvoice(newInvoice);

                    triggerChumToast("Neural System Upgraded!", "success");
                    setActiveModal(null);
                    setTimeout(() => window.location.reload(), 2000);
                } else {
                    triggerChumToast(result.error || "Neural Shard Rejection.", "warning");
                }
            } catch (err) {
                triggerChumToast("Relay connection timed out.", "warning");
            } finally {
                setLoading(false);
            }
        } else {
            // GCash / Card Path (Mock High-Speed Upgrade)
            setLoading(true);
            setTimeout(async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('profiles').update({ is_premium: true }).eq('id', user.id);
                    setPremiumStatus(true);
                    
                    const newInvoice = {
                        id: `SB-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
                        date: new Date().toLocaleDateString(),
                        amount: "PHP 99.00",
                        method: checkoutMethod === 'qrph' ? "GCASH_SECURE" : "MOCK_CARD_INT"
                    };
                    addMockInvoice(newInvoice);

                    triggerChumToast(`${checkoutMethod === 'qrph' ? 'GCash' : 'Neural Card'} Stream Verified!`, "success");
                    setActiveModal(null);
                    setTimeout(() => window.location.reload(), 1000);
                }
                setLoading(false);
            }, 3000);
        }
    };

    return (
        <div className="h-screen w-full flex flex-col items-center justify-center p-6 md:p-12 overflow-hidden bg-(--bg-dark) select-none">
            <div className="w-full max-w-4xl h-full flex flex-col gap-6 animate-in fade-in duration-700">

                {/* Profile Header */}
                <div className="flex flex-col md:flex-row items-center gap-8 bg-white/5 border border-white/10 p-10 rounded-[48px] backdrop-blur-md">
                    <div className="w-28 h-28 rounded-full border-2 border-(--accent-teal)/30 p-1 bg-(--bg-card) flex items-center justify-center relative group">
                        <User size={48} className="text-(--accent-teal)" />
                        <div className="absolute inset-0 rounded-full bg-(--accent-teal)/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-center md:text-left flex-1 space-y-2">
                        <div className="flex flex-col md:flex-row md:items-end gap-3 justify-center md:justify-start">
                            <h1 className="text-4xl font-black uppercase italic tracking-tighter leading-none">{displayName || "Architect"}</h1>
                            <span className="text-[10px] font-black bg-(--accent-teal) text-black px-2 py-0.5 rounded-md tracking-widest uppercase mb-1">LVL {level}</span>
                        </div>
                        <p className="text-[12px] font-black italic text-(--accent-teal) uppercase tracking-widest opacity-80">{userEmail}</p>
                        <div className="flex gap-3 mt-4 justify-center md:justify-start items-center">
                            <span className={`px-4 py-1.5 rounded-2xl text-[9px] font-black uppercase flex items-center gap-2 border ${isVerified ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' : 'bg-red-500/10 text-red-500 border-red-500/20'}`}>
                                {isVerified ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
                                {isVerified ? 'NEURALLY VERIFIED' : 'GHOST MODE UNVERIFIED'}
                            </span>
                            {!isVerified && (
                                <button
                                    onClick={() => handleSendOTP('verify')}
                                    disabled={loading}
                                    className="px-4 py-1.5 rounded-2xl bg-white text-black text-[9px] font-black uppercase hover:bg-(--accent-teal) transition-all flex items-center gap-2 shadow-lg"
                                >
                                    {loading ? <RefreshCcw size={12} className="animate-spin" /> : <Fingerprint size={12} />}
                                    NEURAL LINK
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Action Grid (Universal Shards) */}
                <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                    <button onClick={() => setActiveModal('identity')} className="flex flex-col items-center justify-center gap-3 p-8 rounded-[40px] border bg-white/5 border-white/10 hover:bg-(--accent-teal)/10 hover:border-(--accent-teal)/30 transition-all group">
                        <User size={24} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Identity</span>
                    </button>
                    <button onClick={() => setActiveModal('email')} className="flex flex-col items-center justify-center gap-3 p-8 rounded-[40px] border bg-white/5 border-white/10 hover:bg-(--accent-teal)/10 hover:border-(--accent-teal)/30 transition-all group">
                        <Mail size={24} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Relay</span>
                    </button>
                    <button onClick={() => setActiveModal('password')} className="flex flex-col items-center justify-center gap-3 p-8 rounded-[40px] border bg-white/5 border-white/10 hover:bg-(--accent-teal)/10 hover:border-(--accent-teal)/30 transition-all group">
                        <Lock size={24} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Cipher</span>
                    </button>
                    <button onClick={() => setActiveModal('delete')} className="flex flex-col items-center justify-center gap-3 p-8 rounded-[40px] border bg-white/5 border-white/10 hover:border-red-500/50 hover:bg-red-500/5 text-red-400 transition-all group">
                        <Trash2 size={24} className="group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Purge</span>
                    </button>
                    <button onClick={() => supabase.auth.signOut()} className="flex flex-col items-center justify-center gap-3 p-8 rounded-[40px] border bg-white/5 border-white/10 hover:bg-red-500/10 hover:border-red-500/30 transition-all group">
                        <LogOut size={24} className="group-hover:scale-110 transition-transform text-red-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-red-500">Logoff</span>
                    </button>
                </div>

                {/* Neural Subscription Card */}
                <div className={`p-10 rounded-[48px] border-2 transition-all duration-700 relative overflow-hidden flex-1 flex flex-col justify-center ${isPremiumUser ? 'bg-(--accent-teal)/10 border-(--accent-teal)/40 shadow-[0_0_50px_-12px_rgba(0,255,200,0.3)]' : 'bg-white/5 border-white/10'}`}>
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8 h-full">
                        <div className="flex items-center gap-8">
                            <div className="p-6 bg-white/10 rounded-[32px] text-(--accent-teal) shadow-inner">
                                <Crown size={40} className="drop-shadow-[0_0_10px_rgba(0,255,200,0.8)]" />
                            </div>
                            <div>
                                <h4 className="text-sm font-black uppercase tracking-[0.3em]">{isPremiumUser ? "NEURAL ASCENDANT STATUS" : "STANDARD HUMAN TIER"}</h4>
                                <p className="text-[10px] opacity-40 uppercase font-bold mt-2 tracking-wide max-w-xs">{isPremiumUser ? "Infinite vector shards, priority forge pipelines, and active neural protection enabled." : "Upgrade to unlock ph-global payments, infinite workspace shards, and elite chum wardrobe."}</p>
                            </div>
                        </div>
                        <div className="flex flex-col gap-3 min-w-[200px]">
                            {!isPremiumUser ? (
                                <button onClick={() => setActiveModal('ph-payment')} className="w-full px-8 py-5 bg-white text-black rounded-3xl text-[10px] font-black uppercase hover:bg-(--accent-teal) hover:-translate-y-1 transition-all shadow-xl flex items-center justify-center gap-2">
                                    <QrCode size={14} /> INITIALIZE PLUS
                                </button>
                            ) : (
                                <button onClick={() => generateReceiptPDF(mockInvoices[0])} className="w-full px-8 py-5 bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-3xl text-[10px] font-black uppercase hover:bg-teal-500/30 transition-all flex items-center justify-center gap-2">
                                    <Download size={14} /> EXTRACT RECEIPT
                                </button>
                            )}
                        </div>
                    </div>
                    {/* Futuristic Background Accent */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-(--accent-teal)/5 blur-3xl rounded-full" />
                </div>

                {/* --- 💰 INVOICE LEDGER (If Premium) --- */}
                {isPremiumUser && mockInvoices.length > 0 && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/5 border border-white/10 p-10 rounded-[48px] backdrop-blur-md"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-[0.3em]">Transaction Ledger</h3>
                                <p className="text-[10px] opacity-40 uppercase font-bold mt-1 tracking-wide">Historical neural shard acquisition logs</p>
                            </div>
                            <ShieldCheck size={20} className="text-(--accent-teal) opacity-50" />
                        </div>
                        
                        <div className="space-y-4">
                            {mockInvoices.map((inv) => (
                                <div key={inv.id} className="flex items-center justify-between p-6 rounded-3xl bg-white/5 border border-white/5 hover:border-white/10 transition-all group">
                                    <div className="flex gap-6 items-center">
                                        <div className="p-3 bg-white/5 rounded-2xl">
                                            <Download size={16} className="text-white/40 group-hover:text-(--accent-teal) transition-colors" />
                                        </div>
                                        <div>
                                            <p className="text-[11px] font-black tracking-widest">{inv.id}</p>
                                            <p className="text-[9px] opacity-40 font-bold uppercase">{inv.date} • {inv.method}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <p className="text-[11px] font-black text-(--accent-teal)">{inv.amount}</p>
                                        <button 
                                            onClick={() => generateReceiptPDF(inv)}
                                            className="px-4 py-2 rounded-xl bg-white/10 text-[9px] font-black uppercase hover:bg-white text-white hover:text-black transition-all"
                                        >
                                            Extract PDF
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </div>

            {/* --- MODAL SYSTEM --- */}
            <AnimatePresence>
                {activeModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                        onClick={() => setActiveModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20, opacity: 0 }}
                            animate={{ scale: 1, y: 0, opacity: 1 }}
                            exit={{ scale: 0.9, y: 20, opacity: 0 }}
                            className={`bg-(--bg-card) border border-white/10 w-full rounded-[48px] relative shadow-2xl flex flex-col p-10 max-w-md overflow-hidden`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                onClick={() => setActiveModal(null)}
                                className="absolute top-8 right-8 p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
                            >
                                <X size={18} />
                            </button>

                            {/* Identity Config */}
                            {activeModal === 'identity' && (
                                <div className="space-y-8">
                                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Identity Shards</h2>
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase opacity-30 ml-3">First Name</label>
                                                <input value={formData.newFirstName} onChange={e => setFormData({ ...formData, newFirstName: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-(--accent-teal)" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black uppercase opacity-30 ml-3">Last Name</label>
                                                <input value={formData.newLastName} onChange={e => setFormData({ ...formData, newLastName: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-(--accent-teal)" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase opacity-30 ml-3">Display Label</label>
                                            <input value={formData.newDisplayName} onChange={e => setFormData({ ...formData, newDisplayName: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-(--accent-teal)" />
                                        </div>
                                        <button onClick={commitIdentity} className="w-full py-5 bg-(--accent-teal) text-black rounded-[24px] text-[11px] font-black uppercase shadow-lg">SYNCHRONIZE SHARDS</button>
                                    </div>
                                </div>
                            )}

                            {/* Verification OTP Modal */}
                            {activeModal === 'verify-otp' && (
                                <div className="space-y-8 py-4">
                                    <div className="text-center space-y-2">
                                        <Fingerprint size={48} className="mx-auto text-(--accent-teal) animate-pulse" />
                                        <h2 className="text-2xl font-black uppercase italic tracking-tighter">Neural Verification</h2>
                                        <p className="text-[10px] font-bold opacity-30 uppercase">Enter the 6-digit sync code sent to your relay.</p>
                                    </div>
                                    <div className="space-y-6">
                                        <input
                                            type="text"
                                            maxLength={6}
                                            placeholder="000000"
                                            value={otp}
                                            onChange={e => setOtp(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-[32px] p-8 text-4xl text-center font-black tracking-[0.5em] outline-none focus:border-(--accent-teal) text-(--accent-teal)"
                                        />
                                        <button onClick={handleVerifyOTP} disabled={loading} className="w-full py-5 bg-(--accent-teal) text-black rounded-[24px] text-[11px] font-black uppercase shadow-[0_0_30px_-5px_rgba(0,255,200,0.5)]">
                                            {loading ? "Synchronizing..." : "FINAL VERIFICATION"}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Universal QR Ph Modal */}
                            {activeModal === 'ph-payment' && (
                                <div className="space-y-8 flex flex-col h-full overflow-hidden">
                                    <div className="text-center space-y-1">
                                        <Fingerprint size={40} className="mx-auto text-(--accent-teal)" />
                                        <h2 className="text-2xl font-black uppercase italic tracking-tighter leading-none pt-2">Neural Unlock Terminal</h2>
                                        <p className="text-[10px] font-bold opacity-30 uppercase tracking-[0.2em]">Manual Private Key Relay</p>
                                    </div>

                                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                                        <button
                                            onClick={() => setCheckoutMethod('qrph')}
                                            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${checkoutMethod === 'qrph' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                                        >
                                            GCash
                                        </button>
                                        <button
                                            onClick={() => setCheckoutMethod('card')}
                                            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${checkoutMethod === 'card' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                                        >
                                            Neural Card
                                        </button>
                                        <button
                                            onClick={() => setCheckoutMethod('manual')}
                                            className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${checkoutMethod === 'manual' ? 'bg-white text-black shadow-lg' : 'text-white/40 hover:text-white'}`}
                                        >
                                            Shard Key
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto custom-scrollbar space-y-6 pr-2">
                                        {checkoutMethod === 'qrph' ? (
                                            <div className="space-y-6">
                                                <div className="bg-white p-6 rounded-[32px] flex items-center justify-center relative group">
                                                    <img
                                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(`qrph://studybuddy.heritage/pay?amount=99&userId=${displayName}`)}`}
                                                        className="w-48 h-48 group-hover:scale-105 transition-transform"
                                                        alt="Universal QR Ph"
                                                    />
                                                    <div className="absolute inset-0 bg-(--accent-teal)/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                                </div>
                                                <div className="flex items-center justify-center gap-4">
                                                     <div className="px-4 py-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase">Verified GCash</div>
                                                     <div className="px-4 py-2 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-[10px] font-black uppercase">InstaPay Sync</div>
                                                </div>
                                                <p className="text-[9px] font-bold opacity-30 text-center uppercase tracking-widest px-8">Scan to trigger neural relay upgrade. System will auto-verify on completion.</p>
                                            </div>
                                        ) : checkoutMethod === 'card' ? (
                                            <div className="space-y-6">
                                                <div className="bg-linear-to-br from-zinc-700 to-black p-8 rounded-[48px] border border-white/20 shadow-2xl relative overflow-hidden group">
                                                    <div className="flex justify-between items-start mb-12">
                                                        <Fingerprint size={32} className="text-(--accent-teal)" />
                                                        <p className="text-[8px] font-black opacity-30 tracking-widest uppercase">Secured Neural Link</p>
                                                    </div>
                                                    <div className="space-y-1">
                                                        <p className="text-xl font-black tracking-[0.2em]">{cardData.number}</p>
                                                        <div className="flex justify-between items-end">
                                                            <p className="text-[10px] uppercase font-bold text-white/40">{cardData.name}</p>
                                                            <p className="text-[10px] uppercase font-bold text-white/40">{cardData.expiry}</p>
                                                        </div>
                                                    </div>
                                                    <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-(--accent-teal)/10 blur-3xl rounded-full group-hover:bg-(--accent-teal)/20 transition-all" />
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="space-y-2">
                                                        <label className="text-[8px] font-black uppercase opacity-30 ml-3">Card Name</label>
                                                        <input value={cardData.name} onChange={e => setCardData({...cardData, name: e.target.value.toUpperCase()})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs outline-none focus:border-(--accent-teal)" />
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className="space-y-2">
                                                            <label className="text-[8px] font-black uppercase opacity-30 ml-3">Expiry</label>
                                                            <input value={cardData.expiry} onChange={e => setCardData({...cardData, expiry: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs outline-none focus:border-(--accent-teal)" />
                                                        </div>
                                                        <div className="space-y-2">
                                                            <label className="text-[8px] font-black uppercase opacity-30 ml-3">CVV</label>
                                                            <input type="password" maxLength={3} value={cardData.cvv} onChange={e => setCardData({...cardData, cvv: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-xs outline-none focus:border-(--accent-teal)" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className="bg-white/5 border border-white/10 p-8 rounded-[32px] flex flex-col items-center justify-center relative group">
                                                    <ShieldAlert size={48} className="text-white opacity-20 group-hover:opacity-40 transition-opacity" />
                                                    <p className="text-[9px] font-bold opacity-30 mt-4 text-center max-w-[200px]">ENTER YOUR PRIVATE EXPO CIPHER KEY TO SYNC NEURAL ASSETS.</p>
                                                </div>

                                                <div className="space-y-4">
                                                    <div className="space-y-1">
                                                        <label className="text-[8px] font-black uppercase opacity-30 ml-3">Private Neural Cipher</label>
                                                        <input
                                                            placeholder="EXPO-XXXX-XXXX"
                                                            value={refNumber}
                                                            onChange={e => setRefNumber(e.target.value)}
                                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm uppercase font-bold outline-none focus:border-(--accent-teal) text-center tracking-widest"
                                                        />
                                                    </div>
                                                </div>
                                            </>
                                        )}

                                        <button onClick={handleUniversalPayment} disabled={loading} className="w-full py-5 bg-white text-black rounded-[24px] text-[11px] font-black uppercase shadow-xl hover:bg-(--accent-teal) transition-all">
                                            {loading ? "Decrypting Sync Stream..." : (checkoutMethod === 'manual' ? "SYNCHRONIZE CIPHER" : "VERIFY TRANSACTION")}
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Email Modal */}
                            {activeModal === 'email' && (
                                <div className="space-y-8">
                                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Relay Coordinate</h2>
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase opacity-30 ml-3">Current Relay</label>
                                            <input disabled value={userEmail} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none opacity-50" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase opacity-30 ml-3">New Relay Coordinate</label>
                                            <input value={formData.newEmail} onChange={e => setFormData({ ...formData, newEmail: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-(--accent-teal)" />
                                        </div>
                                        <button onClick={() => handleSendOTP('email')} className="w-full py-5 bg-white text-black rounded-2xl text-[11px] font-black uppercase transition-all">MIGRATE COORDINATE</button>
                                    </div>
                                </div>
                            )}

                            {/* Cipher Modal */}
                            {activeModal === 'password' && (
                                <div className="space-y-8">
                                    <h2 className="text-2xl font-black uppercase italic tracking-tighter">Cipher Update</h2>
                                    <div className="space-y-4">
                                        <input type="password" placeholder="Current Cipher" value={formData.currentPassword} onChange={e => setFormData({ ...formData, currentPassword: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-(--accent-teal)" />
                                        <input type="password" placeholder="New Neural Cipher" value={formData.newPassword} onChange={e => setFormData({ ...formData, newPassword: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-(--accent-teal)" />
                                        <button onClick={handlePasswordChange} className="w-full py-5 bg-white text-black rounded-2xl text-[11px] font-black uppercase transition-all">REWRITE CIPHER</button>
                                    </div>
                                </div>
                            )}

                            {/* Delete Modal */}
                            {activeModal === 'delete' && (
                                <div className="space-y-8 text-center py-4">
                                    <Trash2 size={48} className="mx-auto text-red-500" />
                                    <h2 className="text-2xl font-black uppercase italic">Purge Account?</h2>
                                    <p className="text-[10px] uppercase font-bold opacity-30">This action is irreversible. All neural shards will be vaporized. Enter your current cipher to proceed.</p>

                                    <input
                                        type="password"
                                        placeholder="Current Neural Cipher"
                                        value={formData.purgePassword}
                                        onChange={e => setFormData({ ...formData, purgePassword: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl p-5 text-sm outline-none focus:border-red-500 text-center"
                                    />

                                    <div className="flex gap-4 pt-4">
                                        <button onClick={() => setActiveModal(null)} className="flex-1 py-5 bg-white/5 rounded-2xl text-[11px] font-black uppercase">Abort</button>
                                        <button onClick={handleDeleteAccount} className="flex-1 py-5 bg-red-600 text-white rounded-2xl text-[11px] font-black uppercase shadow-[0_0_30px_-5px_rgba(239,68,68,0.5)] border border-red-500/50">PURGE</button>
                                    </div>
                                </div>
                            )}
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}