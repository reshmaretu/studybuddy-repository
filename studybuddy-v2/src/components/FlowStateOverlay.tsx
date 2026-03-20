"use client";

import { useStudyStore } from "@/store/useStudyStore";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X, Maximize, BrainCircuit, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function FlowStateOverlay() {
    // ==========================================
    // 1. STRICT HOOK ORDER (ALL AT THE TOP)
    // ==========================================
    const {
        activeMode,
        activeTaskId,
        tasks,
        timeLeft,
        isRunning,
        completeTask,
        exitMode,
        isPremiumUser
    } = useStudyStore();

    const [stressLevel, setStressLevel] = useState(50);
    const [actualPomos, setActualPomos] = useState(1);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
    const [isFullscreenReady, setIsFullscreenReady] = useState(false);

    const task = activeTaskId ? tasks.find(t => t.id === activeTaskId) : null;

    // Timer Effect: Only ticks if FlowState is active AND they accepted the Fullscreen prompt
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (activeMode === 'flowState' && isRunning && timeLeft > 0 && isFullscreenReady) {
            interval = setInterval(() => useStudyStore.getState().decrementTimer(), 1000);
        }
        return () => clearInterval(interval);
    }, [activeMode, isRunning, timeLeft, isFullscreenReady]);

    // DB Anchor Effect
    useEffect(() => {
        const anchor = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && activeMode === 'flowState') {
                await supabase.from('profiles')
                    .update({
                        status: 'flowState',
                        is_in_flowstate: true,
                        last_seen: new Date().toISOString()
                    })
                    .eq('id', user.id);
            }
        };
        if (activeMode === 'flowState') anchor();
    }, [activeMode]);

    // Premium Survey Auto-fill Effect
    useEffect(() => {
        if (showCompleteConfirm && task?.estimatedPomos) {
            setActualPomos(task.estimatedPomos);
            setStressLevel(50);
        }
    }, [showCompleteConfirm, task]);

    // Cleanup: Exit fullscreen automatically when FlowState ends
    useEffect(() => {
        if (activeMode !== 'flowState') {
            setIsFullscreenReady(false);
            if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => { });
            }
        }
    }, [activeMode]);

    // ==========================================
    // 2. EARLY RETURN (MUST BE AFTER ALL HOOKS)
    // ==========================================
    if (activeMode !== "flowState") return null;

    // ==========================================
    // 3. LOGIC & RENDER
    // ==========================================

    const enterFullscreen = () => {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch((err) => console.log("Fullscreen blocked by browser:", err));
        }
        setIsFullscreenReady(true);
    };

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const confirmComplete = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (task) {
            completeTask(task.id, isPremiumUser ? { actualPomos, stressLevel } : undefined);
        }
        if (user) {
            await supabase.from('profiles').update({ status: 'idle', is_in_flowstate: false }).eq('id', user.id);
        }
        useStudyStore.setState({ activeMode: 'none' });
        setShowCompleteConfirm(false);
        exitMode();
    };

    const confirmExit = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setShowExitConfirm(false);

        const { timeLeft, modifyFocusScore } = useStudyStore.getState();
        if (timeLeft > 0) {
            modifyFocusScore(-10);
            useStudyStore.getState().triggerChumToast("Focus broken. -10 Focus Score.", "warning");
        }

        if (user) {
            await supabase.from('profiles').update({ status: 'idle', is_in_flowstate: false }).eq('id', user.id);
        }
        useStudyStore.getState().exitMode();
    };

    // 🔥 THE ANTI-DISTRACTION LISTENER
    useEffect(() => {
        // Only track if the timer is actively ticking
        if (!isRunning) return;

        const handleVisibilityChange = () => {
            if (document.hidden) {
                // They minimized the window or switched to a different app completely
                useStudyStore.getState().incrementFlowBreak();
            }
        };

        const handleBlur = () => {
            // They clicked away from the window or switched browser tabs
            useStudyStore.getState().incrementTabSwitch();
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleBlur);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
        };
    }, [isRunning]);

    // 🛡️ THE FULLSCREEN GUARD MODAL
    if (!isFullscreenReady) {
        return (
            <div className="fixed inset-0 z-[99999] bg-[var(--bg-dark)] flex items-center justify-center p-8">
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-8 max-w-sm text-center shadow-2xl relative z-10">
                    <div className="w-16 h-16 rounded-full bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] flex items-center justify-center mx-auto mb-6">
                        <Maximize size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--text-main)] mb-3">Enter FlowState</h2>
                    <p className="text-[var(--text-muted)] text-sm mb-8 leading-relaxed">
                        To achieve deep work, FlowState will maximize your browser to full screen and lock out distractions.
                    </p>
                    <div className="flex flex-col gap-3">
                        <button onClick={enterFullscreen} className="w-full py-3 rounded-xl bg-[var(--accent-teal)] text-[#0b1211] font-bold hover:bg-teal-400 transition-colors shadow-[0_0_20px_rgba(20,184,166,0.3)]">
                            Go Full Screen & Begin
                        </button>
                        <button onClick={() => exitMode()} className="w-full py-3 rounded-xl border border-[var(--border-color)] text-[var(--text-muted)] font-bold hover:text-[var(--text-main)] transition-colors">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // 🌊 THE MAIN FLOWSTATE UI
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[99999] bg-[var(--bg-dark)] flex items-center justify-center p-8 overflow-hidden"
            >
                {/* Minimalist Background Animation */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div
                        animate={{ scale: [1, 1.05, 1], opacity: [0.1, 0.2, 0.1] }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] rounded-full bg-[var(--accent-teal)]/20 blur-[120px]"
                    />
                </div>

                {/* Main Content */}
                <div className="relative z-10 flex flex-col items-center max-w-2xl w-full text-center">

                    <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="mb-12 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--accent-teal)] text-xs font-bold tracking-widest uppercase">
                        <span className="w-2 h-2 rounded-full bg-[var(--accent-teal)] animate-pulse" /> FlowState Active
                    </motion.div>

                    {/* Massive Timer */}
                    <div className="relative flex items-center justify-center mb-16">
                        <motion.h1 className="text-[12rem] md:text-[18rem] font-bold text-[var(--text-main)] tracking-widest font-mono leading-none drop-shadow-[0_0_30px_rgba(20,184,166,0.2)]">
                            {formatTime(timeLeft)}
                        </motion.h1>
                    </div>

                    {/* Chapter Focus */}
                    <div className="mb-16 w-full">
                        <h2 className="text-3xl font-bold text-[var(--text-main)] mb-3">
                            {task ? task.title : "Deep Work Session"}
                        </h2>
                        <p className="text-[var(--text-muted)] text-lg max-w-lg mx-auto">
                            {task ? task.description : "Unstructured flowstate. Stay focused."}
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-8">
                        <button onClick={() => setShowExitConfirm(true)} className="flex flex-col items-center gap-2 group">
                            <div className="w-16 h-16 rounded-full border border-[var(--border-color)] text-[var(--text-muted)] group-hover:text-red-400 group-hover:border-red-400/50 group-hover:bg-red-400/5 flex items-center justify-center transition-all">
                                <X size={22} />
                            </div>
                            <span className="text-xs text-[var(--text-muted)] group-hover:text-red-400 font-medium tracking-wider transition-colors">Quit</span>
                        </button>

                        <button onClick={() => setShowCompleteConfirm(true)} className="flex flex-col items-center gap-2 group">
                            <div className="w-24 h-24 rounded-full bg-[var(--accent-teal)]/10 border-2 border-[var(--accent-teal)]/40 text-[var(--accent-teal)] group-hover:bg-[var(--accent-teal)] group-hover:text-[#050808] shadow-[0_0_30px_rgba(20,184,166,0.15)] group-hover:shadow-[0_0_40px_rgba(20,184,166,0.4)] flex items-center justify-center transition-all">
                                <CheckCircle2 size={40} className="group-hover:scale-110 transition-transform" />
                            </div>
                            <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--accent-teal)] font-medium tracking-wider transition-colors">Done</span>
                        </button>
                    </div>
                </div>

                <AnimatePresence>
                    {showCompleteConfirm && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 backdrop-blur-md"
                        >
                            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-8 max-w-sm text-center shadow-2xl">
                                <div className="w-16 h-16 bg-teal-500/20 text-teal-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 size={32} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-2">Chapter Complete?</h3>
                                <p className="text-white/40 text-sm mb-6">Ready to log your progress and return to the Lantern Network?</p>

                                {/* 🔥 PREMIUM POST-MATCH SURVEY 🔥 */}
                                {isPremiumUser && (
                                    <div className="mb-6 space-y-4 text-left bg-black/40 p-4 rounded-xl border border-[var(--accent-yellow)]/20 shadow-[inset_0_0_20px_rgba(250,204,21,0.05)]">
                                        <div>
                                            <label className="text-xs font-bold text-[var(--accent-yellow)] flex items-center gap-1.5 mb-2">
                                                <BrainCircuit size={12} /> Stress Level: {stressLevel}
                                            </label>
                                            <input
                                                type="range" min="0" max="100" value={stressLevel} onChange={e => setStressLevel(parseInt(e.target.value))}
                                                className="w-full accent-[var(--accent-yellow)]"
                                            />
                                            <div className="flex justify-between text-[9px] text-white/40 mt-1 uppercase font-bold tracking-widest">
                                                <span>Flow (0)</span><span>Burnout (100)</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-[var(--accent-yellow)] flex items-center gap-1.5 mb-2">
                                                <Clock size={12} /> Actual Pomodoros
                                            </label>
                                            <input
                                                type="number" min="1" value={actualPomos} onChange={e => setActualPomos(parseInt(e.target.value) || 1)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent-yellow)]"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => setShowCompleteConfirm(false)} className="py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors">Not yet</button>
                                    <button onClick={confirmComplete} className="py-3 rounded-xl bg-teal-500 text-black font-bold hover:bg-teal-400 transition-colors">Finish</button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {showExitConfirm && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                        >
                            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-8 max-w-sm text-center">
                                <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Break your flow?</h3>
                                <p className="text-[var(--text-muted)] text-sm mb-6">Exiting early will not mark this chapter as complete. Are you sure you want to leave FlowState?</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={() => setShowExitConfirm(false)} className="py-3 rounded-xl border border-[var(--border-color)] text-[var(--text-main)] font-bold hover:bg-[var(--bg-sidebar)] transition-colors">Stay</button>
                                    <button onClick={confirmExit} className="py-3 rounded-xl bg-red-500/10 text-red-500 font-bold hover:bg-red-500 hover:text-white transition-colors">Exit</button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>
        </AnimatePresence>
    );
}