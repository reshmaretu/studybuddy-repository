"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Upload, Camera, Image as ImageIcon, Check, Ghost, Loader2 } from "lucide-react";
import { useStudyStore } from "@/store/useStudyStore";
import { supabase } from "@/lib/supabase";
import ChumRenderer from "./ChumRenderer";

export default function ProfileModal() {
    const { 
        isProfileModalOpen, setProfileModalOpen, 
        avatarUrl, setAvatarUrl, 
        displayName, triggerChumToast 
    } = useStudyStore();
    
    const [activeTab, setActiveTab] = useState<'custom' | 'chum'>('chum');
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    if (!isProfileModalOpen) return null;

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Limit size to 2MB
        if (file.size > 2 * 1024 * 1024) {
            triggerChumToast("Avatar too heavy (Max 2MB).", "warning");
            return;
        }

        setUploading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("Unauthenticated");

            const fileExt = file.name.split('.').pop();
            const fileName = `${user.id}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Update Profile
            const { error: updateError } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', user.id);

            if (updateError) throw updateError;

            setAvatarUrl(publicUrl);
            triggerChumToast("Identity appearance harmonized.", "success");
            setActiveTab('custom');
        } catch (err: any) {
            console.error(err);
            triggerChumToast("Shard uplink failed.", "warning");
        } finally {
            setUploading(false);
        }
    };

    const useChumAvatar = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('profiles')
                .update({ avatar_url: null })
                .eq('id', user.id);

            if (error) throw error;

            setAvatarUrl(null);
            triggerChumToast("Returned to Chum form.", "success");
            setActiveTab('chum');
        } catch (err) {
            triggerChumToast("Metamorphosis failed.", "warning");
        }
    };

    return (
        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                exit={{ opacity: 0 }}
                onClick={() => setProfileModalOpen(false)}
                className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" 
            />
            
            <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }} 
                animate={{ scale: 1, opacity: 1, y: 0 }} 
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl relative z-10"
            >
                {/* Header */}
                <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-sidebar)]/30">
                    <h3 className="text-xl font-black text-[var(--text-main)] uppercase tracking-widest flex items-center gap-3">
                        <Camera size={20} className="text-[var(--accent-teal)]" /> Identity Mask
                    </h3>
                    <button 
                        onClick={() => setProfileModalOpen(false)}
                        className="p-2 rounded-xl hover:bg-[var(--bg-dark)] text-[var(--text-muted)] hover:text-white transition-all"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-2 bg-[var(--bg-dark)]/50 mx-6 mt-6 rounded-2xl border border-[var(--border-color)]">
                    <button 
                        onClick={() => setActiveTab('chum')}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'chum' ? 'bg-[var(--accent-teal)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-white'}`}
                    >
                        <Ghost size={14} /> Chum Form
                    </button>
                    <button 
                        onClick={() => setActiveTab('custom')}
                        className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${activeTab === 'custom' ? 'bg-[var(--accent-teal)] text-white shadow-lg' : 'text-[var(--text-muted)] hover:text-white'}`}
                    >
                        <ImageIcon size={14} /> Custom Shard
                    </button>
                </div>

                {/* Content */}
                <div className="p-8">
                    <AnimatePresence mode="wait">
                        {activeTab === 'chum' ? (
                            <motion.div 
                                key="chum-tab"
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex flex-col items-center gap-6"
                            >
                                <div className="w-32 h-32 rounded-full border-4 border-[var(--accent-teal)]/20 p-4 bg-[var(--bg-dark)] flex items-center justify-center relative group">
                                    <ChumRenderer size="w-20 h-20" />
                                    {!avatarUrl && (
                                        <div className="absolute -top-2 -right-2 bg-[var(--accent-teal)] text-black p-1.5 rounded-full shadow-lg">
                                            <Check size={14} strokeWidth={4} />
                                        </div>
                                    )}
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-bold text-[var(--text-main)]">Standard Spirit Guard</p>
                                    <p className="text-[10px] text-[var(--text-muted)] mt-1 uppercase tracking-widest">Universal across the Lantern Net</p>
                                </div>
                                <button 
                                    onClick={useChumAvatar}
                                    disabled={!avatarUrl}
                                    className="w-full py-4 rounded-2xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[10px] font-black uppercase tracking-widest hover:border-[var(--accent-teal)] transition-all disabled:opacity-30 disabled:grayscale"
                                >
                                    Revert to Spirit
                                </button>
                            </motion.div>
                        ) : (
                            <motion.div 
                                key="custom-tab"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="flex flex-col items-center gap-6"
                            >
                                <div 
                                    onClick={() => !uploading && fileInputRef.current?.click()}
                                    className="w-32 h-32 rounded-full border-4 border-dashed border-[var(--border-color)] bg-[var(--bg-dark)] flex items-center justify-center relative cursor-pointer group hover:border-[var(--accent-teal)]/50 transition-all overflow-hidden"
                                >
                                    {avatarUrl ? (
                                        <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        <Upload className="text-[var(--text-muted)] group-hover:text-[var(--accent-teal)] transition-colors" size={32} />
                                    )}
                                    {uploading && (
                                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                            <Loader2 className="text-[var(--accent-teal)] animate-spin" size={24} />
                                        </div>
                                    )}
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <p className="text-[8px] font-black text-white uppercase">Replace shard</p>
                                    </div>
                                </div>
                                
                                <input 
                                    type="file" 
                                    ref={fileInputRef} 
                                    onChange={handleFileUpload} 
                                    accept="image/*" 
                                    className="hidden" 
                                />

                                <div className="text-center">
                                    <p className="text-sm font-bold text-[var(--text-main)]">Custom Identity Shard</p>
                                    <p className="text-[10px] text-[var(--text-muted)] mt-1 uppercase tracking-widest">Visible to all chums in the Void</p>
                                </div>

                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploading}
                                    className="w-full py-4 rounded-2xl bg-[var(--accent-teal)] text-black text-[10px] font-black uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-[var(--accent-teal)]/20"
                                >
                                    {avatarUrl ? "Upload New Shard" : "Upload Identity Shard"}
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                <div className="p-6 bg-[var(--bg-sidebar)]/30 border-t border-[var(--border-color)] text-center">
                    <p className="text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest">
                        Identity changes sync across the entire Lantern Network
                    </p>
                </div>
            </motion.div>
        </div>
    );
}
