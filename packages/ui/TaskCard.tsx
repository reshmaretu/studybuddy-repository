"use client";

import React, { useState } from "react";
import { useDraggable } from "@dnd-kit/core";
import { useStudyStore, Task } from "@studybuddy/api";
import { MoreHorizontal, Pin, Clock, Edit2, Trash2, X, Check, Zap, Lock, Eye, AlertTriangle } from "lucide-react";
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

    const [showMenu, setShowMenu] = useState(false);
    const [showFrogReaction, setShowFrogReaction] = useState(false);
    const [showFrogHover, setShowFrogHover] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

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
                    className="absolute right-0 top-8 w-36 bg-(--bg-sidebar) border border-(--border-color) rounded-xl shadow-xl z-[100] origin-top-right"
                >
                    {!task.isCompleted && (
                        <button onClick={() => { completeTask(task.id); setShowMenu(false); }} className="w-full px-3 py-2 text-xs font-bold text-(--text-main) hover:bg-(--accent-teal)/10 flex items-center gap-2 border-b border-(--border-color)">
                            <Check size={12} className="text-(--accent-teal)" /> Finish Quest
                        </button>
                    )}
                    <button onClick={() => { openViewModal(task.id); setShowMenu(false); }} className="w-full px-3 py-2 text-xs font-bold hover:bg-(--bg-dark) flex items-center gap-2 border-b border-(--border-color)">
                        <Eye size={12} className="text-(--accent-teal)" /> Details
                    </button>
                    <button onClick={() => { openEditModal(task.id); setShowMenu(false); }} className="w-full px-3 py-2 text-xs font-bold hover:bg-(--bg-dark) flex items-center gap-2 border-b border-(--border-color)">
                        <Edit2 size={12} className="text-(--accent-teal)" /> Edit
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
            className={`group relative bg-(--bg-card) border-2 rounded-2xl p-4 transition-all duration-300 ${isDragging ? 'opacity-40' : 'opacity-100'} ${isOverlay ? 'shadow-2xl border-(--accent-teal)' : 'border-(--border-color)'}`}
        >
            <div className="flex justify-between items-start mb-2">
                <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full border ${loadColors[task.load]}`}>{task.load}</span>
                <button onClick={() => setShowMenu(!showMenu)} className="text-(--text-muted) hover:text-(--text-main)"><MoreHorizontal size={16} /></button>
                {ActionMenu}
            </div>
            <h3 className={`text-base font-bold mb-1 ${task.isCompleted ? 'text-(--text-muted) line-through' : ''}`}>{task.title}</h3>
            {task.description && <p className="text-xs text-(--text-muted) line-clamp-2">{task.description}</p>}
        </div>
    );
};
