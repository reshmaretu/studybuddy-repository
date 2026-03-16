"use client";

import { useState, useEffect } from "react";
import { useStudyStore, TaskLoad, Task } from "@/store/useStudyStore";
import { Sprout, Plus, Search, Moon, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, DragEndEvent, DragStartEvent, useDroppable, DragOverlay } from "@dnd-kit/core";
import { toast } from "sonner";
import TaskCard from "@/components/TaskCard";
import MorningPlanningModal from "@/components/MorningPlanningModal";
import UnDoneModal from "@/components/UnDoneModal";

function DropZoneContainer({ id, title, subtitle, children, isEmpty, emptyText }: any) {
    const { isOver, setNodeRef } = useDroppable({ id });

    return (
        <div className="bg-(--bg-card) border border-(--border-color) rounded-2xl p-6 flex flex-col h-full min-h-[500px]">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-(--text-main)">{title}</h2>
                <span className="text-xs font-medium text-(--text-muted)">{subtitle}</span>
            </div>

            <div
                ref={setNodeRef}
                className={`flex-1 rounded-xl p-4 transition-all duration-300 flex flex-col gap-3 ${isOver ? "bg-(--accent-teal)/5 border-2 border-dashed border-(--accent-teal)" : "border-2 border-dashed border-(--border-color) bg-(--bg-dark)"
                    }`}
            >
                {isEmpty ? (
                    <div className="h-full flex items-center justify-center text-(--text-muted) text-sm font-medium">
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
    const { tasks, addTask, completeTask, updateTask, activeFramework, setActiveFramework, lastPlannedDate, isInitialized } = useStudyStore();
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
    const [isScheduled, setIsScheduled] = useState(false);

    const validTasks = tasks.filter(t => t && t.id);
    const filteredTasks = validTasks.filter(t =>
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeQuests = filteredTasks.filter(t => !t.isCompleted);
    const sortedQuests = [...activeQuests].sort((a, b) => (b.isFrog ? 1 : 0) - (a.isFrog ? 1 : 0));
    
    const archivedQuests = filteredTasks.filter(t => t.isCompleted);

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

        if (activeFramework === '1-3-5') {
            const heavyCount = activeQuests.filter(t => t.load === 'heavy').length;
            const mediumCount = activeQuests.filter(t => t.load === 'medium').length;
            const lightCount = activeQuests.filter(t => t.load === 'light').length;

            if (newTask.load === 'heavy' && heavyCount >= 1) {
                toast.warning("Chum says: Easy there! The 1-3-5 rule recommends only ONE heavy task per day. Focus on quality over quantity! 🐸");
            } else if (newTask.load === 'medium' && mediumCount >= 3) {
                toast.warning("Chum says: You're loading up! Usually we keep it to 3 medium tasks.");
            } else if (newTask.load === 'light' && lightCount >= 5) {
                toast.warning("Chum says: That's a lot of small plants! Try to stay under 5 light tasks.");
            }
        }

        addTask({ ...newTask, deadline: isScheduled ? newTask.deadline : undefined });
        setIsAdding(false);
        setNewTask({ title: "", description: "", load: "medium", deadline: "" });
        setIsScheduled(false);
    };

    const handleDragStart = (event: DragStartEvent) => {
        const task = tasks.find(t => t.id === event.active.id);
        setActiveDragTask(task || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragTask(null);
        const { active, over } = event;
        if (!over) return;

        if (over.id === "hall-of-mastery") {
            completeTask(active.id as string);
        } else if (over.id.toString().startsWith('quadrant-')) {
            const quadrant = parseInt(over.id.toString().split('-')[1]);
            updateTask(active.id as string, { eisenhowerQuadrant: quadrant });
        } else if (over.id === "seed-bank") {
            updateTask(active.id as string, { eisenhowerQuadrant: undefined });
        }
    };

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="max-w-[1200px] mx-auto pb-12 space-y-8 relative">

                <AnimatePresence>
                    {showMorningModal && <MorningPlanningModal />}
                    {showUnDoneModal && <UnDoneModal onClose={() => setShowUnDoneModal(false)} />}
                </AnimatePresence>

                {validTasks.length > 0 && (
                    <div className="bg-(--bg-card) border border-(--border-color) rounded-2xl p-6 shadow-sm flex items-center gap-6">
                        <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                            <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-[0_0_8px_rgba(20,184,166,0.3)]">
                                <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" className="fill-(--bg-sidebar) stroke-(--border-color) stroke-[2px]" />
                                <clipPath id="crystal-fill">
                                    <rect x="0" y={100 - (archivedQuests.length / validTasks.length) * 100} width="100" height="100" />
                                </clipPath>
                                <polygon points="50,5 90,30 90,70 50,95 10,70 10,30" className="fill-(--accent-teal) transition-all duration-700 ease-out" clipPath="url(#crystal-fill)" />
                                <polyline points="10,30 50,50 90,30" className="fill-none stroke-(--bg-dark) stroke-[2px] opacity-30" />
                                <polyline points="50,50 50,95" className="fill-none stroke-(--bg-dark) stroke-[2px] opacity-30" />
                            </svg>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-sm font-bold text-(--text-main) mb-2">Daily Synthesization</h3>
                            <div className="w-full h-2 bg-(--bg-sidebar) rounded-full overflow-hidden">
                                <motion.div 
                                    className="h-full bg-(--accent-teal)"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${(archivedQuests.length / validTasks.length) * 100}%` }}
                                    transition={{ duration: 0.5, ease: "easeOut" }}
                                />
                            </div>
                            <div className="flex justify-between items-center mt-2 text-xs font-medium text-(--text-muted)">
                                <span>{archivedQuests.length} Quests Mastered</span>
                                <span>{Math.round((archivedQuests.length / validTasks.length) * 100)}% Complete</span>
                            </div>
                        </div>
                    </div>
                )}

                <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-(--text-main) flex items-center gap-3">
                            <Sprout className="text-(--accent-teal)" size={32} /> Crystal Garden
                        </h1>
                        <p className="text-(--text-muted) mt-1">Cultivate and manage your active quests.</p>
                    </div>

                    <div className="flex gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 hide-scrollbar">
                        <div className="relative flex-1 md:w-48 flex-shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-(--text-muted)" size={16} />
                            <input
                                type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-(--bg-card) border border-(--border-color) rounded-xl pl-10 pr-4 py-2 text-sm text-(--text-main) outline-none focus:border-(--accent-teal) transition-colors"
                            />
                        </div>
                        {activeFramework && (
                            <div className="relative group">
                                <button className="h-full bg-(--bg-card) border border-(--border-color) px-4 py-2 rounded-xl text-sm font-bold text-(--accent-teal) flex items-center justify-center gap-2 hover:border-(--accent-teal) transition-colors whitespace-nowrap">
                                    {activeFramework === 'eisenhower' ? 'Eisenhower' : activeFramework === '1-3-5' ? '1-3-5 Rule' : 'Ivy Lee'} <ChevronDown size={14} />
                                </button>
                                
                                <div className="absolute top-12 right-0 w-48 bg-(--bg-card) border border-(--border-color) rounded-xl shadow-xl overflow-hidden opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-60">
                                    {(['eisenhower', '1-3-5', 'ivy'] as const).map(f => (
                                        <button
                                            key={f}
                                            onClick={() => setActiveFramework(f)}
                                            className={`w-full px-4 py-3 text-left text-xs font-bold transition-colors border-b last:border-0 border-(--border-color) hover:bg-(--bg-dark) ${activeFramework === f ? 'text-(--accent-teal)' : 'text-(--text-main)'}`}
                                        >
                                            {f === 'eisenhower' ? 'Eisenhower Matrix' : f === '1-3-5' ? '1-3-5 Method' : 'Ivy Lee Method'}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => setActiveFramework(null)}
                                        className="w-full px-4 py-3 text-left text-xs font-bold text-red-400 hover:bg-red-400/10 transition-colors"
                                    >
                                        Disable Framework
                                    </button>
                                </div>
                            </div>
                        )}
                        <button onClick={() => setShowUnDoneModal(true)} className="bg-(--bg-sidebar) border border-(--border-color) px-4 py-2 rounded-xl text-sm font-bold text-(--text-main) hover:text-(--accent-teal) hover:border-(--accent-teal) transition-colors flex items-center justify-center whitespace-nowrap gap-2 flex-shrink-0">
                             <Moon size={16}/> Wrap Up
                        </button>
                        <button onClick={() => setIsAdding(!isAdding)} className="bg-(--accent-teal) text-[#0b1211] px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:brightness-110 shadow-[0_0_10px_rgba(20,184,166,0.2)] flex-shrink-0">
                            <Plus size={16} /> Plant Quest
                        </button>
                    </div>
                </header>

                <AnimatePresence>
                    {isAdding && (
                        <motion.form
                            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                            onSubmit={handlePlantQuest} className="bg-(--bg-card) border-2 border-(--accent-teal)/30 rounded-2xl p-6 shadow-lg overflow-hidden"
                        >
                            <h3 className="text-lg font-bold text-(--text-main) mb-4">Seed a New Quest</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                <div className="space-y-4">
                                    <input autoFocus type="text" required placeholder="Quest Title" value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })} className="w-full bg-(--bg-dark) border border-(--border-color) rounded-xl px-4 py-3 text-sm text-(--text-main) outline-none focus:border-(--accent-teal)" />
                                    <textarea placeholder="Description..." rows={3} value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })} className="w-full bg-(--bg-dark) border border-(--border-color) rounded-xl px-4 py-3 text-sm text-(--text-main) outline-none focus:border-(--accent-teal) resize-none" />
                                </div>
                                <div className="space-y-4">
                                    <div className="bg-(--bg-dark) border border-(--border-color) rounded-xl p-3">
                                        <label className="text-xs font-bold text-(--text-muted) uppercase mb-2 block">Cognitive Load</label>
                                        <div className="flex gap-2">
                                            {['light', 'medium', 'heavy'].map((weight) => (
                                                <button key={weight} type="button" onClick={() => setNewTask({ ...newTask, load: weight as TaskLoad })} className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase border transition-colors ${newTask.load === weight ? 'bg-(--accent-teal)/20 border-(--accent-teal) text-(--accent-teal)' : 'border-(--border-color) text-(--text-muted) hover:text-(--text-main)'}`}>{weight}</button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="bg-(--bg-dark) border border-(--border-color) rounded-xl p-3 flex flex-col gap-2 transition-all">
                                        <div className="flex items-center justify-between">
                                            <label className="text-xs font-bold text-(--text-muted) uppercase block">Best Before (Deadline)</label>

                                            <div onClick={() => handleToggleSchedule(!isScheduled)} className="flex items-center gap-2 cursor-pointer group">
                                                <span className={`text-xs font-bold transition-colors ${isScheduled ? 'text-(--accent-teal)' : 'text-(--text-muted) group-hover:text-gray-400'}`}>
                                                    {isScheduled ? 'Scheduled' : 'Unscheduled'}
                                                </span>
                                                <div className={`w-8 h-4 rounded-full p-0.5 flex items-center transition-colors duration-300 ${isScheduled ? 'bg-(--accent-teal)' : 'bg-(--bg-sidebar) border border-(--border-color)'}`}>
                                                    <div className={`w-3 h-3 rounded-full shadow-sm transition-transform duration-300 ${isScheduled ? 'translate-x-4 bg-[#0b1211]' : 'translate-x-0 bg-(--text-muted)'}`} />
                                                </div>
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {isScheduled && (
                                                <motion.input
                                                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                                                    type="datetime-local" required value={newTask.deadline} onChange={e => setNewTask({ ...newTask, deadline: e.target.value })}
                                                    className="w-full bg-(--bg-sidebar) border border-(--border-color) rounded-lg px-3 py-2 text-sm text-(--text-main) outline-none focus:border-(--accent-teal) mt-1"
                                                />
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-(--border-color)">
                                <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-(--text-muted) hover:text-(--text-main) transition-colors">Cancel</button>
                                <button type="submit" className="bg-(--accent-teal) text-[#0b1211] px-6 py-2 rounded-xl text-sm font-bold hover:bg-teal-400 transition-colors disabled:opacity-50" disabled={!newTask.title.trim()}>Plant Seed</button>
                            </div>
                        </motion.form>
                    )}
                </AnimatePresence>

                <div className={`grid grid-cols-1 ${activeFramework === 'eisenhower' ? '' : 'lg:grid-cols-2'} gap-6`}>

                    <section className="col-span-1">
                        {activeFramework === 'eisenhower' ? (
                            <div className="space-y-6">
                                <DropZoneContainer id="seed-bank" title="Seed Bank" subtitle="Sort into quadrants" isEmpty={sortedQuests.filter(t => !t.eisenhowerQuadrant).length === 0} emptyText="All seeds sorted!">
                                    <div className="flex flex-wrap gap-3">
                                        {sortedQuests.filter(t => !t.eisenhowerQuadrant).map(task => <TaskCard key={task.id} task={task} />)}
                                    </div>
                                </DropZoneContainer>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {[1, 2, 3, 4].map(q => (
                                        <DropZoneContainer 
                                            key={q} id={`quadrant-${q}`} 
                                            title={q === 1 ? "Do First" : q === 2 ? "Schedule" : q === 3 ? "Delegate" : "Eliminate"} 
                                            subtitle={q === 1 ? "Urgent & Important" : q === 2 ? "Not Urgent, Important" : q === 3 ? "Urgent, Not Important" : "Neither"}
                                            isEmpty={sortedQuests.filter(t => t.eisenhowerQuadrant === q).length === 0} 
                                            emptyText="Nothing here yet"
                                        >
                                            {sortedQuests.filter(t => t.eisenhowerQuadrant === q).map(task => <TaskCard key={task.id} task={task} />)}
                                        </DropZoneContainer>
                                    ))}
                                </div>
                            </div>
                        ) : activeFramework === 'ivy' ? (
                            <DropZoneContainer id="current-focus" title="Ivy Lee List" subtitle="Top 6 Priorities" isEmpty={sortedQuests.length === 0} emptyText="No priorities set">
                                <div className="space-y-4">
                                    {sortedQuests.slice(0, 6).map((task, index) => {
                                        return (
                                            <div key={task.id} className="flex gap-4 items-start">
                                                <div className="w-8 h-8 rounded-full bg-(--accent-teal)/20 flex items-center justify-center font-bold text-(--accent-teal) shrink-0 mt-2">
                                                    {index + 1}
                                                </div>
                                                <TaskCard task={task} />
                                            </div>
                                        );
                                    })}
                                </div>
                            </DropZoneContainer>
                        ) : (
                            <DropZoneContainer id="current-focus" title="Current Focus" subtitle={activeFramework === '1-3-5' ? "1-3-5 Selection" : "Drag to complete"} isEmpty={sortedQuests.length === 0} emptyText="No active quests yet">
                                {sortedQuests.map(task => <TaskCard key={task.id} task={task} />)}
                            </DropZoneContainer>
                        )}
                    </section>

                    <section className={`${activeFramework === 'eisenhower' ? 'col-span-1' : ''}`}>
                        <DropZoneContainer id="hall-of-mastery" title="The Hall of Mastery" subtitle="Completed/Archived quests" isEmpty={archivedQuests.length === 0} emptyText="No completed quests yet">
                            <div className="space-y-4">
                                {archivedQuests.map(task => (
                                    <TaskCard key={task.id} task={{...task, isCompleted: true}} />
                                ))}
                            </div>
                        </DropZoneContainer>
                    </section>

                </div>

                <DragOverlay dropAnimation={null}>
                    {activeDragTask ? <TaskCard task={activeDragTask} isOverlay /> : null}
                </DragOverlay>

            </div>
        </DndContext>
    );
}