"use client";

import { useState, useEffect } from "react";
import { useStudyStore, TaskLoad, Task } from "@/store/useStudyStore";
import { Plus, Search, Sprout, CheckCircle2, Trash2, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, DragEndEvent, DragStartEvent, useDroppable, DragOverlay } from "@dnd-kit/core";
import { toast } from "sonner";
import TaskCard from "@/components/TaskCard";
import MorningPlanningModal from "@/components/MorningPlanningModal";
import UnDoneModal from "@/components/UnDoneModal";

function DropZoneContainer({ id, title, subtitle, children, isEmpty, emptyText }: any) {
    const { isOver, setNodeRef } = useDroppable({ id });

    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 flex flex-col h-full min-h-[500px]">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-[var(--text-main)]">{title}</h2>
                <span className="text-xs font-medium text-[var(--text-muted)]">{subtitle}</span>
            </div>

            <div
                ref={setNodeRef}
                className={`flex-1 rounded-xl p-4 transition-all duration-300 flex flex-col gap-3 ${isOver ? "bg-[var(--accent-teal)]/5 border-2 border-dashed border-[var(--accent-teal)]" : "border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-dark)]"
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
    const { tasks, addTask, completeTask, deleteTask, activeFramework, lastPlannedDate, isInitialized } = useStudyStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
    const [showMorningModal, setShowMorningModal] = useState(false);
    const [showUnDoneModal, setShowUnDoneModal] = useState(false);

    // 4:00 AM Reset Logic
    useEffect(() => {
        if (!isInitialized) return;
        
        const now = new Date();
        const today4AM = new Date();
        today4AM.setHours(4, 0, 0, 0);

        if (now.getHours() < 4) {
            today4AM.setDate(today4AM.getDate() - 1);
        }

        const needsPlanning = !lastPlannedDate || new Date(lastPlannedDate) < today4AM;
        if (needsPlanning) setShowMorningModal(true);
        else setShowMorningModal(false);
    }, [isInitialized, lastPlannedDate]);

    // 9:00 PM Nudge
    useEffect(() => {
        const checkTime = setInterval(() => {
            const now = new Date();
            if (now.getHours() === 21 && now.getMinutes() === 0) {
                 toast('🌙 Hey Chum, it\'s 9 PM. Time to Wrap Up the day?', { duration: 10000 });
            }
        }, 60000); 
        return () => clearInterval(checkTime);
    }, []);

    // Form States
    const [newTask, setNewTask] = useState({ title: "", description: "", load: "medium" as TaskLoad, deadline: "" });
    const [isScheduled, setIsScheduled] = useState(false); // 👈 New Toggle State

    const validTasks = tasks.filter(t => t && t.id);
    const filteredTasks = validTasks.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeQuests = filteredTasks.filter(t => !t.isCompleted);
    const archivedQuests = filteredTasks.filter(t => t.isCompleted);

    // 👈 The Timezone Magic Function
    const handleToggleSchedule = (checked: boolean) => {
        setIsScheduled(checked);
        if (checked && !newTask.deadline) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            setNewTask({ ...newTask, deadline: now.toISOString().slice(0, 16) });
        } else if (!checked) {
            setNewTask({ ...newTask, deadline: "" });
        }
    };

    const handlePlantQuest = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTask.title.trim()) return;

        // If it's scheduled, pass the date. If not, pass undefined.
        addTask({ ...newTask, deadline: isScheduled ? newTask.deadline : undefined });
        setIsAdding(false);
        setNewTask({ title: "", description: "", load: "medium", deadline: "" });
        setIsScheduled(false); // Reset toggle
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
            <div className="max-w-[1200px] mx-auto pb-12 space-y-8 relative">

                <AnimatePresence>
                    {showMorningModal && <MorningPlanningModal />}
                    {showUnDoneModal && <UnDoneModal onClose={() => setShowUnDoneModal(false)} />}
                </AnimatePresence>

                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-[var(--text-main)] flex items-center gap-3">
                            <Sprout className="text-[var(--accent-teal)]" size={32} /> Crystal Garden
                        </h1>
                        <p className="text-[var(--text-muted)] mt-1">Cultivate and manage your active quests.</p>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                        <div className="relative flex-1 md:w-48 flex-shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                            <input
                                type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] transition-colors"
                            />
                        </div>
                        {activeFramework && (
                            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] px-4 py-2 rounded-xl text-sm font-bold text-[var(--accent-teal)] flex flex-shrink-0 items-center justify-center whitespace-nowrap hidden sm:flex">
                                Active: {activeFramework === 'eisenhower' ? 'Eisenhower' : activeFramework === '1-3-5' ? '1-3-5 Rule' : 'Ivy Lee'} ▾
                            </div>
                        )}
                        <button onClick={() => setShowUnDoneModal(true)} className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] px-4 py-2 rounded-xl text-sm font-bold text-[var(--text-main)] hover:text-[var(--accent-teal)] hover:border-[var(--accent-teal)] transition-colors flex items-center justify-center whitespace-nowrap gap-2 flex-shrink-0">
                             <Moon size={16}/> Wrap Up
                        </button>
                        <button onClick={() => setIsAdding(!isAdding)} className="bg-[var(--accent-teal)] text-[#0b1211] px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:brightness-110 shadow-[0_0_10px_rgba(20,184,166,0.2)] flex-shrink-0">
                            <Plus size={16} /> Plant Quest
                        </button>
                    </div>
                </header>

                <AnimatePresence>
                    {isAdding && (
                        <motion.form
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                            onSubmit={handlePlantQuest} className="bg-[var(--bg-card)] border-2 border-[var(--accent-teal)]/30 rounded-2xl p-6 shadow-lg overflow-hidden"
                        >
                            <h3 className="text-lg font-bold text-[var(--text-main)] mb-4">Seed a New Quest</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="space-y-4">
                                    <input autoFocus type="text" required placeholder="Quest Title" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)]" />
                                    <textarea placeholder="Description..." rows={3} value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] resize-none" />
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl p-3">
                                        <label className="text-xs font-bold text-[var(--text-muted)] uppercase mb-2 block">Cognitive Load</label>
                                        <div className="flex gap-2">
                                            {['light', 'medium', 'heavy'].map((weight) => (
                                                <button key={weight} type="button" onClick={() => setNewTask({ ...newTask, load: weight as TaskLoad })} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border transition-colors ${newTask.load === weight ? 'bg-[var(--accent-teal)]/20 border-[var(--accent-teal)] text-[var(--accent-teal)]' : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}>{weight}</button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* 👇 UPDATED DEADLINE UI 👇 */}
                                    <div className="bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl p-3 flex flex-col gap-2 transition-all">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-[var(--text-muted)] uppercase block">Best Before (Deadline)</label>

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
                                                <motion.input
                                                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                    type="datetime-local" required value={newTask.deadline} onChange={e => setNewTask({ ...newTask, deadline: e.target.value })}
                                                    className="w-full bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] mt-1"
                                                />
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    {/* 👆 END DEADLINE UI 👆 */}

                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">Cancel</button>
                                <button type="submit" className="bg-[var(--accent-teal)] text-[#0b1211] px-6 py-2 rounded-xl text-sm font-bold hover:bg-teal-400 transition-colors disabled:opacity-50" disabled={!newTask.title.trim()}>Plant Seed</button>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>

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
                                        <p className="text-xs text-[var(--text-muted)] mt-0.5">
                                            {task.deadline ? new Date(task.deadline).toLocaleString() : "Unscheduled"}
                                        </p>
                                    </div>
                                </div>
                                <button onClick={() => deleteTask(task.id)} className="text-[var(--text-muted)] hover:text-red-400 p-2 transition-colors"><Trash2 size={16} /></button>
                            </div>
                        ))}
                    </DropZoneContainer>

                </div>

                <DragOverlay dropAnimation={null}>
                    {activeDragTask ? <TaskCard task={activeDragTask} isOverlay /> : null}
                </DragOverlay>

            </div>
        </DndContext>
    );
}