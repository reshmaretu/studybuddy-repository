"use client";

import { useState } from "react";
import { useStudyStore, TaskLoad, Task } from "@/store/useStudyStore";
import { Plus, Search, Sprout, CheckCircle2, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, DragEndEvent, DragStartEvent, useDroppable, DragOverlay } from "@dnd-kit/core";
import TaskCard from "@/components/TaskCard";

function DropZoneContainer({ id, title, subtitle, children, isEmpty, emptyText }: any) {
    const { isOver, setNodeRef } = useDroppable({ id });

    return (
        <div className="bg-[#1a1c23] border border-[var(--border-color)] rounded-2xl p-6 flex flex-col h-full min-h-[500px]">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-[var(--text-main)]">{title}</h2>
                <span className="text-xs font-medium text-[var(--text-muted)]">{subtitle}</span>
            </div>

            <div
                ref={setNodeRef}
                className={`flex-1 rounded-xl p-4 transition-all duration-300 flex flex-col gap-3 ${isOver ? "bg-[var(--accent-teal)]/5 border-2 border-dashed border-[var(--accent-teal)]" : "border-2 border-dashed border-[var(--border-color)] bg-[#14161b]"
                    }`}
            >
                {isEmpty ? (
                    <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm font-medium">
                        {emptyText}
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
}

export default function CrystalGarden() {
    const { tasks, addTask, completeTask, deleteTask } = useStudyStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);

    // New Form with Real Date
    const [newTask, setNewTask] = useState({
        title: "",
        description: "",
        load: "medium" as TaskLoad,
        deadline: "",
    });

    const validTasks = tasks.filter(t => t && t.id);
    const filteredTasks = validTasks.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeQuests = filteredTasks.filter(t => !t.isCompleted);
    const archivedQuests = filteredTasks.filter(t => t.isCompleted);

    const handlePlantQuest = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.title.trim()) return;

        // Fallback if they leave date empty
        const finalDate = newTask.deadline || new Date().toISOString().slice(0, 16);

        addTask({ ...newTask, deadline: finalDate });
        setIsAdding(false);
        setNewTask({ title: "", description: "", load: "medium", deadline: "" });
    };

    const handleDragStart = (event: DragStartEvent) => {
        const task = tasks.find(t => t.id === event.active.id);
        setActiveDragTask(task || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragTask(null);
        const { active, over } = event;
        if (over && over.id === "hall-of-mastery") {
            completeTask(active.id as string);
        }
    };

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="max-w-[1200px] mx-auto pb-12 space-y-8">

                {/* HEADER */}
                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--text-main)] flex items-center gap-3">
                            <Sprout className="text-[var(--accent-teal)]" size={32} /> Crystal Garden
                        </h1>
                        <p className="text-[var(--text-muted)] mt-1">Cultivate and manage your active quests.</p>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto">
                        <div className="relative flex-1 md:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                            <input
                                type="text" placeholder="Search quests..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] transition-colors"
                            />
                        </div>
                        <button onClick={() => setIsAdding(!isAdding)} className="bg-[var(--accent-teal)] text-[#0b1211] px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:brightness-110 shadow-[0_0_10px_rgba(20,184,166,0.2)]">
                            <Plus size={16} /> Plant Quest
                        </button>
                    </div>
                </header>

                {/* ADD QUEST FORM (Updated for Datetime-Local) */}
                <AnimatePresence>
                    {isAdding && (
                        <motion.form
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                            onSubmit={handlePlantQuest} className="bg-[var(--bg-card)] border-2 border-[var(--accent-teal)]/30 rounded-2xl p-6 shadow-lg overflow-hidden"
                        >
                            <h3 className="text-lg font-bold text-[var(--text-main)] mb-4">Seed a New Quest</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="space-y-4">
                                    <input type="text" required placeholder="Quest Title" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)]" />
                                    <textarea placeholder="Description..." rows={3} value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] resize-none" />
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl p-3">
                                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2 block">Cognitive Load</label>
                                        <div className="flex gap-2">
                                            {['light', 'medium', 'heavy'].map((weight) => (
                                                <button key={weight} type="button" onClick={() => setNewTask({ ...newTask, load: weight as TaskLoad })} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border ${newTask.load === weight ? 'bg-[var(--accent-teal)]/20 border-[var(--accent-teal)] text-[var(--accent-teal)]' : 'border-[var(--border-color)] text-[var(--text-muted)]'}`}>{weight}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl p-3">
                                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2 block">Best Before (Deadline)</label>
                                        {/* The new native date/time picker! */}
                                        <input type="datetime-local" required value={newTask.deadline} onChange={e => setNewTask({ ...newTask, deadline: e.target.value })} className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)]" />
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-2 border-t border-[var(--border-color)]">
                                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-[var(--text-muted)]">Cancel</button>
                                <button type="submit" className="bg-[var(--accent-teal)] text-[#0b1211] px-6 py-2 rounded-xl text-sm font-bold">Plant Seed</button>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>

                {/* 2-COLUMN LAYOUT (Redesigned) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    <DropZoneContainer id="current-focus" title="Current Focus" subtitle="Drag to complete" isEmpty={activeQuests.length === 0} emptyText="No active quests yet">
                        {activeQuests.map(task => <TaskCard key={task.id} task={task} />)}
                    </DropZoneContainer>

                    <DropZoneContainer id="hall-of-mastery" title="The Hall of Mastery" subtitle="Completed quests" isEmpty={archivedQuests.length === 0} emptyText="No completed quests yet">
                        {archivedQuests.map(task => (
                            <div key={task.id} className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-xl p-4 flex justify-between items-center opacity-70">
                                <div className="flex items-center gap-4">
                                    <CheckCircle2 size={24} className="text-[var(--accent-teal)] flex-shrink-0" />
                                    <div>
                                        <h4 className="text-[var(--text-main)] font-bold line-through">{task.title}</h4>
                                        <p className="text-xs text-[var(--text-muted)] mt-0.5">{new Date(task.deadline).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <button onClick={() => deleteTask(task.id)} className="text-[var(--text-muted)] hover:text-red-400 p-2"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </DropZoneContainer>

                </div>

                {/* Floating Overlay Visualizer */}
                <DragOverlay dropAnimation={null}>
                    {activeDragTask ? <TaskCard task={activeDragTask} isOverlay /> : null}
                </DragOverlay>

            </div>
        </DndContext>
    );
}