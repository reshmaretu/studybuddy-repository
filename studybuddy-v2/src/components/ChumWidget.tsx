"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, CheckCircle2, Edit3, LogOut, Plus, BrainCircuit, Network, Cpu, WifiOff, Settings } from "lucide-react";
import { useStudyStore } from "@/store/useStudyStore";

export default function ChumWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [inputText, setInputText] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [chatHistory, setChatHistory] = useState<{ role: 'user' | 'chum', text: string }[]>([
        { role: 'chum', text: "Ready to study." }
    ]);
    const chatEndRef = useRef<HTMLDivElement>(null);

    const {
        activeMode, exitMode, isTutorModeActive, activeShardId, exitTutorMode,
        shards, updateShardMastery, aiTier, setAITier, aiKeys, updateAIKeys, ollamaUrl, setOllamaUrl
    } = useStudyStore();

    const isFlowState = activeMode === "flowState";
    const activeShard = shards.find(s => s.id === activeShardId);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatHistory, isOpen, showSettings]);
    useEffect(() => { if (isTutorModeActive) setIsOpen(true); }, [isTutorModeActive]);

    const handleSendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputText.trim()) return;

        const newHistory = [...chatHistory, { role: 'user' as const, text: inputText }];
        setChatHistory(newHistory);
        setInputText("");
        setIsTyping(true);

        const systemPrompt = isTutorModeActive && activeShard
            ? `You are a strict but encouraging AI tutor testing the user on these notes: "${activeShard.content}". Ask ONE true/false, identification, or multiple choice question. If they answer correctly, reply starting exactly with "CORRECT!"`
            : `You are Chum, a helpful productivity assistant. Keep replies short and concise.`;

        let aiResponse = "";

        try {
            if (aiTier === 'cloud') {
                // Talk to OUR secure server route, NOT directly to Groq!
                const res = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: inputText }],
                        aiTier: "cloud"
                    })
                });

                const data = await res.json();
                if (data.error) throw new Error(data.error);
                aiResponse = data.response;
            }
            else if (aiTier === 'local') {
                // Local AI stays on the client side since it talks to your local machine
                const res = await fetch(`${ollamaUrl}/api/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: "llama3.2:1b",
                        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: inputText }],
                        stream: false
                    })
                });
                const data = await res.json();
                aiResponse = data.message.content;
            }
            else {
                aiResponse = "[Offline Rule] Pre-programmed response triggered. Connection disabled.";
            }
        } catch (error: any) {
            aiResponse = `[System Error] ${error.message || "Failed to connect to AI Node."}`;
        }

        setIsTyping(false);
        setChatHistory([...newHistory, { role: 'chum', text: aiResponse }]);

        // Automatic Mastery detection
        if (isTutorModeActive && activeShard && aiResponse.includes("CORRECT!")) {
            updateShardMastery(activeShard.id, 34);
        }
    };

    let themeColor = "var(--accent-teal)";
    let title = "Chum";
    if (isFlowState) themeColor = "var(--text-muted)";
    else if (isTutorModeActive) { themeColor = "var(--accent-yellow)"; title = "Chum (Tutor)"; }

    const AITierIcon = aiTier === 'cloud' ? Network : aiTier === 'local' ? Cpu : WifiOff;

    return (
        <motion.div drag dragMomentum={false} style={{ zIndex: 100000 }} className="fixed bottom-8 right-8 flex flex-col items-end cursor-grab active:cursor-grabbing">
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.8 }} className="mb-4 w-80 sm:w-96 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl shadow-2xl overflow-hidden cursor-default flex flex-col" style={{ height: '480px' }} onPointerDown={(e) => e.stopPropagation()}>

                        {/* Header */}
                        <div className="bg-[var(--bg-sidebar)] border-b border-[var(--border-color)] p-3 flex justify-between items-center relative overflow-hidden">
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center border" style={{ backgroundColor: `color-mix(in srgb, ${themeColor} 15%, transparent)`, borderColor: `color-mix(in srgb, ${themeColor} 40%, transparent)` }}>
                                    {isTutorModeActive ? <BrainCircuit size={16} color={themeColor} /> : <span className="text-lg">👻</span>}
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-[var(--text-main)] text-sm">{title}</span>
                                    </div>
                                    {!isFlowState && (
                                        <span className="text-[9px] text-[var(--text-muted)] flex items-center gap-1 mt-0.5 cursor-pointer hover:text-[var(--accent-teal)]" onClick={() => setShowSettings(!showSettings)}>
                                            <AITierIcon size={10} /> {aiTier.toUpperCase()} NODE <Settings size={10} className="ml-1" />
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 relative z-10">
                                {isTutorModeActive && <button onClick={exitTutorMode} className="text-[10px] font-bold text-red-400 px-2 py-1 rounded border border-red-400/30 hover:bg-red-400/10 transition-colors">Abort</button>}
                                <button onClick={() => setIsOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><X size={16} /></button>
                            </div>
                        </div>

                        {/* SETTINGS PANEL */}
                        {showSettings && !isFlowState ? (
                            <div className="flex-1 p-4 bg-[var(--bg-dark)] overflow-y-auto custom-scrollbar flex flex-col gap-4">
                                <h3 className="text-sm font-bold text-[var(--text-main)] mb-2">Neural Link Settings</h3>

                                <div className="flex bg-[var(--bg-sidebar)] p-1 rounded-lg border border-[var(--border-color)]">
                                    {(['cloud', 'local', 'offline'] as const).map(tier => (
                                        <button key={tier} onClick={() => setAITier(tier)} className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${aiTier === tier ? 'bg-[var(--accent-teal)] text-[#0b1211]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>{tier}</button>
                                    ))}
                                </div>

                                {aiTier === 'cloud' && (
                                    <div className="flex flex-col gap-3">
                                        <input type="password" placeholder="Groq API Key" value={aiKeys.groq} onChange={e => updateAIKeys({ groq: e.target.value })} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)]" />
                                        <input type="password" placeholder="Gemini API Key" value={aiKeys.gemini} onChange={e => updateAIKeys({ gemini: e.target.value })} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)]" />
                                        <p className="text-[10px] text-[var(--text-muted)] italic">Cloud keys are stored securely in your browser's local memory.</p>
                                    </div>
                                )}

                                {aiTier === 'local' && (
                                    <div className="flex flex-col gap-3">
                                        <label className="text-xs text-[var(--text-muted)] font-bold">Ollama Endpoint URL</label>
                                        <input type="text" value={ollamaUrl} onChange={e => setOllamaUrl(e.target.value)} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)]" />
                                        <p className="text-[10px] text-[var(--text-muted)] italic">Requires Ollama running locally with `OLLAMA_ORIGINS="*"`.</p>
                                    </div>
                                )}

                                <button onClick={() => setShowSettings(false)} className="mt-auto w-full py-2 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-main)] hover:border-[var(--accent-teal)] transition-colors">Save & Close</button>
                            </div>
                        ) : isFlowState ? (
                            <div className="p-4 flex flex-col justify-end h-full">
                                <div className="bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl rounded-tl-none p-3 text-sm text-[var(--text-muted)] w-[85%] mb-4 shadow-sm">Keep pushing.</div>
                                <div className="flex flex-col gap-2 w-full">
                                    <button className="text-xs flex items-center gap-2 bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--accent-teal)] px-3 py-2.5 rounded-lg transition-all w-full text-left font-medium"><CheckCircle2 size={16} /> Quick Archive</button>
                                    <button className="text-xs flex items-center gap-2 bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--accent-yellow)] px-3 py-2.5 rounded-lg transition-all w-full text-left font-medium"><Edit3 size={16} /> Mind-dump pad</button>
                                    <button onClick={() => { setIsOpen(false); exitMode(); }} className="text-xs flex items-center gap-2 bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white px-3 py-2.5 rounded-lg transition-all w-full text-left font-medium"><LogOut size={16} /> Leave Flowstate</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4">
                                    {isTutorModeActive && (
                                        <div className="text-center mb-2">
                                            <span className="text-xs font-bold text-[var(--accent-yellow)] bg-[var(--accent-yellow)]/10 px-3 py-1 rounded-full border border-[var(--accent-yellow)]/20">Training: {activeShard?.title}</span>
                                        </div>
                                    )}
                                    {chatHistory.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`p-3 text-sm rounded-xl max-w-[85%] shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-[var(--accent-teal)]/20 border border-[var(--accent-teal)]/30 text-[var(--text-main)] rounded-tr-none' : 'bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-muted)] rounded-tl-none'}`}>
                                                {msg.text}
                                            </div>
                                        </div>
                                    ))}
                                    {isTyping && <div className="text-xs text-[var(--text-muted)] animate-pulse">Chum is thinking...</div>}
                                    <div ref={chatEndRef} />
                                </div>

                                <form onSubmit={handleSendMessage} className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)] flex gap-2">
                                    <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} disabled={isTyping} placeholder={isTutorModeActive ? "Answer here..." : "Message Chum..."} className="flex-1 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] transition-colors placeholder:text-[var(--text-muted)]/50 disabled:opacity-50" />
                                    <button type="submit" disabled={!inputText.trim() || isTyping} className="rounded-xl w-10 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: `color-mix(in srgb, ${themeColor} 15%, transparent)`, color: themeColor, border: `1px solid color-mix(in srgb, ${themeColor} 30%, transparent)` }}>
                                        <Send size={16} />
                                    </button>
                                </form>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            <motion.button onClick={() => setIsOpen(!isOpen)} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} className="w-16 h-16 rounded-full bg-[var(--bg-card)] border-2 border-[var(--border-color)] shadow-xl flex items-center justify-center relative hover:border-[var(--accent-teal)] transition-colors">
                <div className="absolute inset-0 rounded-full blur-md -z-10" style={{ backgroundColor: `color-mix(in srgb, ${themeColor} 15%, transparent)` }}></div>
                {isTutorModeActive ? <BrainCircuit size={28} color={themeColor} /> : <span className="text-3xl drop-shadow-md">👻</span>}
            </motion.button>
        </motion.div>
    );
}