"use client";

import { useStudyStore } from "@/store/useStudyStore";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, X } from "lucide-react";
import { useState, useEffect } from "react";

export default function FlowStateOverlay() {
    const {
        activeMode,
        activeTaskId,
        tasks,
        timeLeft,
        isRunning,
        completeTask,
        exitMode
    } = useStudyStore();

    const [showExitConfirm, setShowExitConfirm] = useState(false);

    // Keep ticking while in flow state
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (activeMode !== 'none' && isRunning && timeLeft > 0) {
            interval = setInterval(() => useStudyStore.getState().decrementTimer(), 1000);
        }
        return () => clearInterval(interval);
    }, [activeMode, isRunning, timeLeft]);

    if (activeMode !== "flowState") return null;

    const task = activeTaskId ? tasks.find(t => t.id === activeTaskId) : null;

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const handleComplete = () => {
        if (task) completeTask(task.id);
        exitMode();
    };

    const handleExitClick = () => {
        setShowExitConfirm(true);
    };

    const confirmExit = () => {
        setShowExitConfirm(false);
        exitMode();
    };

    const cancelExit = () => {
        setShowExitConfirm(false);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[99999] bg-[#050808] flex items-center justify-center p-8 overflow-hidden"
            >
                {/* Minimalist Background Animation */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div
                        animate={{
                            scale: [1, 1.05, 1],
                            opacity: [0.1, 0.2, 0.1]
                        }}
                        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[80vw] h-[80vw] max-w-[800px] max-h-[800px] rounded-full bg-[var(--accent-teal)]/20 blur-[120px]"
                    />
                </div>

                {/* Main Content */}
                <div className="relative z-10 flex flex-col items-center max-w-2xl w-full text-center">

                    {/* Ghost Mode Badge */}
                    <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="mb-12 inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--accent-teal)] text-xs font-bold tracking-widest uppercase">
                        <span className="w-2 h-2 rounded-full bg-[var(--accent-teal)] animate-pulse" /> FlowState Active
                    </motion.div>

                    {/* Massive Timer */}
                    <div className="relative flex items-center justify-center mb-16">
                        <motion.h1
                            className="text-[12rem] md:text-[18rem] font-bold text-[var(--text-main)] tracking-widest font-mono leading-none drop-shadow-[0_0_30px_rgba(20,184,166,0.2)]"
                        >
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
                        {/* Exit */}
                        <button
                            onClick={handleExitClick}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className="w-16 h-16 rounded-full border border-[var(--border-color)] text-[var(--text-muted)] group-hover:text-red-400 group-hover:border-red-400/50 group-hover:bg-red-400/5 flex items-center justify-center transition-all">
                                <X size={22} />
                            </div>
                            <span className="text-xs text-[var(--text-muted)] group-hover:text-red-400 font-medium tracking-wider transition-colors">Quit</span>
                        </button>

                        {/* Complete Task */}
                        <button
                            onClick={handleComplete}
                            className="flex flex-col items-center gap-2 group"
                        >
                            <div className="w-24 h-24 rounded-full bg-[var(--accent-teal)]/10 border-2 border-[var(--accent-teal)]/40 text-[var(--accent-teal)] group-hover:bg-[var(--accent-teal)] group-hover:text-[#050808] shadow-[0_0_30px_rgba(20,184,166,0.15)] group-hover:shadow-[0_0_40px_rgba(20,184,166,0.4)] flex items-center justify-center transition-all">
                                <CheckCircle2 size={40} className="group-hover:scale-110 transition-transform" />
                            </div>
                            <span className="text-xs text-[var(--text-muted)] group-hover:text-[var(--accent-teal)] font-medium tracking-wider transition-colors">Done</span>
                        </button>
                    </div>
                </div>

                {/* Exit Confirmation Modal */}
                <AnimatePresence>
                    {showExitConfirm && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                        >
                            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-8 max-w-sm text-center">
                                <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Break your flow?</h3>
                                <p className="text-[var(--text-muted)] text-sm mb-6">Exiting early will not mark this chapter as complete. Are you sure you want to leave FlowState?</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <button onClick={cancelExit} className="py-3 rounded-xl border border-[var(--border-color)] text-[var(--text-main)] font-bold hover:bg-[var(--bg-sidebar)] transition-colors">Stay</button>
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
