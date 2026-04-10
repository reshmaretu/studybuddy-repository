"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Task, useStudyStore } from "@/store/useStudyStore";
import { MoreHorizontal, Pin, Clock, Edit2, Trash2, X, Check, Zap, Lock, Eye, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TaskCardProps {
    task: Task;
    isOverlay?: boolean;
    locked?: boolean;
    isMinimized?: boolean;
}

export default function TaskCard({ task, isOverlay = false, locked = false, isMinimized = false }: TaskCardProps) {
    const { 
        openFocusModal, deleteTask, updateTask, tasks, triggerChumToast, 
        openEditModal, openViewModal, completeTask, doubleClickToComplete, dndEnabled 
    } = useStudyStore();

    const [showMenu, setShowMenu] = useState(false);
    const [showFrogReaction, setShowFrogReaction] = useState(false);
    const [showFrogHover, setShowFrogHover] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: { task },
        disabled: showMenu || locked || task.isCompleted || showDeleteModal || !dndEnabled
    });

    const handleDoubleClick = () => {
        if (doubleClickToComplete && !task.isCompleted && !locked) {
            completeTask(task.id);
            triggerChumToast("Quest completed via neural double-tap!", "success");
        }
    };

    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

    const loadColors = {
        light: "text-[var(--accent-teal)] border-[var(--accent-teal)]/30 bg-[var(--accent-teal)]/10",
        medium: "text-[var(--accent-yellow)] border-[var(--accent-yellow)]/30 bg-[var(--accent-yellow)]/10",
        heavy: "text-red-400 border-red-400/30 bg-red-400/10"
    };

    const handleFrogToggle = () => {
        if (task.isCompleted || locked) return;
        const currentFrog = tasks.find(t => t.isFrog && t.id !== task.id);
        const isUnmarking = task.isFrog;

        if (isUnmarking) {
            updateTask(task.id, { isFrog: false });
            triggerChumToast("You returned the frog to the pond. Let me know when you spot a new one!");
        } else {
            if (currentFrog) {
                updateTask(currentFrog.id, { isFrog: false });
                triggerChumToast("🐸 Target swapped! The old frog was returned to the pond.");
            } else {
                triggerChumToast("🐸 Frog identified! Crush this heavy quest first to build massive momentum.");
            }
            updateTask(task.id, { isFrog: true });
            setShowFrogReaction(true);
            setTimeout(() => setShowFrogReaction(false), 3000);
        }
        setShowMenu(false);
    };

    const ActionMenu = (
        <AnimatePresence>
            {showMenu && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-8 w-36 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-xl shadow-xl overflow-hidden z-[100] origin-top-right"
                >
                    <button onClick={() => { openViewModal(task.id); setShowMenu(false); }} className="w-full px-3 py-2 text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-dark)] flex items-center gap-2 transition-colors border-b border-[var(--border-color)]">
                        <Eye size={12} className="text-[var(--accent-teal)]" /> View Details
                    </button>
                    <button onClick={() => { openEditModal(task.id); setShowMenu(false); }} className="w-full px-3 py-2 text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-dark)] flex items-center gap-2 transition-colors border-b border-[var(--border-color)]">
                        <Edit2 size={12} className="text-[var(--accent-teal)]" /> Edit Task
                    </button>
                    <button onClick={handleFrogToggle} className={`w-full px-3 py-2 text-xs font-bold flex items-center gap-2 transition-colors border-b border-[var(--border-color)] ${task.isFrog ? 'text-[var(--accent-teal)] hover:bg-[var(--accent-teal)]/10' : 'text-[var(--text-muted)] hover:bg-[var(--bg-dark)]'}`}>
                        <Zap size={12} fill={task.isFrog ? "currentColor" : "none"} /> {task.isFrog ? 'Unmark Frog' : 'Eat the Frog'}
                    </button>
                    <button onClick={() => { setShowDeleteModal(true); setShowMenu(false); }} className="w-full px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-400/10 flex items-center gap-2 transition-colors">
                        <Trash2 size={12} /> Release
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <>
            {isMinimized ? (
                <div
                    onDoubleClick={handleDoubleClick}
                    ref={setNodeRef} style={style} {...(showMenu || locked || !dndEnabled ? {} : listeners)} {...(showMenu || locked || !dndEnabled ? {} : attributes)}
                    className={`group relative flex items-center justify-between p-3 sm:p-4 w-full transition-all duration-300 rounded-xl border-2
                        ${isOverlay ? 'scale-105 shadow-2xl border-[var(--accent-teal)] z-50 bg-[var(--bg-card)]' : 'bg-transparent border-transparent hover:bg-black/20 hover:border-[var(--border-color)]/50'}
                        ${isDragging ? 'opacity-40' : 'opacity-100'}
                        ${locked ? 'cursor-not-allowed grayscale opacity-50' : dndEnabled ? 'cursor-grab px-1' : 'cursor-default'}
                        ${task.isFrog && !task.isCompleted && !isOverlay ? 'bg-green-500/5' : ''}
                    `}
                >
                    <div className="flex items-center gap-3 min-w-0 flex-1 pr-4">
                        <span className={`shrink-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${loadColors[task.load]}`}>
                            {task.load}
                        </span>
                        <h3 className={`text-sm font-bold truncate ${task.isCompleted ? 'text-[var(--text-muted)] line-through' : 'text-[var(--text-main)]'}`}>
                            {task.title}
                        </h3>
                        {task.isFrog && !task.isCompleted && <span className="text-lg animate-bounce drop-shadow-md shrink-0">🐸</span>}
                    </div>

                    <div className="flex items-center gap-1 sm:gap-2 shrink-0">
                        {!locked && !showMenu && !task.isCompleted && (
                            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => openFocusModal(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg text-[var(--text-muted)] hover:text-[var(--accent-teal)] hover:bg-[var(--bg-dark)] border border-transparent hover:border-[var(--border-color)] flex items-center gap-1.5">
                                <Pin size={14} /> <span className="text-[10px] font-bold hidden sm:inline">Focus</span>
                            </button>
                        )}
                        <div className="relative z-30">
                            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setShowMenu(!showMenu)} disabled={locked} className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded-md transition-colors disabled:opacity-50">
                                <MoreHorizontal size={16} />
                            </button>
                            {ActionMenu}
                        </div>
                    </div>
                </div>
            ) : (
                <div
                    onDoubleClick={handleDoubleClick}
                    ref={setNodeRef} style={style} {...(showMenu || locked || !dndEnabled ? {} : listeners)} {...(showMenu || locked || !dndEnabled ? {} : attributes)}
                    className={`group relative h-fit bg-[var(--bg-card)] border-2 rounded-2xl p-4 flex flex-col gap-3 transition-all duration-300 
                        ${isOverlay ? 'scale-105 shadow-2xl border-[var(--accent-teal)] z-50 opacity-90' : 'hover:border-[var(--text-muted)] shadow-sm hover:shadow-md'}
                        ${isDragging ? 'opacity-40' : 'opacity-100'}
                        ${task.isCompleted ? 'grayscale-[0.5] opacity-70 border-[var(--border-color)]' : ''}
                        ${locked ? 'opacity-50 grayscale select-none cursor-not-allowed border-[var(--border-color)]' : dndEnabled ? 'cursor-grab' : 'cursor-default'}
                        ${task.isFrog && !task.isCompleted ? 'border-green-500 shadow-[0_0_25px_rgba(34,197,94,0.3)] z-10' : 'border-[var(--border-color)]'}
                    `}
                >
                    {locked && (
                        <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-dark)]/40 backdrop-blur-[1px] rounded-2xl z-20">
                            <Lock className="text-[var(--text-muted)] w-8 h-8 opacity-50" />
                        </div>
                    )}

                    {task.isFrog && !task.isCompleted && (
                        <div className="absolute -top-4 -right-4 z-50" onMouseEnter={() => setShowFrogHover(true)} onMouseLeave={() => setShowFrogHover(false)}>
                            <div className="bg-[#0b1211] border-2 border-green-500 rounded-full w-10 h-10 flex items-center justify-center shadow-[0_0_15px_rgba(34,197,94,0.5)] animate-bounce cursor-help">
                                <span className="text-xl">🐸</span>
                            </div>
                            <AnimatePresence>
                                {showFrogHover && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.5, y: 0, x: 20 }} animate={{ opacity: 1, scale: 1, y: 10, x: -10 }} exit={{ opacity: 0, scale: 0.8, y: 0, x: 10 }} transition={{ type: "spring", stiffness: 400, damping: 15 }}
                                        className="absolute top-full right-0 mt-2 bg-[var(--bg-card)]/95 backdrop-blur-xl border border-green-500/50 p-3 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex gap-3 min-w-[220px] pointer-events-none"
                                    >
                                        <div className="absolute top-[-6px] right-4 w-3 h-3 bg-[var(--bg-card)]/95 border-t border-l border-green-500/50 rotate-45" />
                                        <div className="w-6 h-6 rounded-full flex items-center justify-center border shrink-0 bg-[var(--accent-teal)]/10 border-[var(--accent-teal)]/30"><span className="text-xs">👻</span></div>
                                        <div>
                                            <p className="text-[9px] font-black uppercase tracking-wider text-[var(--accent-teal)] mb-0.5">Chum</p>
                                            <p className="text-[10px] font-bold text-[var(--text-main)]"><span className="text-green-400 block mb-1">Eat the Frog!</span>I'm your heaviest quest. Crush me first for massive momentum!</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}

                    <AnimatePresence>
                        {showFrogReaction && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.5, y: 0, x: 20 }} animate={{ opacity: 1, scale: 1, y: -55, x: 0 }} exit={{ opacity: 0, scale: 0.8, y: -70, x: -10 }}
                                className="absolute top-0 right-0 z-[100] bg-[var(--bg-card)]/95 backdrop-blur-xl border border-[var(--border-color)] p-3 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex gap-3 min-w-[200px]"
                            >
                                <div className="absolute bottom-[-6px] right-6 w-3 h-3 bg-[var(--bg-card)]/95 border-r border-b border-[var(--border-color)] rotate-45" />
                                <div className="w-6 h-6 rounded-full flex items-center justify-center border shrink-0 bg-[var(--accent-teal)]/10 border-[var(--accent-teal)]/30"><span className="text-xs">👻</span></div>
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-wider text-[var(--accent-teal)] mb-0.5">Chum</p>
                                    <p className="text-[10px] font-bold text-[var(--text-main)]">BIG FROG! LET'S GET IT! 🐸</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {task.isCompleted && (
                        <div className="absolute -top-2 -right-2 bg-green-500 text-white rounded-full p-1.5 shadow-lg z-10 border-2 border-[#0b1211]">
                            <Check size={14} strokeWidth={3} />
                        </div>
                    )}

                    <div className="flex justify-between items-start">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${loadColors[task.load]}`}>{task.load}</span>

                        <div className="relative z-30">
                            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => setShowMenu(!showMenu)} disabled={locked} className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded-md transition-colors disabled:opacity-50">
                                <MoreHorizontal size={16} />
                            </button>
                            {ActionMenu}
                        </div>
                    </div>

                    <div onClick={() => openViewModal(task.id)} className="cursor-pointer group/content">
                        <h3 className="text-base font-bold text-[var(--text-main)] leading-tight group-hover/content:text-[var(--accent-teal)] transition-colors">{task.title}</h3>
                        {task.description && <p className="text-xs text-[var(--text-muted)] line-clamp-2 mt-2">{task.description}</p>}
                    </div>

                    <div className="flex justify-between items-end mt-2">
                        {task.deadline ? (
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-teal)]">
                                <Clock size={12} /><span>Best Before: {new Date(task.deadline).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                            </div>
                        ) : (
                            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Unscheduled</span>
                        )}

                        {!locked && !showMenu && (
                            <button onPointerDown={(e) => e.stopPropagation()} onClick={() => openFocusModal(task.id)} className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-[var(--bg-dark)] border border-[var(--border-color)] hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)] text-[var(--text-main)] px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm absolute bottom-4 right-4 z-20">
                                <Pin size={12} /> Focus
                            </button>
                        )}
                    </div>
                </div>
            )}

            <AnimatePresence>
                {showDeleteModal && (
                    <div className="fixed inset-0 z-[100000] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowDeleteModal(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" />
                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-6 max-w-sm w-full relative z-10 shadow-2xl flex flex-col items-center text-center">
                            <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-4 text-red-400"><AlertTriangle size={24} /></div>
                            <h3 className="text-lg font-bold text-[var(--text-main)] mb-2">Release into Pond?</h3>
                            <p className="text-sm text-[var(--text-muted)] mb-6">Are you sure you want to release <span className="text-[var(--text-main)] font-bold">"{task.title}"</span>? It will float away forever.</p>
                            <div className="flex gap-3 w-full">
                                <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 rounded-xl bg-[var(--bg-dark)] border border-[var(--border-color)] text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">Cancel</button>
                                <button onClick={() => { deleteTask(task.id); setShowDeleteModal(false); }} className="flex-1 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30 text-sm font-bold text-red-400 hover:bg-red-500 hover:text-white transition-colors">Release</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </>
    );
}