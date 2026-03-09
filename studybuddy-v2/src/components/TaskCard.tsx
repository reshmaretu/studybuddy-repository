"use client";

import { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { Task, TaskLoad, useStudyStore } from "@/store/useStudyStore";
import { MoreHorizontal, Pin, Clock, Edit2, Trash2, X, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TaskCard({ task, isOverlay = false }: { task: Task, isOverlay?: boolean }) {
    const { openFocusModal, deleteTask, updateTask } = useStudyStore();

    // UI States
    const [showMenu, setShowMenu] = useState(false);
    const [isEditing, setIsEditing] = useState(false);

    // Edit States
    const [editTitle, setEditTitle] = useState(task.title);
    const [editLoad, setEditLoad] = useState<TaskLoad>(task.load);
    const [editDeadline, setEditDeadline] = useState(task.deadline || "");

    // Only allow dragging if we are NOT editing
    const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
        id: task.id,
        data: { task },
        disabled: isEditing || showMenu // Disable drag when interacting with menus/inputs
    });

    const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

    const loadColors = {
        light: "text-[var(--accent-teal)] border-[var(--accent-teal)]/30 bg-[var(--accent-teal)]/10",
        medium: "text-[var(--accent-yellow)] border-[var(--accent-yellow)]/30 bg-[var(--accent-yellow)]/10",
        heavy: "text-red-400 border-red-400/30 bg-red-400/10"
    };

    const handleDelete = () => {
        if (window.confirm(`Are you sure you want to delete "${task.title}"?`)) {
            deleteTask(task.id);
        }
        setShowMenu(false);
    };

    const handleSaveEdit = () => {
        if (!editTitle.trim()) return;
        updateTask(task.id, {
            title: editTitle,
            load: editLoad,
            deadline: editDeadline || undefined
        });
        setIsEditing(false);
        setShowMenu(false);
    };

    const handleOpenFocus = (e: React.MouseEvent) => {
        e.stopPropagation(); // Stop drag event
        openFocusModal(task.id); // Assuming your store handles passing the task to the modal
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...(isEditing || showMenu ? {} : listeners)}
            {...(isEditing || showMenu ? {} : attributes)}
            className={`group relative h-fit bg-[var(--bg-card)] border rounded-2xl p-4 flex flex-col gap-3 transition-all duration-200 
                ${isOverlay ? 'scale-105 shadow-2xl border-[var(--accent-teal)] z-50 opacity-90' : 'border-[var(--border-color)] hover:border-[var(--accent-teal)]/50 shadow-sm hover:shadow-md'}
                ${isDragging ? 'opacity-40' : 'opacity-100'}
            `}
        >
            {/* --- TOP ROW: Badge & Menu --- */}
            <div className="flex justify-between items-start">
                {isEditing ? (
                    <div className="flex gap-1 w-full mr-4">
                        {(['light', 'medium', 'heavy'] as const).map(l => (
                            <button
                                key={l} onClick={() => setEditLoad(l)}
                                className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${editLoad === l ? loadColors[l] : 'text-[var(--text-muted)] border-[var(--border-color)]'}`}
                            >
                                {l}
                            </button>
                        ))}
                    </div>
                ) : (
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full border ${loadColors[task.load]}`}>
                        {task.load}
                    </span>
                )}

                {/* The 3-Dot Menu Button */}
                <div className="relative">
                    <button
                        onPointerDown={(e) => e.stopPropagation()} // Stop dragging!
                        onClick={() => setShowMenu(!showMenu)}
                        className="text-[var(--text-muted)] hover:text-[var(--text-main)] p-1 rounded-md transition-colors"
                    >
                        <MoreHorizontal size={16} />
                    </button>

                    {/* The Dropdown Menu */}
                    <AnimatePresence>
                        {showMenu && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="absolute right-0 top-6 w-32 bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-xl shadow-xl overflow-hidden z-[100] origin-top-right"
                            >
                                <button
                                    onClick={() => { setIsEditing(true); setShowMenu(false); }}
                                    className="w-full px-3 py-2 text-xs font-bold text-[var(--text-main)] hover:bg-[var(--bg-dark)] flex items-center gap-2 transition-colors border-b border-[var(--border-color)]"
                                >
                                    <Edit2 size={12} className="text-[var(--accent-teal)]" /> Edit Quest
                                </button>
                                <button
                                    onClick={handleDelete}
                                    className="w-full px-3 py-2 text-xs font-bold text-red-400 hover:bg-red-400/10 flex items-center gap-2 transition-colors"
                                >
                                    <Trash2 size={12} /> Delete
                                </button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* --- MIDDLE ROW: Title & Edit Inputs --- */}
            {isEditing ? (
                <div className="flex flex-col gap-2" onPointerDown={(e) => e.stopPropagation()}>
                    <input
                        autoFocus
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)]"
                    />
                    <input
                        type="datetime-local"
                        value={editDeadline}
                        onChange={(e) => setEditDeadline(e.target.value)}
                        className="bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-lg px-2 py-1 text-xs text-[var(--text-muted)] outline-none focus:border-[var(--accent-teal)]"
                    />
                    <div className="flex justify-end gap-2 mt-1">
                        <button onClick={() => setIsEditing(false)} className="p-1.5 text-[var(--text-muted)] hover:text-red-400 bg-[var(--bg-dark)] rounded-md border border-[var(--border-color)]"><X size={14} /></button>
                        <button onClick={handleSaveEdit} className="p-1.5 text-[#0b1211] bg-[var(--accent-teal)] rounded-md border border-[var(--accent-teal)] hover:brightness-110"><Check size={14} /></button>
                    </div>
                </div>
            ) : (
                <h3 className="text-base font-bold text-[var(--text-main)] leading-tight">
                    {task.title}
                </h3>
            )}

            {/* --- BOTTOM ROW: Deadline & Focus Button --- */}
            {!isEditing && (
                <div className="flex justify-between items-end mt-2">
                    {task.deadline ? (
                        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[var(--accent-teal)]">
                            <Clock size={12} />
                            <span>Best Before: {new Date(task.deadline).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                        </div>
                    ) : (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-muted)]">Unscheduled</span>
                    )}

                    {/* 👇 THE FIX: group-hover:opacity-100 makes it appear on card hover! */}
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={handleOpenFocus}
                        className="opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-[var(--bg-dark)] border border-[var(--border-color)] hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)] text-[var(--text-main)] px-2 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm absolute bottom-4 right-4"
                    >
                        <Pin size={12} /> Focus
                    </button>
                </div>
            )}
        </div>
    );
}