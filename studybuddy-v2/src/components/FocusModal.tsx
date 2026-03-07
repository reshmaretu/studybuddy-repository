"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, CheckCircle2, Edit3, LogOut, Plus, BrainCircuit, Network, Cpu, WifiOff } from "lucide-react";
import { useStudyStore } from "@/store/useStudyStore";

export default function ChumWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [inputText, setInputText] = useState("");
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'chum', text: string }[]>([
        { role: 'chum', text: "What are we conquering today?" }
    ]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const { activeMode, exitMode, isTutorModeActive, activeShardId, exitTutorMode, shards, updateShardMastery, aiTier } = useStudyStore();
    const isFlowState = activeMode === "flowState";
    const activeShard = shards.find(s => s.id === activeShardId);

    // Auto-scroll chat
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory, isOpen]);

    // Force open if Tutor Mode starts
    useEffect(() => {
        if (isTutorModeActive) setIsOpen(true);
    }, [isTutorModeActive]);

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        const newHistory = [...chatHistory, { role: 'user' as const, text: inputText }];
        setChatHistory(newHistory);
        setInputText("");

        // Simulated 3-Tier AI Routing Logic
        setTimeout(() => {
            const prefix = aiTier === 'cloud' ? '[Groq]' : aiTier === 'local' ? '[Llama3.2]' : '[Offline Rule]';

            if (isTutorModeActive) {
                // Mocking Tutor Response
                setChatHistory([...newHistory, { role: 'chum', text: `${prefix} Correct! +34 Mastery. Next: Identify the process of converting light to energy.` }]);
                if (activeShard) updateShardMastery(activeShard.id, 34);
            } else {
                // Mocking Standard Chat Response
                setChatHistory([...newHistory, { role: 'chum', text: `${prefix} I've noted that. Do you want me to convert it into a chapter?` }]);
            }
        }, 800);
    };

    // UI Configuration based on State
    let themeColor = "var(--accent-teal)";
    let title = "Chum";
    let status = "Online";

    if (isFlowState) {
        themeColor = "var(--text-muted)";
        status = "Watching";
    } else if (isTutorModeActive) {
        themeColor = "var(--accent-yellow)";
        title = "Chum (Tutor)";
        status = "Testing";
    }

    const AITierIcon = aiTier === 'cloud' ? Network : aiTier === 'local' ? Cpu : WifiOff;

    return (
        <motion.div drag dragMomentum={false} style={{ zIndex: 100000 }} className="fixed bottom-8 right-8 flex flex-col items-end cursor-grab active:cursor-grabbing">
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.8 }} className="mb-4 w-80 sm:w-96 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden cursor-default flex flex-col" style={{ height: '480px' }} onPointerDown={(e) => e.stopPropagation()}>

                        {/* Header */}
                        <div className="bg-[var(--bg-sidebar)] border-b border-[var(--border-color)] p-3 flex justify-between items-center relative overflow-hidden">
                            {isTutorModeActive && <div className="absolute inset-0 bg-[var(--accent-yellow)]/5 animate-pulse" />}
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center border" style={{ backgroundColor: `color-mix(in srgb, ${themeColor} 15%, transparent)`, borderColor: `color-mix(in srgb, ${themeColor} 40%, transparent)` }}>
                                    {isTutorModeActive ? <BrainCircuit size={16} color={themeColor} /> : <span className="text-lg">👻</span>}
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-[var(--text-main)] text-sm">{title}</span>
                                        <span className="flex items-center gap-1 text-[8px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-full border" style={{ color: themeColor, backgroundColor: `color-mix(in srgb, ${themeColor} 10%, transparent)`, borderColor: `color-mix(in srgb, ${themeColor} 20%, transparent)` }}>
                                            {!isFlowState && <span className="w-1 h-1 rounded-full animate-pulse" style={{ backgroundColor: themeColor }} />}
                                            {status}
                                        </span>
                                    </div>
                                    {/* 3-Tier Status Indicator */}
                                    {!isFlowState && (
                                        <span className="text-[9px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5">
                                            <AITierIcon size={10} /> {aiTier.toUpperCase()} NODE ACTIVE
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 relative z-10">
                                {isTutorModeActive && (
                                    <button onClick={exitTutorMode} className="text-[10px] font-bold text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-400/30 hover:bg-red-400/10 transition-colors">Abort</button>
                                )}
                                <button onClick={() => setIsOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><X size={16} /></button>
                            </div>
                        </div>

                        {/* FLOWSTATE VIEW: Only 3 Buttons, No Input */}
                        {isFlowState ? (
                            <div className="p-4 flex flex-col justify-end h-full">
                                <div className="bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl rounded-tl-none p-3 text-sm text-[var(--text-muted)] w-[85%] mb-4 shadow-sm">
                                    You're in the zone. Keep pushing, I'm keeping watch.
                                </div>
                                <div className="flex flex-col gap-2 w-full">
                                    <button className="text-xs flex items-center gap-2 bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--accent-teal)] px-3 py-2.5 rounded-lg transition-all w-full text-left font-medium"><CheckCircle2 size={16} /> Quick Archive Let's Go</button>
                                    <button className="text-xs flex items-center gap-2 bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--accent-yellow)] px-3 py-2.5 rounded-lg transition-all w-full text-left font-medium"><Edit3 size={16} /> Mind-dump pad</button>
                                    <button onClick={() => { setIsOpen(false); exitMode(); }} className="text-xs flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white px-3 py-2.5 rounded-lg transition-all w-full text-left font-medium"><LogOut size={16} /> Leave Flowstate</button>
                                </div>
                            </div>
                        ) : (
                            // STANDARD / TUTOR VIEW: Chat History & Input
                            <>
                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4">
                                    {isTutorModeActive && (
                                        <div className="text-center mb-2">
                                            <span className="text-xs font-bold text-[var(--accent-yellow)] bg-[var(--accent-yellow)]/10 px-3 py-1 rounded-full border border-[var(--accent-yellow)]/20">Training: {activeShard?.title}</span>
                                        </div>
                                    )}
                                    {chatHistory.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`p-3 text-sm rounded-xl max-w-[85%] shadow-sm ${msg.role === 'user' ? 'bg-[var(--accent-teal)]/20 border border-[var(--accent-teal)]/30 text-[var(--text-main)] rounded-tr-none' : 'bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-muted)] rounded-tl-none'}`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    ))}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* Quick Actions (Only in normal chat) */}
                                {!isTutorModeActive && (
                                    <div className="px-3 pb-3 pt-1 flex gap-2 overflow-x-auto custom-scrollbar border-t border-[var(--border-color)] bg-[var(--bg-sidebar)]">
                                        <button className="flex-shrink-0 text-[10px] flex items-center gap-1.5 bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--accent-teal)] px-2.5 py-1.5 rounded-lg transition-all font-bold uppercase tracking-wider"><CheckCircle2 size={12} /> Quick Archive</button>
                                        <button className="flex-shrink-0 text-[10px] flex items-center gap-1.5 bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--accent-teal)] px-2.5 py-1.5 rounded-lg transition-all font-bold uppercase tracking-wider"><Plus size={12} /> Add Task</button>
                                    </div>
                                )}

                                {/* Input Form */}
                                <form onSubmit={handleSendMessage} className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)] flex gap-2">
                                    <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} placeholder={isTutorModeActive ? "Answer here..." : "Message Chum..."} className="flex-1 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] transition-colors placeholder:text-[var(--text-muted)]/50" />
                                    <button type="submit" disabled={!inputText.trim()} className="rounded-xl w-10 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: `color-mix(in srgb, ${themeColor} 15%, transparent)`, color: themeColor, border: `1px solid color-mix(in srgb, ${themeColor} 30%, transparent)` }}>
                                        <Send size={16} />
                                    </button>
                                </form>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Avatar Toggle Button */}
            <motion.button onClick={() => setIsOpen(!isOpen)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-16 h-16 rounded-full bg-[var(--bg-card)] border-2 border-[var(--border-color)] shadow-xl flex items-center justify-center relative hover:border-[var(--accent-teal)] transition-colors">
                <div className="absolute inset-0 rounded-full blur-md -z-10" style={{ backgroundColor: `color-mix(in srgb, ${themeColor} 15%, transparent)` }}></div>
                {isTutorModeActive ? <BrainCircuit size={28} color={themeColor} /> : <span className="text-3xl drop-shadow-md">👻</span>}
            </motion.button>
        </motion.div>
    );
}