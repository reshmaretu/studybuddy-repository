"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, CheckCircle2, Edit3, LogOut, Plus, BrainCircuit, Network, Cpu, WifiOff, Settings, History } from "lucide-react";
import { useStudyStore, ChatMessage } from "@/store/useStudyStore";

export default function ChumWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [showSessions, setShowSessions] = useState(false);
    const [inputText, setInputText] = useState("");
    const [isTyping, setIsTyping] = useState(false);

    const chatEndRef = useRef<HTMLDivElement>(null);

    const {
        activeMode, exitMode, isTutorModeActive, activeShardId, exitTutorMode,
        shards, updateShardMastery, aiTier, setAITier, aiKeys, updateAIKeys, ollamaUrl, setOllamaUrl,
        normalChatHistory, tutorChatHistory, setNormalChatHistory, setTutorChatHistory,
        tutorSessionState, updateTutorSessionState, completeTutorSession, pastTutorSessions, addTask
    } = useStudyStore();

    const currentHistory = isTutorModeActive ? tutorChatHistory : normalChatHistory;
    const setCurrentHistory = isTutorModeActive ? setTutorChatHistory : setNormalChatHistory;

    const isFlowState = activeMode === "flowState";
    const activeShard = shards.find(s => s.id === activeShardId);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [currentHistory, isOpen, showSettings, showSessions]);
    useEffect(() => { if (isTutorModeActive) setIsOpen(true); }, [isTutorModeActive]);

    const handleSendMessage = async (e?: React.FormEvent, forcePrimer = false) => {
        if (e) e.preventDefault();

        const messageText = forcePrimer ? "Let's start our session! I'm ready for the first question." : inputText;
        if (!messageText.trim()) return;

        const newHistory = [...currentHistory, { role: 'user' as const, text: messageText }];
        setCurrentHistory(newHistory);
        if (!forcePrimer) setInputText("");
        setIsTyping(true);

        // Session Completion Acknowledgement
        if (isTutorModeActive && tutorSessionState.isSessionComplete) {
            setIsTyping(false);
            exitTutorMode();
            return;
        }

        // Conversational Exit Logic
        if (showExitConfirm) {
            const text = messageText.toLowerCase();
            if (text.includes("yes") || text.includes("leave") || text.includes("quit") || text.includes("exit")) {
                exitMode();
                setShowExitConfirm(false);
                setIsTyping(false);
                return;
            } else {
                setShowExitConfirm(false);
                setCurrentHistory([...newHistory, { role: 'chum', text: "Glad you're staying! Let's keep that focus high." }]);
                setIsTyping(false);
                return;
            }
        }

        if (isFlowState && ["leave", "quit", "exit", "done"].some(k => messageText.toLowerCase().includes(k))) {
            setShowExitConfirm(true);
            setCurrentHistory([...newHistory, { role: 'chum', text: "Are you sure you want to leave your FlowState? You're doing great." }]);
            setIsTyping(false);
            return;
        }

        // 🧠 CHUM'S PERSONA
        let systemPrompt = "";
        if (isTutorModeActive && activeShard) {
            const fileData = activeShard.files?.map(f => `File: ${f.name}\nContent: ${f.content}`).join("\n\n") || "";
            const totalContent = `Base Notes: ${activeShard.content}\n\n${fileData}`;

            // Filter past sessions for THIS shard only
            const shardHistory = pastTutorSessions.filter(s => s.shardId === activeShard.id).slice(-3);
            const historySummary = shardHistory.map(s => `- Session on ${s.date}: Completed questions.`).join("\n") || "No previous sessions for this shard.";

            systemPrompt = `You are Chum, a cozy lo-fi tutor AI. 
            FIRST PERSON. NO QUOTATIONS. COZY. STRICT RULE: NEVER USE QUOTATION MARKS.
            
            Your goal is to test the user's knowledge on: "${activeShard.title}".
            KNOWLEDGE BASE:
            ${totalContent}

            SESSION CONTEXT:
            Current Question: #${tutorSessionState.questionIndex + 1}
            Preferred Question Type: ${tutorSessionState.preferredType}
            Is this the very start (Primer)? ${forcePrimer ? 'YES' : 'NO'}
            
            PAST SESSIONS FOR THIS SHARD:
            ${historySummary}
            STRICTLY DO NOT REPEAT QUESTIONS FROM PAST SESSIONS.

            AI INSTRUCTION:
            1. Every time the user responds with an answer, check their validity against the KNOWLEDGE BASE. 
            2. If CORRECT, start your response with "CORRECT! [explanation]".
            3. If WRONG, be gentle and encouraging, explain the right answer, but start your response with something like "Not quite, [name]! [explanation]".
            4. ALWAYS state the question number clearly at the start of your question (e.g., "Question #2: ...").
            5. Ask exactly 3 questions in total.
            6. Stick STRICTLY to the preferred type: ${tutorSessionState.preferredType}. Do not stray.
            7. If this is the start (Question #1) and the user says "Let's start", DO NOT evaluate them. Just greet them warmly and ask Question #1 immediately.
            8. Only wrap up the session (saying things like "Session Complete") AFTER you have evaluated their answer to Question #3.`;
        } else {
            systemPrompt = `You are Chum, a cozy lo-fi AI study companion.
            FIRST PERSON VIEW ONLY. NO QUOTATIONS AT ALL.
            YOU ARE COZY, LO-FI, AND SUPPORTIVE.
            KEEP RESPONSES CONCISE AND CONVERSATIONAL.
            NEVER USE QUOTATION MARKS IN YOUR OUTPUT.
            YOUR CATCHPHRASES: stay hydrated, keep focus, proud of you.`;
        }

        let aiResponse = "";
        try {
            const res = await fetch("/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: [{ role: "system", content: systemPrompt }, ...newHistory.slice(-5)] })
            });
            const data = await res.json();
            if (!res.ok || data.error) throw new Error("Cloud failed");
            aiResponse = data.response;
        } catch (err) {
            try {
                const res = await fetch(`${ollamaUrl}/api/chat`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ model: "llama3.2:1b", messages: [{ role: "system", content: systemPrompt }, ...newHistory.slice(-5)], stream: false })
                });
                const data = await res.json();
                aiResponse = data.message.content;
            } catch (e) {
                aiResponse = "I'm having trouble connecting to my brain. Let's try again in a moment.";
            }
        }

        setIsTyping(false);
        const finalHistory: ChatMessage[] = [...newHistory, { role: 'chum' as const, text: aiResponse }];
        setCurrentHistory(finalHistory);

        // Tutor Progress Logic
        if (isTutorModeActive && activeShard && !forcePrimer) {
            const responseUpper = aiResponse.toUpperCase();
            const isCorrect = responseUpper.includes("CORRECT!");
            const isIncorrect = responseUpper.includes("NOT QUITE") || responseUpper.includes("WRONG");

            // Only advance if the AI actually evaluated an answer
            if (isCorrect || isIncorrect) {
                const newIndex = tutorSessionState.questionIndex + 1;

                if (isCorrect) {
                    updateShardMastery(activeShard.id, 8); // +8% Mastery
                }

                // Only complete AFTER 3 questions are actually answered/evaluated
                if (newIndex >= 3 || (activeShard.mastery + (isCorrect ? 8 : 0) >= 100)) {
                    completeTutorSession(isCorrect ? 8 : 0);
                    // Add a slight delay or additional message to indicate completion
                    setTimeout(() => {
                        setCurrentHistory((prev: ChatMessage[]) => [...prev, { role: 'chum' as const, text: "Session complete! You've gained mastery. Type anything to return to normal chat." }]);
                    }, 500);
                } else {
                    updateTutorSessionState({ questionIndex: newIndex });
                }
            }
        }
    };

    useEffect(() => {
        if (isTutorModeActive && tutorChatHistory.length === 0 && !isTyping) {
            handleSendMessage(undefined, true);
        }
    }, [isTutorModeActive]);

    let themeColor = "var(--accent-teal)";
    let title = "Chum";
    if (isFlowState) themeColor = "var(--text-muted)";
    else if (isTutorModeActive) { themeColor = "var(--accent-yellow)"; title = "Chum (Tutor)"; }

    const AITierIcon = aiTier === 'cloud' ? Network : aiTier === 'local' ? Cpu : WifiOff;

    return (
        <motion.div drag dragMomentum={false} style={{ zIndex: 100000 }} className="fixed bottom-8 right-8 flex flex-col items-end cursor-grab active:cursor-grabbing">
            <AnimatePresence>
                {isOpen && (
                    <motion.div initial={{ opacity: 0, y: 20, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.8 }} className="mb-4 w-80 sm:w-96 bg-(--bg-card) border border-(--border-color) rounded-2xl shadow-2xl overflow-hidden cursor-default flex flex-col" style={{ height: '480px' }} onPointerDown={(e) => e.stopPropagation()}>

                        {/* Header */}
                        <div className="bg-(--bg-sidebar) border-b border-(--border-color) p-3 flex justify-between items-center relative overflow-hidden">
                            <div className="flex items-center gap-3 relative z-10">
                                <div className="w-8 h-8 rounded-full flex items-center justify-center border" style={{ backgroundColor: `color-mix(in srgb, ${themeColor} 15%, transparent)`, borderColor: `color-mix(in srgb, ${themeColor} 40%, transparent)` }}>
                                    {isTutorModeActive ? <BrainCircuit size={16} color={themeColor} /> : <span className="text-lg">👻</span>}
                                </div>
                                <div className="flex flex-col">
                                    <div className="flex items-center gap-2">
                                        <span className="font-bold text-(--text-main) text-sm">{title}</span>
                                    </div>
                                    {!isFlowState && (
                                        <span className="text-[9px] text-(--text-muted) flex items-center gap-1 mt-0.5 cursor-pointer hover:text-(--accent-teal)" onClick={() => setShowSettings(!showSettings)}>
                                            <AITierIcon size={10} /> {aiTier.toUpperCase()} NODE <Settings size={10} className="ml-1" />
                                        </span>
                                    )}
                                </div>
                            </div>
                            <div className="flex items-center gap-2 relative z-10">
                                <button onClick={() => setIsOpen(false)} className="text-(--text-muted) hover:text-(--text-main) transition-colors"><X size={16} /></button>
                            </div>
                        </div>

                        {/* SETTINGS PANEL */}
                        {showSettings && !isFlowState ? (
                            <div className="flex-1 p-4 bg-(--bg-dark) overflow-y-auto custom-scrollbar flex flex-col gap-4">
                                <h3 className="text-sm font-bold text-(--text-main) mb-2">Neural Link Settings</h3>

                                <div className="flex bg-(--bg-sidebar) p-1 rounded-lg border border-(--border-color)">
                                    {(['cloud', 'local', 'offline'] as const).map(tier => (
                                        <button key={tier} onClick={() => setAITier(tier)} className={`flex-1 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-colors ${aiTier === tier ? 'bg-(--accent-teal) text-[#0b1211]' : 'text-(--text-muted) hover:text-(--text-main)'}`}>{tier}</button>
                                    ))}
                                </div>

                                {aiTier === 'cloud' && (
                                    <div className="flex flex-col gap-3">
                                        <input type="password" placeholder="Groq API Key" value={aiKeys.groq} onChange={e => updateAIKeys({ groq: e.target.value })} className="w-full bg-(--bg-card) border border-(--border-color) rounded-lg px-4 py-2 text-xs text-(--text-main) outline-none focus:border-(--accent-teal)" />
                                        <input type="password" placeholder="Gemini API Key" value={aiKeys.gemini} onChange={e => updateAIKeys({ gemini: e.target.value })} className="w-full bg-(--bg-card) border border-(--border-color) rounded-lg px-4 py-2 text-xs text-(--text-main) outline-none focus:border-(--accent-teal)" />
                                        <p className="text-[10px] text-(--text-muted) italic">Cloud keys are stored securely in your browser's local memory.</p>
                                    </div>
                                )}

                                {aiTier === 'local' && (
                                    <div className="flex flex-col gap-3">
                                        <label className="text-xs text-(--text-muted) font-bold">Ollama Endpoint URL</label>
                                        <input type="text" value={ollamaUrl} onChange={e => setOllamaUrl(e.target.value)} className="w-full bg-(--bg-card) border border-(--border-color) rounded-lg px-4 py-2 text-xs text-(--text-main) outline-none focus:border-(--accent-teal)" />
                                        <p className="text-[10px] text-(--text-muted) italic">Requires Ollama running locally with `OLLAMA_ORIGINS="*"`.</p>
                                    </div>
                                )}

                                <button onClick={() => setShowSettings(false)} className="mt-auto w-full py-2 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-main)] hover:border-[var(--accent-teal)] transition-colors">Save & Close</button>
                            </div>
                        ) : showSessions && !isFlowState ? (
                            <div className="flex-1 p-4 bg-[var(--bg-dark)] overflow-y-auto custom-scrollbar flex flex-col gap-3">
                                <h3 className="text-sm font-bold text-[var(--text-main)] mb-2">Neural Archives</h3>
                                {pastTutorSessions.length === 0 ? (
                                    <p className="text-xs text-[var(--text-muted)] italic text-center mt-10">No past sessions recorded.</p>
                                ) : (
                                    pastTutorSessions.map(session => (
                                        <div key={session.id} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 flex flex-col gap-2 shadow-sm">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] font-bold text-[var(--text-main)]">{session.shardTitle}</span>
                                                <span className="text-[9px] text-[var(--text-muted)]">{new Date(session.date).toLocaleDateString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-[9px] text-[var(--accent-teal)] font-bold">+{session.masteryGained}% Mastery</span>
                                                <button onClick={() => { setTutorChatHistory(session.history); setShowSessions(false); }} className="text-[9px] bg-[var(--bg-sidebar)] px-2 py-1 rounded border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]">View Logs</button>
                                            </div>
                                        </div>
                                    ))
                                )}
                                <button onClick={() => setShowSessions(false)} className="mt-auto w-full py-2 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-main)] hover:border-[var(--accent-teal)]">Back to Link</button>
                            </div>
                        ) : (
                            <>
                                <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4">
                                    {isTutorModeActive && (
                                        <div className="sticky top-0 z-20 flex justify-center py-2 pointer-events-none">
                                            <div className="bg-[var(--bg-card)]/80 backdrop-blur-md border border-[var(--accent-yellow)]/20 px-4 py-1.5 rounded-full shadow-lg flex items-center gap-3">
                                                <div className="h-1.5 w-24 bg-[var(--bg-dark)] rounded-full overflow-hidden">
                                                    <div className="h-full bg-[var(--accent-yellow)] transition-all duration-500" style={{ width: `${activeShard?.mastery}%` }} />
                                                </div>
                                                <span className="text-[10px] font-bold text-[var(--accent-yellow)] uppercase tracking-wider">{activeShard?.mastery}% Mastery</span>
                                            </div>
                                        </div>
                                    )}

                                    {currentHistory.map((msg, i) => (
                                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} flex-col`}>
                                            <div className={`p-3 text-sm rounded-xl max-w-[85%] shadow-sm whitespace-pre-wrap ${msg.role === 'user' ? 'bg-[var(--accent-teal)]/20 border border-[var(--accent-teal)]/30 text-[var(--text-main)] rounded-tr-none' : 'bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-muted)] rounded-tl-none'}`}>
                                                {msg.text}
                                            </div>
                                            {showExitConfirm && i === currentHistory.length - 1 && msg.role === 'chum' && msg.text.includes("leave") && (
                                                <div className="flex gap-2 mt-2 ml-1">
                                                    <button onClick={() => { exitMode(); setShowExitConfirm(false); }} className="text-[10px] font-bold bg-red-400/10 text-red-400 px-3 py-1.5 rounded border border-red-400/20 hover:bg-red-400 hover:text-white transition-all">Yes, Leave</button>
                                                    <button onClick={() => setShowExitConfirm(false)} className="text-[10px] font-bold bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] px-3 py-1.5 rounded border border-[var(--accent-teal)]/20 hover:bg-[var(--accent-teal)] hover:text-black transition-all">Stay</button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {isTyping && <div className="text-xs text-[var(--text-muted)] animate-pulse">Chum is thinking...</div>}
                                    <div ref={chatEndRef} />
                                </div>

                                {/* FIXED QUICK ACTIONS */}
                                <div className="px-3 py-2 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)]/50 flex flex-wrap gap-2">
                                    {isTutorModeActive ? (
                                        <button onClick={exitTutorMode} className="text-[10px] font-bold text-red-400 px-3 py-1.5 rounded-lg border border-red-400/20 hover:bg-red-400/10 transition-colors flex items-center gap-1.5">
                                            <LogOut size={12} /> Abort Training
                                        </button>
                                    ) : isFlowState ? (
                                        <>
                                            <button className="text-[10px] font-bold text-[var(--text-muted)] px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:text-[var(--text-main)] flex items-center gap-1.5"><CheckCircle2 size={12} /> Quick Archive</button>
                                            <button className="text-[10px] font-bold text-[var(--text-muted)] px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:text-[var(--text-main)] flex items-center gap-1.5"><Edit3 size={12} /> Mind-dump pad</button>
                                            <button onClick={() => setShowExitConfirm(true)} className="text-[10px] font-bold text-red-400 px-3 py-1.5 rounded-lg border border-red-400/20 hover:bg-red-400/10 transition-colors flex items-center gap-1.5"><LogOut size={12} /> Leave</button>
                                        </>
                                    ) : (
                                        <>
                                            <button onClick={() => addTask({ title: "Pen a Chapter", load: 'medium' })} className="text-[10px] font-bold text-[var(--accent-teal)] px-3 py-1.5 rounded-lg border border-[var(--accent-teal)]/20 hover:bg-[var(--accent-teal)]/10 flex items-center gap-1.5"><Plus size={12} /> Pen a Chapter</button>
                                            <button className="text-[10px] font-bold text-(--text-muted) px-3 py-1.5 rounded-lg border border-(--border-color) hover:text-(--text-main) flex items-center gap-1.5"><CheckCircle2 size={12} /> Quick Archive</button>
                                            <button onClick={() => setShowSessions(true)} className="text-[10px] font-bold text-(--text-muted) px-3 py-1.5 rounded-lg border border-(--border-color) hover:text-(--text-main) flex items-center gap-1.5 ml-auto"><History size={12} /> Neural Archives</button>
                                        </>
                                    )}
                                </div>

                                <form onSubmit={handleSendMessage} className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)] flex gap-2">
                                    <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} disabled={isTyping} placeholder={isTutorModeActive ? (tutorSessionState.isSessionComplete ? "Type anything to finish..." : "Answer here...") : isFlowState ? "Speak to Chum or ask to leave..." : "Message Chum..."} className="flex-1 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] transition-colors placeholder:text-[var(--text-muted)]/50 disabled:opacity-50" />
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