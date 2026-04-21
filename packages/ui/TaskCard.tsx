"use client";

import React, { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useStudyStore, Task, useTerms } from "@studybuddy/api";
import { MoreHorizontal, Pin, Clock, Edit2, Trash2, X, Check, Zap, Lock, Eye, AlertTriangle, Flame } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface TaskCardProps {
    task: Task;
    isOverlay?: boolean;
    locked?: boolean;
    isMinimized?: boolean;
    onToggleSelect?: (id: string) => void;
    selected?: boolean;
}

export const TaskCard = ({ task, isOverlay = false, locked = false, isMinimized = false, onToggleSelect, selected = false }: TaskCardProps) => {
    const { 
        openFocusModal, deleteTask, updateTask, tasks, triggerChumToast, 
        openEditModal, openViewModal, completeTask, 
        doubleClickToComplete = true, dndEnabled = true 
    } = useStudyStore();
    const { terms } = useTerms();

    const [showMenu, setShowMenu] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // 🕒 3-PHASE DEADLINE ENFORCEMENT
    const dlStatus = React.useMemo(() => {
        const deadline = task.deadline;
        if (!deadline || task.isCompleted) return { phase: 1, label: "Neutral", color: "text-(--text-muted)", bg: "", border: "" };
        const now = new Date();
        const dl = new Date(deadline).getTime();
        const diffHours = (dl - now.getTime()) / (1000 * 60 * 60);

        if (diffHours < 0) return { phase: 3, label: "CRITICAL", color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500" };
        if (diffHours <= 2) return { phase: 3, label: "URGENT", color: "text-red-500 animate-pulse", bg: "bg-red-500/5", border: "border-red-500/50" };
        if (diffHours <= 12) return { phase: 2, label: "SOON", color: "text-orange-400", bg: "bg-orange-400/5", border: "border-orange-400/30" };
        return { phase: 1, label: "LATER", color: "text-teal-400", bg: "bg-teal-400/5", border: "border-teal-400/20" };
    }, [task.deadline, task.isCompleted]);

    const formatDeadline = React.useCallback((dl: string | undefined) => {
        if (!dl) return "";
        const d = new Date(dl);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }, []);

    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: { task },
        disabled: showMenu || locked || task.isCompleted || showDeleteModal || !dndEnabled,
    });

    const handleDoubleClick = () => {
        if (doubleClickToComplete && !task.isCompleted && !locked) {
            completeTask(task.id);
            triggerChumToast("Quest completed via neural double-tap!", "success");
        }
    };

    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;
    const loadColors = {
        light: "text-(--accent-teal) border-(--accent-teal)/30 bg-(--accent-teal)/10",
        medium: "text-(--accent-yellow) border-(--accent-yellow)/30 bg-(--accent-yellow)/10",
        heavy: "text-red-400 border-red-400/30 bg-red-400/10"
    };

    const ActionMenu = (
        <AnimatePresence>
            {showMenu && (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
                    className="absolute right-0 top-0 w-40 bg-(--bg-sidebar) border border-(--border-color) rounded-xl shadow-2xl z-[1001] origin-top-right backdrop-blur-xl"
                >
                    {!task.isCompleted && (
                        <button onClick={() => { completeTask(task.id); setShowMenu(false); }} className="w-full px-3 py-2 text-xs font-bold text-(--text-main) hover:bg-(--accent-teal)/10 flex items-center gap-2 border-b border-(--border-color)">
                            <Check size={12} className="text-(--accent-teal)" /> {terms.completed}
                        </button>
                    )}
                    <button onClick={() => { openViewModal(task.id); setShowMenu(false); }} className="w-full px-3 py-2 text-xs font-bold hover:bg-(--bg-dark) flex items-center gap-2 border-b border-(--border-color)">
                        <Eye size={12} className="text-(--accent-teal)" /> Details
                    </button>
                    <button onClick={() => { openEditModal(task.id); setShowMenu(false); }} className="w-full px-3 py-2 text-xs font-bold hover:bg-(--bg-dark) flex items-center gap-2 border-b border-(--border-color)">
                        <Edit2 size={12} className="text-(--accent-teal)" /> Edit Record
                    </button>
                    <button 
                        onClick={() => { 
                            updateTask(task.id, { isPinned: !task.isPinned }); 
                            setShowMenu(false); 
                        }} 
                        className={`w-full px-3 py-2 text-xs font-bold flex items-center gap-2 border-b border-(--border-color) ${task.isPinned ? 'text-teal-400 bg-teal-400/5' : 'hover:bg-(--bg-dark)'}`}
                    >
                        <Pin size={12} className={task.isPinned ? 'text-teal-400' : 'text-(--text-muted)'} /> 
                        {task.isPinned ? 'Unpin' : 'Pin to Top'}
                    </button>
                    <button 
                        onClick={() => { 
                            updateTask(task.id, { isFrog: !task.isFrog }); 
                            setShowMenu(false); 
                            triggerChumToast(task.isFrog ? "Frog released back into the wild." : "FROG CAPTURED. Tackle this first!", "info");
                        }} 
                        className={`w-full px-3 py-2 text-xs font-bold flex items-center gap-2 border-b border-(--border-color) ${task.isFrog ? 'text-orange-400 bg-orange-400/5' : 'hover:bg-(--bg-dark)'}`}
                    >
                        <Flame size={12} className={task.isFrog ? 'text-orange-400' : 'text-(--text-muted)'} /> 
                        {task.isFrog ? 'Unmark Frog' : 'Mark as Frog'}
                    </button>
                    <button onClick={() => { setShowDeleteModal(true); setShowMenu(false); }} className="w-full px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-400/10 flex items-center gap-2">
                        <Trash2 size={12} /> Release
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );

    return (
        <div 
            ref={setNodeRef} style={style} {...listeners} {...attributes}
            onDoubleClick={handleDoubleClick}
            className={`group relative bg-(--bg-card) border-2 rounded-2xl p-4 transition-all duration-500 z-10 hover:z-20 min-h-[140px] flex flex-col ${isDragging ? 'opacity-40' : 'opacity-100'} ${selected ? 'border-(--accent-teal) shadow-[0_0_18px_rgba(45,212,191,0.25)]' : ''} ${dlStatus.phase === 3 && !task.isCompleted ? 'ring-1 ring-red-500/20' : ''} ${isOverlay ? 'shadow-2xl border-(--accent-teal) z-[1000]' : dlStatus.border || 'border-(--border-color)'}`}
        >
            {/* ⚡ CLIPPING CONTAINER FOR BG EFFECTS */}
            <div className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none">
                {/* ⚡ PHASE OVERLAY (Subtle Glow) */}
                {!task.isCompleted && dlStatus.phase > 1 && (
                    <div className={`absolute -right-4 -top-4 w-12 h-12 rounded-full blur-2xl opacity-20 ${dlStatus.bg}`} />
                )}
            </div>

            <div className="flex justify-between items-start mb-2 relative z-30">
                <div className="flex gap-2 items-center">
                    <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-lg border tracking-tighter ${loadColors[task.load]}`}>{task.load}</span>
                    {task.isPinned && !task.isCompleted && <Pin size={10} className="text-teal-400" />}
                </div>
                <div className="flex items-center gap-2">
                    {task.isCompleted ? (
                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--accent-teal)]">MASTERED</span>
                    ) : dlStatus.phase > 1 && (
                        <span className={`text-[9px] font-black uppercase tracking-widest ${dlStatus.color}`}>{dlStatus.label}</span>
                    )}
                    {onToggleSelect && !isOverlay && !locked && !task.isCompleted && (
                        <button
                            type="button"
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleSelect(task.id);
                            }}
                            className={`w-6 h-6 rounded-md border flex items-center justify-center transition-all ${
                                selected
                                    ? 'bg-(--accent-teal) border-(--accent-teal) text-black'
                                    : 'bg-(--bg-dark) border-(--border-color) text-(--text-muted) hover:text-(--text-main)'
                            }`}
                            aria-label={selected ? "Deselect task" : "Select task"}
                        >
                            {selected ? <Check size={12} strokeWidth={3} /> : <span className="w-2 h-2 rounded-full bg-current opacity-60" />}
                        </button>
                    )}
                    <button id="task-card-menu-trigger" onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }} className="text-(--text-muted) hover:text-(--text-main) transition-colors relative z-40"><MoreHorizontal size={16} /></button>
                </div>
                <div className="absolute right-0 top-0">
                    {ActionMenu}
                </div>
            </div>

            <div className="relative z-10 flex-1">
                <h3 className={`text-[15px] font-bold leading-tight mb-1 transition-all ${task.isCompleted ? 'text-(--text-muted) line-through opacity-50' : 'text-(--text-main)'}`}>
                    {task.title}
                </h3>
                {task.description && !isMinimized && (
                    <p className="text-[11px] text-(--text-muted) line-clamp-2 leading-relaxed font-medium mb-3">
                        {task.description}
                    </p>
                )}

                <div className="flex justify-between items-center mt-auto pt-2 border-t border-(--border-color)/30">
                    <div className="flex items-center gap-4">
                        {task.deadline && !task.isCompleted && (
                            <div className={`flex items-center gap-1.5 ${dlStatus.color}`}>
                                {dlStatus.phase === 3 ? <AlertTriangle size={10} /> : <Clock size={10} />}
                                <span className="text-[9px] font-black tracking-widest uppercase">{formatDeadline(task.deadline)}</span>
                            </div>
                        )}
                        {task.isCompleted && task.completedAt && (
                            <div className="flex items-center gap-1.5 text-teal-500/60">
                                <Check size={10} />
                                <span className="text-[9px] font-black tracking-widest uppercase">Archived</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* FROG BADGE */}
            {task.isFrog && !task.isCompleted && (
                <motion.div 
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute bottom-2 right-2 bg-orange-400 text-black p-1.5 rounded-xl shadow-lg border-2 border-(--bg-card) flex items-center gap-1 group-hover:scale-110 transition-transform"
                >
                    <Flame size={12} className="fill-current" />
                    <span className="text-[8px] font-black uppercase">Frog</span>
                </motion.div>
            )}
        </div>
    );
};
