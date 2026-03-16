"use client";

import { useState, useEffect } from "react";
import { useStudyStore } from "@/store/useStudyStore";
import { motion, AnimatePresence } from "framer-motion";
import { X, Terminal, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function DevOverlay() {
    const { 
        isDev, devOverlayEnabled, setLastPlannedDate, 
        debrisSize, debrisColor, debrisCount, debrisSpread, setDebris 
    } = useStudyStore();
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isDev && devOverlayEnabled && e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDev, devOverlayEnabled]);

    const forceMorningReset = async () => {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setHours(3, 59, 0, 0);
        
        await setLastPlannedDate(yesterday.toISOString());
        toast.info("Dev: Morning reset forced. Refresh or change page to see modal.");
        setIsOpen(false);
    };

    if (!isDev) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-10000 flex items-start justify-center pt-20 pointer-events-none">
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        className="bg-(--bg-card) border-2 border-red-500/50 p-6 rounded-[32px] shadow-[0_0_50px_rgba(255,0,0,0.3)] w-full max-w-md pointer-events-auto max-h-[80vh] overflow-y-auto custom-scrollbar"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-2 text-red-400">
                                <ShieldAlert size={18} />
                                <h2 className="font-black text-xs tracking-widest uppercase">Architect Console</h2>
                            </div>
                            <button onClick={() => setIsOpen(false)} className="text-(--text-muted) hover:text-white p-2">
                                <X size={18} />
                            </button>
                        </div>

                        <div className="space-y-6">
                            <div className="bg-(--bg-dark) border border-(--border-color) p-4 rounded-2xl flex flex-col gap-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-bold text-(--text-main)">System Tools</span>
                                    <Terminal size={14} className="text-(--text-muted)" />
                                </div>
                                <button
                                    onClick={forceMorningReset}
                                    className="w-full py-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold hover:bg-red-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <RefreshCw size={14} /> Force Morning Reset
                                </button>
                            </div>

                            <div className="bg-(--bg-dark) border border-(--border-color) p-4 rounded-2xl space-y-4">
                                <h3 className="text-[10px] font-black uppercase text-white/40 tracking-widest">Atmosphere (Lantern Net)</h3>
                                
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span>Debris Size</span>
                                        <span className="font-mono text-(--accent-teal)">{debrisSize.toFixed(1)}</span>
                                    </div>
                                    <input type="range" min="0.1" max="2.0" step="0.1" value={debrisSize} onChange={(e) => setDebris({ size: parseFloat(e.target.value) })} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-(--accent-teal)" />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span>Debris Count</span>
                                        <span className="font-mono text-(--accent-teal)">{debrisCount}</span>
                                    </div>
                                    <input type="range" min="1000" max="15000" step="1000" value={debrisCount} onChange={(e) => setDebris({ count: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-(--accent-teal)" />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span>Debris Spread</span>
                                        <span className="font-mono text-(--accent-teal)">{debrisSpread}</span>
                                    </div>
                                    <input type="range" min="100" max="1000" step="50" value={debrisSpread} onChange={(e) => setDebris({ spread: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-(--accent-teal)" />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span>Debris Color</span>
                                        <input type="color" value={debrisColor} onChange={(e) => setDebris({ color: e.target.value })} className="w-6 h-6 bg-transparent border-none cursor-pointer" />
                                    </div>
                                </div>
                            </div>
                            
                            <div className="p-3 bg-black/20 rounded-xl">
                                <p className="text-[10px] text-(--text-muted) leading-relaxed italic text-center">
                                    "With great power comes great responsibility, Chum."
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
