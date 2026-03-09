"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Edit3, X, CheckSquare, Hammer } from "lucide-react";
import { useStudyStore } from "@/store/useStudyStore";

export default function MindDumpPad() {
    const { isMindDumpOpen, toggleMindDump, addTask, forgeShard } = useStudyStore();
    const [content, setContent] = useState("");

    // Close on Escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isMindDumpOpen) toggleMindDump();
        };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isMindDumpOpen, toggleMindDump]);

    if (!isMindDumpOpen) return null;

    const handleSaveAsTask = () => {
        if (!content.trim()) return;
        // Instantly save the thought as a medium-load task
        addTask({ title: "Mind Dump: Review", description: content, load: 'medium' });
        setContent("");
        toggleMindDump();
    };

    const handleSaveAsShard = () => {
        if (!content.trim()) return;
        // Instantly forge the thought into the database for Chum to read
        forgeShard({ title: "Mind Dump Shard", content: content, files: [] });
        setContent("");
        toggleMindDump();
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: 50, scale: 0.95 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: 50, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="fixed top-24 right-8 z-[100001] w-80 sm:w-96 bg-[var(--bg-card)]/90 backdrop-blur-xl border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden flex flex-col"
            >
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-[var(--border-color)] bg-[var(--bg-sidebar)]/50">
                    <div className="flex items-center gap-2 text-[var(--text-main)]">
                        <Edit3 size={16} className="text-[var(--accent-teal)]" />
                        <span className="font-bold text-sm tracking-wide">Mind-dump</span>
                    </div>
                    <button
                        onClick={toggleMindDump}
                        className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors p-1 rounded-md hover:bg-[var(--bg-dark)]"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Editor */}
                <div className="p-4 flex-1">
                    <textarea
                        autoFocus
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Get it out of your head..."
                        className="w-full h-48 bg-transparent text-[var(--text-main)] text-sm resize-none outline-none custom-scrollbar placeholder:text-[var(--text-muted)]/50 leading-relaxed"
                    />
                </div>

                {/* Action Bar */}
                <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-sidebar)]/50 flex gap-2">
                    <button
                        onClick={handleSaveAsTask}
                        disabled={!content.trim()}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)] hover:border-[var(--accent-teal)] text-xs font-bold transition-all disabled:opacity-50"
                    >
                        <CheckSquare size={14} /> To Task
                    </button>
                    <button
                        onClick={handleSaveAsShard}
                        disabled={!content.trim()}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-[var(--accent-yellow)]/10 border border-[var(--accent-yellow)]/30 text-[var(--accent-yellow)] hover:bg-[var(--accent-yellow)] hover:text-[#0b1211] text-xs font-bold transition-all disabled:opacity-50"
                    >
                        <Hammer size={14} /> To Shard
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}