"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, CheckCircle2, Edit3, LogOut, Plus, BrainCircuit, Network, Cpu, WifiOff, Settings, History } from "lucide-react";
import { useStudyStore, ChatMessage, TutorSession, TutorSessionState, Shard, TaskLoad } from "@/store/useStudyStore";
import { supabase } from '@/lib/supabase';

export default function ChumWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [showSessions, setShowSessions] = useState(false);
    const [inputText, setInputText] = useState("");
    const [isTyping, setIsTyping] = useState(false);
    const [viewingLog, setViewingLog] = useState<TutorSession | null>(null);
    const chatEndRef = useRef<HTMLDivElement>(null);
    const [showQuickArchive, setShowQuickArchive] = useState(false);
    const [readingShard, setReadingShard] = useState<Shard | null>(null);

    const {
        activeMode, exitMode, isTutorModeActive, activeShardId, exitTutorMode,
        shards, updateShardMastery, aiTier, setAITier, aiKeys, updateAIKeys, ollamaUrl, setOllamaUrl,
        normalChatHistory, tutorChatHistory, setNormalChatHistory, setTutorChatHistory,
        tutorSessionState, updateTutorSessionState, completeTutorSession, pastTutorSessions, addTask, toggleMindDump
    } = useStudyStore();

    const currentHistory = isTutorModeActive ? tutorChatHistory : normalChatHistory;
    const setCurrentHistory = isTutorModeActive ? setTutorChatHistory : setNormalChatHistory;

    const isFlowState = activeMode === "flowState";
    const activeShard = shards.find(s => s.id === activeShardId);

    const [showTaskForm, setShowTaskForm] = useState(false);
    const [newTask, setNewTask] = useState<{ title: string, description: string, load: TaskLoad, deadline?: string }>({ title: "", description: "", load: "medium" });
    const [isScheduled, setIsScheduled] = useState(false);

    useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [currentHistory, isOpen, showSettings, showSessions]);
    useEffect(() => { if (isTutorModeActive) setIsOpen(true); }, [isTutorModeActive]);

    const handleToggleSchedule = (checked: boolean) => {
        setIsScheduled(checked);
        if (checked && !newTask.deadline) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            setNewTask({ ...newTask, deadline: now.toISOString().slice(0, 16) });
        } else if (!checked) {
            setNewTask({ ...newTask, deadline: undefined });
        }
    };

    const handleSendMessage = async (e?: React.FormEvent, forcePrimer = false) => {
        if (e) e.preventDefault();

        const messageText = forcePrimer ? "Let's start our session! I'm ready for the first question." : inputText;
        if (!messageText.trim()) return;

        const newHistory = [...currentHistory, { role: 'user' as const, text: messageText }];
        setCurrentHistory(newHistory);
        if (!forcePrimer) setInputText("");
        setIsTyping(true);

        if (isTutorModeActive && tutorSessionState.isSessionComplete) {
            setIsTyping(false);
            exitTutorMode();
            return;
        }

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

        let systemPrompt = "";
        if (isTutorModeActive && activeShard) {
            const totalContent = `Base Notes: ${activeShard.content}`;
            const shardHistory = pastTutorSessions.filter(s => s.shardId === activeShard.id).slice(-3);
            const historySummary = shardHistory.map(s => {
                // Extract the past conversation to give the AI concrete context
                const pastQA = s.history.map(m => `${m.role.toUpperCase()}: ${m.text.replace(/\n/g, ' ')}`).join('\n');
                return `--- Session on ${new Date(s.date).toLocaleDateString()} ---\n${pastQA}`;
            }).join("\n\n") || "No previous sessions recorded.";

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
            const { data: { session } } = await supabase.auth.getSession();
            const activeHistory = isTutorModeActive ? tutorChatHistory : normalChatHistory;
            const historyToSend = activeHistory.map(msg => ({
                role: msg.role === 'chum' ? 'assistant' : 'user',
                content: msg.text
            }));

            const messagesPayload = [
                { role: "system", content: systemPrompt },
                ...historyToSend,
                { role: "user", content: messageText }
            ];

            const res = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    messages: messagesPayload,
                    user_id: session?.user?.id,
                    openrouter_key: aiKeys.openrouter,
                    gemini_key: aiKeys.gemini
                })
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
                aiResponse = "Neural link failed. If using Ollama, ensure it is running and CORS is allowed (set OLLAMA_ORIGINS=\"*\" in env vars). Check your Ollama server and network connection.";
            }
        }

        setIsTyping(false);
        const finalHistory: ChatMessage[] = [...newHistory, { role: 'chum' as const, text: aiResponse }];
        setCurrentHistory(finalHistory);

        if (isTutorModeActive && activeShard && !forcePrimer) {
            const responseUpper = aiResponse.toUpperCase();
            const isCorrect = responseUpper.includes("CORRECT!");
            const isIncorrect = responseUpper.includes("NOT QUITE") || responseUpper.includes("WRONG");

            if (isCorrect || isIncorrect) {
                const newIndex = tutorSessionState.questionIndex + 1;
                const currentGain = isCorrect ? 8 : 0;
                const totalSessionMastery = (tutorSessionState.totalMasteryGained || 0) + currentGain;

                updateShardMastery(activeShard.id, currentGain);
                updateTutorSessionState({
                    questionIndex: newIndex,
                    totalMasteryGained: totalSessionMastery
                });

                const updatedShard = useStudyStore.getState().shards.find(s => s.id === activeShard.id);
                const hasReachedMax = updatedShard && updatedShard.mastery >= 100;

                if (newIndex >= 3 || hasReachedMax) {
                    completeTutorSession(totalSessionMastery);

                    setTimeout(() => {
                        const completionMsg = hasReachedMax
                            ? "Incredible! Mastery reached 100%. This chapter is now part of your permanent knowledge. 🌟"
                            : "Session complete! Check your Neural Archives to see your progress.";

                        setCurrentHistory((prev: ChatMessage[]) => [
                            ...prev,
                            { role: 'chum', text: completionMsg }
                        ]);
                    }, 600);
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
        <>
            {/* 1. THE CHAT WIDGET (Draggable) */}
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
                                    <button onClick={() => setIsOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><X size={16} /></button>
                                </div>
                            </div>

                            {/* Settings / Quick Archive / Chat Logic */}
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
                                            <input type="password" placeholder="OpenRouter API Key (Optional)" value={aiKeys.openrouter} onChange={e => updateAIKeys({ openrouter: e.target.value })} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)]" />
                                            <input type="password" placeholder="Groq API Key" value={aiKeys.groq} onChange={e => updateAIKeys({ groq: e.target.value })} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)]" />
                                            <input type="password" placeholder="Gemini API Key" value={aiKeys.gemini} onChange={e => updateAIKeys({ gemini: e.target.value })} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)]" />
                                        </div>
                                    )}
                                    {aiTier === 'local' && (
                                        <div className="flex flex-col gap-3">
                                            <label className="text-xs text-[var(--text-muted)] font-bold">Ollama Endpoint URL</label>
                                            <input type="text" value={ollamaUrl} onChange={e => setOllamaUrl(e.target.value)} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-4 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)]" />
                                        </div>
                                    )}
                                    <button onClick={() => setShowSettings(false)} className="mt-auto w-full py-2 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-main)] hover:border-[var(--accent-teal)] transition-colors">Save & Close</button>
                                </div>

                            ) : showQuickArchive ? (
                                <div className="flex-1 p-4 bg-[var(--bg-dark)] overflow-y-auto custom-scrollbar flex flex-col gap-3">
                                    <div className="flex justify-between items-center mb-2">
                                        <h3 className="text-sm font-bold text-[var(--text-main)]">
                                            {readingShard ? "Reading Note" : "Quick Archive"}
                                        </h3>
                                        {readingShard && (
                                            <button onClick={() => setReadingShard(null)} className="text-xs text-[var(--accent-teal)] hover:underline">Back</button>
                                        )}
                                    </div>
                                    {readingShard ? (
                                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-4 text-xs text-[var(--text-main)] leading-relaxed whitespace-pre-wrap shadow-inner">
                                            <h4 className="font-bold mb-3 text-sm border-b border-[var(--border-color)] pb-2">{readingShard.title}</h4>
                                            {readingShard.content || "No text content available."}
                                        </div>
                                    ) : shards.length === 0 ? (
                                        <p className="text-xs text-[var(--text-muted)] italic text-center mt-10">No shards forged yet.</p>
                                    ) : (
                                        shards.map(shard => (
                                            <div key={shard.id} onClick={() => setReadingShard(shard)} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl p-3 flex justify-between items-center shadow-sm cursor-pointer hover:border-[var(--accent-teal)] transition-colors">
                                                <span className="text-[11px] font-bold text-[var(--text-main)] truncate max-w-[200px]">{shard.title}</span>
                                                <span className="text-[9px] text-[var(--accent-teal)] font-bold">{shard.mastery}%</span>
                                            </div>
                                        ))
                                    )}
                                    <button onClick={() => { setShowQuickArchive(false); setReadingShard(null); }} className="mt-auto w-full py-2 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg text-xs font-bold text-[var(--text-main)] hover:border-[var(--accent-teal)] transition-colors">Back to Chat</button>
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
                                                    <button onClick={() => { setViewingLog(session); }} className="text-[9px] bg-[var(--bg-sidebar)] px-2 py-1 rounded border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]">View Logs</button>
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

                                    {/* QUICK ACTIONS */}
                                    <div className="px-3 py-2 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)]/50 flex flex-wrap gap-2">
                                        {isTutorModeActive ? (
                                            <button onClick={exitTutorMode} className="text-[10px] font-bold text-red-400 px-3 py-1.5 rounded-lg border border-red-400/20 hover:bg-red-400/10 transition-colors flex items-center gap-1.5">
                                                <LogOut size={12} /> Abort Training
                                            </button>
                                        ) : isFlowState ? (
                                            <>
                                                <button onClick={() => setShowQuickArchive(true)} className="text-[10px] font-bold text-[var(--text-muted)] px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:text-[var(--text-main)] flex items-center gap-1.5"><CheckCircle2 size={12} /> Quick Archive</button>
                                                <button onClick={toggleMindDump} className="text-[10px] font-bold text-[var(--text-muted)] px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:text-[var(--text-main)] flex items-center gap-1.5"><Edit3 size={12} /> Mind-dump pad</button>
                                                <button onClick={() => setShowExitConfirm(true)} className="text-[10px] font-bold text-red-400 px-3 py-1.5 rounded-lg border border-red-400/20 hover:bg-red-400/10 transition-colors flex items-center gap-1.5"><LogOut size={12} /> Leave</button>
                                            </>
                                        ) : (
                                            <>
                                                <button onClick={() => setShowTaskForm(true)} className="text-[10px] font-bold text-[var(--accent-teal)] px-3 py-1.5 rounded-lg border border-[var(--accent-teal)]/20 hover:bg-[var(--accent-teal)]/10 flex items-center gap-1.5"><Plus size={12} /> Pen a Chapter</button>
                                                <button onClick={() => setShowQuickArchive(true)} className="text-[10px] font-bold text-[var(--text-muted)] px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:text-[var(--text-main)] flex items-center gap-1.5"><CheckCircle2 size={12} /> Quick Archive</button>
                                                <button onClick={() => setShowSessions(true)} className="text-[10px] font-bold text-[var(--text-muted)] px-3 py-1.5 rounded-lg border border-[var(--border-color)] hover:text-[var(--text-main)] flex items-center gap-1.5 ml-auto"><History size={12} /> Neural Archives</button>
                                            </>
                                        )}
                                    </div>

                                    <form onSubmit={handleSendMessage} className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)] flex gap-2">
                                        <input type="text" value={inputText} onChange={(e) => setInputText(e.target.value)} disabled={isTyping} placeholder={isTutorModeActive ? (tutorSessionState.isSessionComplete ? "Type anything to finish..." : "Answer here...") : isFlowState ? "Speak to Chum or ask to leave..." : "Message Chum..."} className="flex-1 bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] transition-colors placeholder:text-[var(--text-muted)]/50 disabled:opacity-50" />
                                        <button type="submit" disabled={!inputText.trim() || isTyping} className="rounded-xl w-10 flex items-center justify-center transition-all disabled:opacity-50 disabled:cursor-not-allowed" style={{ backgroundColor: `color-mix(in srgb, ${themeColor} 15%, transparent)`, color: themeColor, border: `1px solid color-mix(in srgb, ${themeColor} 30%, transparent)` }}><Send size={16} /></button>
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

            {/* 2. LOG VIEWER MODAL (Moved OUTSIDE the drag container!) */}
            <AnimatePresence>
                {viewingLog && (
                    <div className="fixed inset-0 z-[100005] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setViewingLog(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" />
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-3xl w-full max-w-lg max-h-[80vh] overflow-hidden relative z-10 shadow-2xl flex flex-col cursor-default" onPointerDown={(e) => e.stopPropagation()}>

                            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-card)]">
                                <div>
                                    <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2">
                                        <History size={14} className="text-[var(--accent-teal)]" />
                                        {viewingLog.shardTitle}
                                    </h2>
                                    <span className="text-[10px] text-[var(--text-muted)] font-mono">
                                        {new Date(viewingLog.date).toLocaleString()} • +{viewingLog.masteryGained}% Mastery
                                    </span>
                                </div>
                                <button onClick={() => setViewingLog(null)} className="p-1.5 rounded-md hover:bg-[var(--bg-dark)] text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">
                                    <X size={16} />
                                </button>
                            </div>

                            <div className="p-4 overflow-y-auto custom-scrollbar flex-1 space-y-4 bg-[var(--bg-dark)]">
                                {viewingLog.history.length === 0 ? (
                                    <p className="text-center text-[var(--text-muted)] italic text-xs">No conversation recorded.</p>
                                ) : (
                                    viewingLog.history.map((msg, idx) => (
                                        <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className={`max-w-[90%] rounded-2xl p-4 text-xs leading-relaxed shadow-sm flex flex-col gap-2 ${msg.role === 'user'
                                                ? 'bg-[var(--accent-teal)]/20 border border-[var(--accent-teal)]/30 text-[var(--text-main)] rounded-tr-none'
                                                : 'bg-[var(--bg-card)] border border-[var(--border-color)] text-[var(--text-main)] rounded-tl-none'
                                                }`}>
                                                {msg.text.split('\n\n').map((paragraph, pIdx) => (
                                                    <p key={pIdx} className="m-0">{paragraph}</p>
                                                ))}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* 3. TASK FORM MODAL (Moved OUTSIDE the drag container!) */}
            <AnimatePresence>
                {showTaskForm && (
                    <div className="fixed inset-0 z-[100005] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowTaskForm(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" />
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-3xl w-full max-w-sm relative z-10 shadow-2xl flex flex-col overflow-hidden" onPointerDown={(e) => e.stopPropagation()}>
                            <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-card)]">
                                <h2 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2"><Plus size={14} className="text-[var(--accent-teal)]" /> Pen a Chapter</h2>
                                <button onClick={() => setShowTaskForm(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={16} /></button>
                            </div>
                            <div className="p-4 flex flex-col gap-3">
                                <input autoFocus type="text" placeholder="Quest Title" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)]" />
                                <textarea placeholder="Optional description..." value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] resize-none h-16 custom-scrollbar" />

                                <div className="flex gap-2">
                                    {(['light', 'medium', 'heavy'] as const).map(load => (
                                        <button key={load} onClick={() => setNewTask({ ...newTask, load })} className={`flex-1 py-1.5 rounded-md border text-xs font-bold uppercase ${newTask.load === load ? 'bg-[var(--accent-teal)]/20 border-[var(--accent-teal)] text-[var(--accent-teal)]' : 'bg-[var(--bg-dark)] border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>
                                            {load}
                                        </button>
                                    ))}
                                </div>

                                <div className="bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-lg p-3 flex flex-col gap-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">Best Before</span>
                                        <div onClick={() => handleToggleSchedule(!isScheduled)} className="flex items-center gap-2 cursor-pointer group">
                                            <span className={`text-xs font-bold transition-colors ${isScheduled ? 'text-[var(--accent-teal)]' : 'text-[var(--text-muted)] group-hover:text-gray-400'}`}>
                                                {isScheduled ? 'Scheduled' : 'Unscheduled'}
                                            </span>
                                            <div className={`w-8 h-4 rounded-full p-0.5 flex items-center transition-colors duration-300 ${isScheduled ? 'bg-[var(--accent-teal)]' : 'bg-[var(--bg-sidebar)] border border-[var(--border-color)]'}`}>
                                                <div className={`w-3 h-3 rounded-full shadow-sm transition-transform duration-300 ${isScheduled ? 'translate-x-4 bg-[#0b1211]' : 'translate-x-0 bg-[var(--text-muted)]'}`} />
                                            </div>
                                        </div>
                                    </div>
                                    <AnimatePresence>
                                        {isScheduled && (
                                            <motion.input initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} type="datetime-local" value={newTask.deadline || ""} onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })} className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-md px-3 py-1.5 text-xs text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] mt-1" />
                                        )}
                                    </AnimatePresence>
                                </div>

                                <button
                                    disabled={!newTask.title.trim()}
                                    onClick={() => {
                                        addTask({ ...newTask, deadline: isScheduled ? newTask.deadline : undefined });
                                        setNewTask({ title: "", description: "", load: "medium", deadline: undefined });
                                        setIsScheduled(false);
                                        setShowTaskForm(false);
                                    }}
                                    className="mt-2 w-full py-2.5 bg-[var(--accent-teal)] text-[#0b1211] rounded-lg text-xs font-bold transition-all disabled:opacity-50 hover:bg-teal-400"
                                >
                                    Plant Seed
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}