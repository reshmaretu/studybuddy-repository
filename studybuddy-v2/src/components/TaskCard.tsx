"use client";

import { useDraggable } from "@dnd-kit/core";
import { MoreHorizontal, Clock, Play } from "lucide-react"; // <-- Play imported here!
import { Task, useStudyStore } from "@/store/useStudyStore"; // <-- useStudyStore imported here!

interface TaskCardProps {
    task: Task;
    isOverlay?: boolean;
}

export default function TaskCard({ task, isOverlay }: TaskCardProps) {
    if (!task || !task.id) return null;

    const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
        id: task.id,
        data: task,
    });

    // Date Logic
    const now = new Date();
    const taskDate = task.deadline ? new Date(task.deadline) : null;
    const isOverdue = taskDate && taskDate < now;
    const formattedDate = taskDate
        ? taskDate.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
        : "No deadline";

    // Visuals
    const borderClass = isOverdue ? "border-red-500/30 hover:border-red-500/60" : "border-[var(--border-color)] hover:border-[var(--accent-teal)]/50";
    const textClass = isOverdue ? "text-red-400" : "text-[var(--accent-teal)]";

    let loadTag = "bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] border-[var(--accent-teal)]/20";
    if (task.load === "heavy") loadTag = "bg-red-500/10 text-red-400 border-red-500/20";
    if (task.load === "medium") loadTag = "bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] border-[var(--accent-yellow)]/20";

    // Leave a dashed outline when actively dragging
    if (isDragging && !isOverlay) {
        return (
            <div ref={setNodeRef} className="h-32 rounded-2xl border-[3px] border-dashed border-[var(--border-color)] bg-[var(--bg-dark)]/30 opacity-50" />
        );
    }

    return (
        <div
            ref={setNodeRef}
            {...listeners}
            {...attributes}
            className={`h-32 rounded-2xl p-4 flex flex-col justify-between bg-[var(--bg-sidebar)] border shadow-md relative transition-colors cursor-grab active:cursor-grabbing ${borderClass} ${isOverlay ? "scale-105 shadow-2xl rotate-2 z-50 ring-2 ring-[var(--accent-teal)]/50" : ""
                }`}
        >
            <div className="flex justify-between items-center mb-1">
                <span className={`px-2 py-0.5 rounded-md text-[9px] font-extrabold tracking-widest uppercase border ${loadTag}`}>
                    {task.load}
                </span>
                <button className="text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors" onPointerDown={(e) => e.stopPropagation()}>
                    <MoreHorizontal size={16} />
                </button>
            </div>

            <div className="flex-1 mt-1 overflow-hidden min-w-0">
                <h4 className="text-[var(--text-main)] font-bold text-sm leading-tight truncate">{task.title}</h4>
                <p className="text-[var(--text-muted)] text-[11px] mt-1 line-clamp-2 break-words">{task.description}</p>
            </div>
            <div className="flex justify-between items-center pt-2">
                <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide ${textClass}`}>
                    <Clock size={12} />
                    <span>{isOverdue ? "Slipped past" : `Best before: ${formattedDate}`}</span>
                </div>
                {!isOverlay && (
                    <button
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            useStudyStore.getState().openFocusModal(task.id);
                        }}
                        className="w-8 h-8 rounded-full bg-[var(--accent-teal)] text-[#0b1211] shadow-[0_0_10px_rgba(20,184,166,0.3)] flex items-center justify-center hover:scale-110 active:scale-95 transition-all opacity-0 group-hover:opacity-100"
                        title="Enter Focus"
                    >
                        <Play size={14} className="ml-0.5" fill="currentColor" />
                    </button>
                )}
            </div>
        </div>
    );
}