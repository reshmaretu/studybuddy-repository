"use client";

import { useState, useEffect } from "react";
import { useStudyStore, TaskLoad, Task } from "@/store/useStudyStore";
import { Sprout, Plus, Search, Moon, ChevronDown, X, Sparkles, Crosshair, Clock, BrainCircuit } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, DragEndEvent, DragStartEvent, useDroppable, DragOverlay } from "@dnd-kit/core";
import TaskCard from "@/components/TaskCard";
import MorningPlanningModal from "@/components/MorningPlanningModal";
import UnDoneModal from "@/components/UnDoneModal";
import GeodeScene from "@/components/GeodeScene";

function DropZoneContainer({ id, title, subtitle, children, isEmpty, emptyText }: any) {
    const { isOver, setNodeRef } = useDroppable({ id });
    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center mb-4 shrink-0">
                <h2 className="text-xl font-bold text-[var(--text-main)]">{title}</h2>
                <span className="text-xs font-medium text-[var(--text-muted)]">{subtitle}</span>
            </div>
            {/* ADDED INLINE STYLE TO FORCE SCROLLBAR REMOVAL IF CSS FAILS */}
            <div ref={setNodeRef} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} className={`flex-1 rounded-xl p-4 transition-all duration-300 flex flex-col gap-3 overflow-y-auto [&::-webkit-scrollbar]:hidden border-2 border-dashed ${isOver ? "bg-[var(--accent-teal)]/10 border-[var(--accent-teal)]" : "bg-[var(--bg-dark)] border-[var(--border-color)]/50"}`}>
                {isEmpty ? <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm font-medium">{emptyText}</div> : children}
            </div>
        </div>
    );
}

function MasteryContainer({ id, masteryTab, setMasteryTab, children, isEmpty, emptyText }: any) {
    const { isOver, setNodeRef } = useDroppable({ id });
    return (
        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 flex flex-col h-full overflow-hidden">
            {/* STYLING FIX: Added missing Header! */}
            <div className="flex justify-between items-center mb-4 shrink-0">
                <h2 className="text-xl font-bold text-[var(--text-main)]">The Hall of Mastery</h2>
                <span className="text-xs font-medium text-[var(--text-muted)]">Completed</span>
            </div>

            <div className="flex justify-between items-center mb-4 shrink-0 gap-4">
                <button onClick={() => setMasteryTab('tasks')} className={`flex-1 pb-2 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${masteryTab === 'tasks' ? 'border-[var(--text-main)] text-[var(--text-main)]' : 'border-transparent text-[var(--text-muted)] hover:text-white'}`}>Archived Quests</button>
                <button onClick={() => setMasteryTab('shards')} className={`flex-1 pb-2 text-xs font-black uppercase tracking-widest border-b-2 transition-colors ${masteryTab === 'shards' ? 'border-[var(--accent-teal)] text-[var(--accent-teal)]' : 'border-transparent text-[var(--text-muted)] hover:text-[var(--accent-teal)]'}`}>Mastered Shards</button>
            </div>
            {/* STYLING FIX: Invisible scrollbars applied */}
            <div ref={setNodeRef} className={`flex-1 rounded-xl p-4 transition-all duration-300 flex flex-col gap-3 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] border-2 border-dashed ${isOver ? "bg-[var(--accent-teal)]/10 border-[var(--accent-teal)]" : "bg-[var(--bg-dark)] border-[var(--border-color)]/50"}`}>
                {isEmpty ? <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm font-medium text-center px-4">{emptyText}</div> : children}
            </div>
        </div>
    );
}

function MasteredShardCard({ shard, onSnipe }: { shard: any, onSnipe: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.8, rotateX: -15 }}
            animate={{ opacity: 1, scale: 1, rotateX: 0 }}
            whileHover={{ scale: 1.05, y: -4, rotateY: 5 }}
            transition={{ type: "spring", stiffness: 300, damping: 15 }}
            // STYLING FIX: Removed overflow-hidden so shadows can bleed out
            className="relative p-5 rounded-2xl border border-[var(--accent-teal)]/40 bg-[#0b1211] group cursor-pointer shadow-[0_4px_20px_rgba(20,184,166,0.05)] hover:shadow-[0_0_30px_rgba(20,184,166,0.4)]"
            onClick={onSnipe}
        >
            {/* STYLING FIX: The sweeping animation is now safely contained in an absolute background layer */}
            <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none z-0">
                <div className="absolute inset-0 bg-gradient-to-br from-transparent to-[var(--accent-teal)]/10" />
                <motion.div
                    animate={{ x: ["-200%", "200%"] }}
                    transition={{ repeat: Infinity, duration: 2.5, ease: "linear", repeatDelay: 0.5 }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-[var(--accent-teal)]/20 to-transparent skew-x-12"
                />
            </div>

            <div className="relative z-10 flex items-center justify-between">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <Sparkles size={14} className="text-[var(--accent-teal)] animate-pulse" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-[var(--accent-teal)]">Ascended Knowledge</span>
                    </div>
                    <h4 className="text-sm font-bold text-white leading-tight pr-4">{shard.title}</h4>
                </div>

                {/* STYLING FIX: Clean icon button replaces the 100% circle and full overlay */}
                <button
                    onClick={(e) => { e.stopPropagation(); onSnipe(); }}
                    className="w-10 h-10 shrink-0 rounded-full bg-[var(--accent-teal)] text-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 hover:brightness-125 shadow-[0_0_15px_var(--accent-teal)]"
                    title="Snipe View"
                >
                    <Crosshair size={18} />
                </button>
            </div>
        </motion.div>
    );
}

// ==========================================
// 🎨 FRAMEWORK UI COMPONENTS
// ==========================================

function MatrixZone({ id, title, subtitle, tasks, color, bg, border, activeBorder }: any) {
    const { isOver, setNodeRef } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className={`flex flex-col rounded-2xl border-2 transition-all duration-300 ${isOver ? activeBorder + ' bg-black/40 ring-1 ring-current brightness-125 shadow-[inset_0_0_30px_rgba(255,255,255,0.05)] z-10' : border + ' ' + bg}`}>
            <div className={`p-2 sm:p-3 border-b ${border} bg-black/20 shrink-0 rounded-t-xl`}>
                <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wider ${color} flex items-center justify-between`}>
                    {title} <span className="text-[10px] bg-black/30 px-2 py-0.5 rounded-md">{tasks.length}</span>
                </h3>
                <p className="text-[8px] sm:text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-widest mt-0.5 hidden sm:block">{subtitle}</p>
            </div>
            <div style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="flex-1 p-2 sm:p-3 overflow-y-auto overflow-x-hidden space-y-2 [&::-webkit-scrollbar]:hidden rounded-b-xl pb-12">
                {tasks.map((task: any) => <TaskCard key={task.id} task={task} />)}
            </div>
        </div>
    );
}

function IvySlot({ rank, task, isLocked, isActive }: any) {
    const id = `ivy-${rank}`;
    const { isOver, setNodeRef } = useDroppable({ id, disabled: isLocked && !!task });
    return (
        <div ref={setNodeRef} className={`relative rounded-2xl border-2 transition-all duration-300 flex w-full h-auto min-h-[72px] ${
            // THE CLIPPING FIX: Removed 'ring-1' and replaced with safe 'shadow-[inset_...]'
            isOver ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]/10 brightness-125 shadow-[inset_0_0_30px_rgba(20,184,166,0.15)] z-10' :
                isActive ? 'border-[var(--accent-teal)]/50 bg-[var(--bg-card)] shadow-[0_0_20px_rgba(20,184,166,0.15)]' :
                    isLocked ? 'border-[var(--border-color)]/30 bg-[var(--bg-dark)]/50 grayscale opacity-50' :
                        'border-[var(--border-color)] bg-[var(--bg-card)] hover:border-[var(--text-muted)]'
            }`}>
            <div className={`w-12 sm:w-14 shrink-0 flex items-center justify-center font-black text-2xl border-r-2 border-inherit rounded-l-2xl transition-colors ${isActive ? 'text-[var(--accent-teal)]' : 'text-[var(--text-muted)]'}`}>
                {rank}
            </div>

            <div className="flex-1 min-w-0 flex flex-col justify-center">
                {/* THE MINIMIZED FIX: Passing the new prop to the TaskCard! */}
                {task ? (
                    <TaskCard task={task} locked={isLocked} isMinimized={true} />
                ) : (
                    <div className="px-4 py-2 text-xs font-bold text-[var(--text-muted)] italic">Awaiting Assignment...</div>
                )}
            </div>

            {isActive && !task && (
                <div className="absolute inset-0 rounded-2xl border-2 border-[var(--accent-teal)] animate-pulse pointer-events-none" />
            )}
        </div>
    );
}

function CapacityZone({ id, title, count, max, tasks, color, bg, border }: any) {
    const { isOver, setNodeRef } = useDroppable({ id });
    const isFull = count >= max;
    return (
        <div ref={setNodeRef} className={`flex flex-col rounded-2xl border-2 transition-all duration-300 ${isOver && !isFull ? `border-current ring-1 ring-current bg-black/40 brightness-125 shadow-[inset_0_0_30px_rgba(255,255,255,0.05)] z-10 ${color}` : isOver && isFull ? 'border-red-500 bg-red-500/10 z-10' : border + ' ' + bg}`}>
            <div className="p-3 sm:p-4 flex justify-between items-center shrink-0 border-b border-inherit bg-black/10 rounded-t-xl">
                <h3 className={`text-xs sm:text-sm font-black uppercase tracking-wider ${color}`}>{title}</h3>
                <div className={`text-xs font-black px-2 py-1 rounded-md transition-colors ${isFull ? 'bg-red-500/20 text-red-400 border border-red-500/50' : 'bg-black/30 text-[var(--text-muted)] border border-white/5'}`}>
                    {count} / {max}
                </div>
            </div>
            <div style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="flex-1 p-3 sm:p-4 overflow-y-auto overflow-x-hidden space-y-3 [&::-webkit-scrollbar]:hidden min-h-[100px] rounded-b-xl pb-16">
                {tasks.map((task: any) => <TaskCard key={task.id} task={task} />)}
            </div>
        </div>
    );
}

function UnsortedZone({ id, tasks, title = "Unsorted Quests" }: any) {
    const { isOver, setNodeRef } = useDroppable({ id });
    return (
        <div ref={setNodeRef} className={`h-full flex flex-col rounded-2xl border-2 border-dashed transition-all duration-300 ${isOver ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]/10 ring-1 ring-[var(--accent-teal)] brightness-125' : 'border-[var(--border-color)] bg-[var(--bg-dark)]'}`}>
            <div className="p-2 sm:p-3 border-b border-[var(--border-color)]/50 shrink-0 bg-black/20 rounded-t-xl">
                <h3 className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] flex justify-between items-center">
                    {title}
                    <span className="bg-black/40 px-2 py-0.5 rounded text-[9px]">{tasks.length}</span>
                </h3>
            </div>
            <div style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="flex-1 p-2 sm:p-3 overflow-y-auto overflow-x-hidden space-y-2 [&::-webkit-scrollbar]:hidden min-h-[100px] rounded-b-xl pb-12">
                {tasks.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-[10px] font-bold uppercase tracking-widest italic opacity-50">All Quests Assigned</div>
                ) : (
                    tasks.map((task: any) => <TaskCard key={task.id} task={task} />)
                )}
            </div>
        </div>
    );
}

function StandardZone({ id, tasks }: any) {
    const { isOver, setNodeRef } = useDroppable({ id });
    return (
        <div ref={setNodeRef} style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} className={`absolute inset-0 rounded-xl transition-all duration-300 flex flex-col gap-3 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden border-2 border-dashed p-1 pb-16 ${isOver ? "bg-[var(--accent-teal)]/10 border-[var(--accent-teal)] ring-1 ring-[var(--accent-teal)] brightness-110 z-10" : "border-transparent"}`}>
            {tasks.length === 0 ? (
                <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm font-medium">No active quests yet</div>
            ) : (
                tasks.map((task: any) => <TaskCard key={task.id} task={task} />)
            )}
        </div>
    );
}

export default function CrystalGarden() {
    const { isPremiumUser, tasks, shards, addTask, completeTask, updateTask, activeFramework, setActiveFramework, lastPlannedDate, isInitialized, triggerChumToast, openFocusModal } = useStudyStore();
    const [searchQuery, setSearchQuery] = useState("");
    const [isAdding, setIsAdding] = useState(false);
    const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);
    const [showMorningModal, setShowMorningModal] = useState(false);
    const [showUnDoneModal, setShowUnDoneModal] = useState(false);
    const [draggedToMasteryTask, setDraggedToMasteryTask] = useState<Task | null>(null); // <-- ADD THIS
    const [masteryTab, setMasteryTab] = useState<'tasks' | 'shards'>('tasks');
    const [draggedToGeodeTask, setDraggedToGeodeTask] = useState<Task | null>(null);
    const [snipingShard, setSnipingShard] = useState<any>(null);

    const validTasks = tasks.filter(t => t && t.id);
    const filteredTasks = validTasks.filter(t => t.title.toLowerCase().includes(searchQuery.toLowerCase()) || t.description?.toLowerCase().includes(searchQuery.toLowerCase()));

    // These are for the UI Columns (affected by search)
    const activeQuests = tasks.filter(t => t && !t.isCompleted);
    const sortedQuests = [...activeQuests].sort((a, b) => (b.isFrog ? 1 : 0) - (a.isFrog ? 1 : 0));
    const archivedQuests = filteredTasks.filter(t => t.isCompleted);
    const masteredShards = shards.filter(s => s.isMastered);

    // 🔥 THE FIX: Global stats for the 3D Crystal (ignores search)
    const globalArchivedQuests = validTasks.filter(t => t.isCompleted);
    const completionRatio = validTasks.length > 0 ? (globalArchivedQuests.length / validTasks.length) : 0;

    const [showFrameworkMenu, setShowFrameworkMenu] = useState(false);
    const [pendingFramework, setPendingFramework] = useState<string | null | undefined>(undefined);

    const [stressLevel, setStressLevel] = useState(50);
    const [actualPomos, setActualPomos] = useState(1);

    // Auto-fill actual pomodoros with their estimate when the modal opens
    useEffect(() => {
        if (draggedToMasteryTask) {
            setStressLevel(50);
            setActualPomos(draggedToMasteryTask.estimatedPomos || 1);
        }
    }, [draggedToMasteryTask]);

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

    // 9:00 PM Nudge Logic
    useEffect(() => {
        // 1. Fixed the TypeScript error for timeoutId
        let timeoutId: ReturnType<typeof setTimeout>;

        const scheduleNextNudge = () => {
            const now = new Date();
            const targetTime = new Date(now);

            // Set target to exactly 9:00:00.000 PM
            targetTime.setHours(21, 0, 0, 0);

            // If it is already past 9 PM today, schedule for 9 PM tomorrow
            if (now.getTime() >= targetTime.getTime()) {
                targetTime.setDate(targetTime.getDate() + 1);
            }

            const msUntil9PM = targetTime.getTime() - now.getTime();

            timeoutId = setTimeout(() => {
                // 2. Replaced the undefined `toast` with your native store action!
                triggerChumToast("🌙 Hey! It's 9 PM. Time to Wrap Up the day?");

                // Recursively call to schedule tomorrow's nudge
                scheduleNextNudge();
            }, msUntil9PM);
        };

        // Kick off the first schedule
        scheduleNextNudge();

        // Cleanup on unmount
        return () => clearTimeout(timeoutId);
    }, [triggerChumToast]);

    const [newTask, setNewTask] = useState<{ title: string, description: string, load: TaskLoad, deadline: string, estimatedPomos?: number }>({ title: "", description: "", load: "medium", deadline: "" });
    const [isScheduled, setIsScheduled] = useState(false);

    const handleDragStart = (event: DragStartEvent) => {
        const task = tasks.find(t => t.id === event.active.id);
        setActiveDragTask(task || null);
    };
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

        // Use the activeQuests defined in your component
        const heavyCount = activeQuests.filter(t => t.load === 'heavy').length;

        // 1. Burnout Hard Stop (Blocks execution)
        if (newTask.load === 'heavy' && heavyCount >= 2) {
            triggerChumToast(
                <span>
                    <strong className="text-red-400">Burnout Risk! ⚠️</strong><br />
                    You already have {heavyCount} Heavy tasks. Break this down to maintain focus.
                </span>,
                'warning'
            );
            return;
        }

        // 2. Framework Soft Limits (Informational only)
        if (activeFramework === '1-3-5') {
            const mediumCount = activeQuests.filter(t => t.load === 'medium').length;
            const lightCount = activeQuests.filter(t => t.load === 'light').length;

            if (newTask.load === 'medium' && mediumCount >= 3) {
                triggerChumToast("Framework Alert: You've reached the 3-medium task limit for 1-3-5.", 'normal');
            } else if (newTask.load === 'light' && lightCount >= 5) {
                triggerChumToast("Framework Alert: 5 light tasks is the recommended limit here.", 'normal');
            }
        }

        // 3. THE ADD ACTION
        // isCompleted is handled automatically by the store
        addTask({
            title: newTask.title,
            description: newTask.description,
            load: newTask.load,
            deadline: isScheduled ? newTask.deadline : undefined
        });

        // 4. SUCCESS FEEDBACK (One consolidated flashy toast)
        triggerChumToast(
            <span>
                <strong className="text-teal-400">Quest Planted! 🌱</strong>
                <br />"{newTask.title}" is now in your focus queue.
            </span>,
            'success'
        );

        // 5. FINAL STATE RESET
        setIsAdding(false);
        setIsScheduled(false);
        setNewTask({ title: "", description: "", load: "medium", deadline: "" });
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragTask(null);
        const { active, over } = event;
        if (!over) return;

        if (over.id === "geode-dropzone") {
            const task = tasks.find(t => t.id === active.id);
            if (task) setDraggedToGeodeTask(task);
        } else if (over.id === "hall-of-mastery") {
            const task = tasks.find(t => t.id === active.id);
            if (task) setDraggedToMasteryTask(task);
        } else if (over.id.toString().startsWith('quadrant-')) {
            const quadrant = parseInt(over.id.toString().split('-')[1]);
            updateTask(active.id as string, { eisenhowerQuadrant: quadrant });
        } else if (over.id.toString().startsWith('ivy-')) {
            const rank = parseInt(over.id.toString().split('-')[1]);
            // Advanced: If dragging to an occupied slot, swap them instantly!
            const existingTask = activeQuests.find(t => t.ivyRank === rank);
            if (existingTask && existingTask.id !== active.id) {
                const currentRank = tasks.find(t => t.id === active.id)?.ivyRank;
                updateTask(existingTask.id, { ivyRank: currentRank }); // Move old task to new task's old slot
            }
            updateTask(active.id as string, { ivyRank: rank });
        } else if (over.id.toString().startsWith('zone-')) {
            const targetLoad = over.id.toString().replace('zone-', '') as TaskLoad;
            const currentTask = tasks.find(t => t.id === active.id);
            if (currentTask?.load !== targetLoad) {
                // Check limits for 1-3-5
                const currentCount = activeQuests.filter(t => t.load === targetLoad).length;
                if (targetLoad === 'heavy' && currentCount >= 1) {
                    triggerChumToast("⚠️ 1-3-5 Rule: Only 1 Heavy quest allowed! Crush the current one before adding another.", 'warning');
                    return; // Abort the drop!
                }
                if (targetLoad === 'medium' && currentCount >= 3) {
                    triggerChumToast("Careful! 1-3-5 Rule suggests a max of 3 Medium quests. Don't burn out!");
                }
                if (targetLoad === 'light' && currentCount >= 5) {
                    triggerChumToast("That's a lot of little tasks! 1-3-5 Rule caps at 5 Light quests.");
                }
                updateTask(active.id as string, { load: targetLoad }); // Change the cognitive load
            }
        } else if (over.id === "seed-bank") {
            // Remove from any matrix/list and send to unsorted
            updateTask(active.id as string, { eisenhowerQuadrant: undefined, ivyRank: undefined });
        }
    };

    const { isOver: isGeodeOver, setNodeRef: setGeodeRef } = useDroppable({ id: "geode-dropzone" });

    // ─── NEW: Terrarium Drop Zone & Filter State ───
    const [activeFilter, setActiveFilter] = useState<'default' | 'dark' | 'refreshing' | 'cool'>('default');

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            {/* Full-height container on desktop, scrolling on mobile */}
            <div className="md:h-[calc(100vh-(--spacing(24)))] flex flex-col max-w-[1600px] mx-auto space-y-4 relative md:overflow-hidden px-2 md:px-4 pb-20 md:pb-0">

                <AnimatePresence>
                    {showMorningModal && <MorningPlanningModal />}
                    {showUnDoneModal && <UnDoneModal onClose={() => setShowUnDoneModal(false)} />}

                    {/* Plant Quest Modal */}
                    {isAdding && (
                        <div className="fixed inset-0 z-[100005] flex items-center justify-center p-4">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsAdding(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" />
                            <motion.form
                                initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                onSubmit={handlePlantQuest} className="bg-[var(--bg-card)] border-2 border-[var(--accent-teal)]/30 rounded-3xl p-6 shadow-2xl relative z-10 w-full max-w-2xl flex flex-col"
                            >
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="text-lg font-bold text-[var(--text-main)]">Seed a New Quest</h3>
                                    <button type="button" onClick={() => setIsAdding(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)]"><X size={20} /></button>
                                </div>
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
                                            {/* 🔥 PREMIUM: Estimated Pomodoros Input */}
                                            {isPremiumUser && (
                                                <div className="bg-[var(--bg-dark)] border border-[var(--accent-yellow)]/30 rounded-xl p-3 mt-4 shadow-[inset_0_0_15px_rgba(250,204,21,0.05)]">
                                                    <label className="text-xs font-bold text-[var(--accent-yellow)] uppercase mb-2 flex items-center gap-1.5">
                                                        <Sparkles size={12} /> Estimated Pomodoros
                                                    </label>
                                                    <input
                                                        type="number" min="1" max="20" placeholder="e.g. 2"
                                                        value={newTask.estimatedPomos || ''}
                                                        onChange={e => setNewTask({ ...newTask, estimatedPomos: parseInt(e.target.value) || 1 })}
                                                        className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-yellow)]"
                                                    />
                                                </div>
                                            )}
                                        </div>

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
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                                    <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 rounded-xl text-sm font-bold text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors">Cancel</button>
                                    <button type="submit" className="bg-[var(--accent-teal)] text-[#0b1211] px-6 py-2 rounded-xl text-sm font-bold hover:bg-teal-400 transition-colors disabled:opacity-50" disabled={!newTask.title.trim()}>Plant Seed</button>
                                </div>
                            </motion.form>
                        </div>
                    )}
                    {/* 🔥 THE MASTERY CONFIRMATION MODAL 🔥 */}
                    {draggedToMasteryTask && (
                        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-6">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDraggedToMasteryTask(null)} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" />
                            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-[var(--bg-card)] border-2 border-[var(--text-muted)] rounded-2xl p-8 w-full max-w-sm text-center shadow-[0_0_50px_rgba(0,0,0,0.5)] relative z-10">
                                <h3 className="text-xl font-black text-white mb-2">Archive Quest?</h3>
                                <p className="text-sm text-[var(--text-muted)] mb-6">Mark <span className="text-white font-bold">"{draggedToMasteryTask.title}"</span> as completed and move it to the Hall of Mastery.</p>

                                {/* 🔥 PREMIUM POST-MATCH SURVEY 🔥 */}
                                {isPremiumUser && (
                                    <div className="mb-6 space-y-4 text-left bg-black/40 p-4 rounded-xl border border-[var(--accent-yellow)]/20 shadow-[inset_0_0_20px_rgba(250,204,21,0.05)]">
                                        <div>
                                            <label className="text-xs font-bold text-[var(--accent-yellow)] flex items-center gap-1.5 mb-2">
                                                <BrainCircuit size={12} /> Stress Level: {stressLevel}
                                            </label>
                                            <input
                                                type="range" min="0" max="100" value={stressLevel} onChange={e => setStressLevel(parseInt(e.target.value))}
                                                className="w-full accent-[var(--accent-yellow)]"
                                            />
                                            <div className="flex justify-between text-[9px] text-white/40 mt-1 uppercase font-bold tracking-widest">
                                                <span>Flow (0)</span><span>Burnout (100)</span>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs font-bold text-[var(--accent-yellow)] flex items-center gap-1.5 mb-2">
                                                <Clock size={12} /> Actual Pomodoros
                                            </label>
                                            <input
                                                type="number" min="1" value={actualPomos} onChange={e => setActualPomos(parseInt(e.target.value) || 1)}
                                                className="w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent-yellow)]"
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="flex gap-3">
                                    <button onClick={() => setDraggedToMasteryTask(null)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 hover:bg-white/5 text-sm font-bold transition-all">Cancel</button>
                                    <button
                                        onClick={() => {
                                            const wasFrog = draggedToMasteryTask?.isFrog;

                                            // 🔥 PASS THE PREMIUM STATS HERE
                                            completeTask(draggedToMasteryTask!.id, isPremiumUser ? { actualPomos, stressLevel } : undefined);

                                            setDraggedToMasteryTask(null);
                                            if (wasFrog) triggerChumToast("🐸 BOOM! Frog crushed! You just gained a massive amount of momentum for the day. Keep it up!");
                                        }}
                                        className="flex-1 py-3 rounded-xl bg-white text-black hover:brightness-90 text-sm font-black transition-all shadow-lg"
                                    >
                                        Archive Quest
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                    {/* 🔥 FRAMEWORK SWITCH CONFIRMATION MODAL 🔥 */}
                    {pendingFramework !== undefined && (
                        <div className="fixed inset-0 z-[100000] flex items-center justify-center p-6">
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setPendingFramework(undefined)} className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" />
                            <motion.div initial={{ scale: 0.9, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 20 }} className="bg-[var(--bg-card)] border-2 border-[var(--border-color)] rounded-2xl p-8 w-full max-w-sm text-center shadow-2xl relative z-10">
                                <h3 className="text-xl font-black text-white mb-2">Switch Framework?</h3>
                                <p className="text-sm text-[var(--text-muted)] mb-8">
                                    Are you sure you want to switch to the <span className="text-[var(--accent-teal)] font-bold">{pendingFramework === null ? 'Standard List' : pendingFramework}</span>? This will change how your current quests are organized.
                                </p>
                                <div className="flex gap-3">
                                    <button onClick={() => setPendingFramework(undefined)} className="flex-1 py-3 rounded-xl border border-white/10 text-white/50 hover:bg-white/5 text-sm font-bold transition-all">Cancel</button>
                                    <button onClick={() => {
                                        setActiveFramework(pendingFramework as any);
                                        setPendingFramework(undefined);
                                    }} className="flex-1 py-3 rounded-xl bg-[var(--accent-teal)] text-black hover:brightness-110 text-sm font-black transition-all shadow-lg">Confirm</button>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>



                {/* Header Section */}
                {/* STYLING FIX: Added relative z-[100] to ensure dropdowns overlap the 3D canvas! */}
                <header className="flex flex-col xl:flex-row justify-between items-start xl:items-end gap-4 shrink-0 relative z-[100] pt-2">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-bold text-[var(--text-main)] flex items-center gap-3">
                            <Sprout className="text-[var(--accent-teal)]" size={32} /> Crystal Garden
                        </h1>
                        <p className="text-xs md:text-sm text-[var(--text-muted)] mt-1">Cultivate and manage your active quests.</p>
                    </div>

                    <div className="flex gap-2 md:gap-3 w-full xl:w-auto flex-wrap pb-2 xl:pb-0 hide-scrollbar shrink-0">
                        <div className="relative flex-1 md:w-48 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" size={16} />
                            <input
                                type="text" placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2 text-sm text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] transition-colors"
                            />
                        </div>
                        {/* 🔥 THE NEW FRAMEWORK DROPDOWN 🔥 */}
                        <div className="relative z-50">
                            <button
                                onClick={() => setShowFrameworkMenu(!showFrameworkMenu)}
                                className={`h-full px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 border transition-all ${activeFramework ? 'bg-[var(--accent-teal)]/10 border-[var(--accent-teal)]/50 text-[var(--accent-teal)]' : 'bg-[var(--bg-card)] border-[var(--border-color)] text-[var(--text-main)] hover:border-[var(--accent-teal)]'}`}
                            >
                                {activeFramework ? `Framework: ${activeFramework}` : 'Standard List'}
                                <ChevronDown size={14} className={`transition-transform duration-300 ${showFrameworkMenu ? 'rotate-180' : ''}`} />
                            </button>

                            <AnimatePresence>
                                {showFrameworkMenu && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                                        className="absolute top-full right-0 mt-2 w-48 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden"
                                    >
                                        {[
                                            { id: null, label: 'Standard List' },
                                            { id: '1-3-5', label: '1-3-5 Method' },
                                            { id: 'Eisenhower', label: 'Eisenhower Matrix' },
                                            { id: 'ivy', label: 'Ivy Lee Method' }
                                        ].map((fw) => (
                                            <button
                                                key={fw.label}
                                                onClick={() => {
                                                    setShowFrameworkMenu(false);
                                                    if (activeFramework !== fw.id) setPendingFramework(fw.id);
                                                }}
                                                className="w-full text-left px-4 py-3 text-sm font-bold text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)] hover:text-[var(--text-main)] transition-colors border-b border-white/5 last:border-0"
                                            >
                                                {fw.label}
                                            </button>
                                        ))}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                        <button onClick={() => setShowUnDoneModal(true)} className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] px-4 py-2 rounded-xl text-sm font-bold text-[var(--text-main)] hover:text-[var(--accent-teal)] hover:border-[var(--accent-teal)] transition-colors flex items-center justify-center whitespace-nowrap gap-2 shrink-0">
                            <Moon size={16} /> Wrap Up
                        </button>
                        <button onClick={() => setIsAdding(true)} className="bg-[var(--accent-teal)] text-[#0b1211] px-4 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:brightness-110 shadow-[0_0_10px_rgba(20,184,166,0.2)] shrink-0">
                            <Plus size={16} /> Plant Quest
                        </button>
                    </div>
                </header>

                {/* 3. The Strict 3-Column Layout! (Stacks on mobile/tablet) */}
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 min-h-0 md:pb-4">

                    {/* LEFT Column: Active Quests (Cinematic Shape-Shifter) */}
                    <section className="h-[600px] lg:h-full flex flex-col">
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 md:p-5 flex flex-col h-full overflow-hidden shadow-sm">

                            {/* Static Header */}
                            <div className="flex justify-between items-center mb-4 shrink-0">
                                <h2 className="text-xl font-bold text-[var(--text-main)]">Current Focus</h2>
                                <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-wider">
                                    {activeFramework === 'Eisenhower' ? 'Eisenhower Matrix' : activeFramework === '1-3-5' ? '1-3-5 Protocol' : activeFramework === 'ivy' ? 'Ivy Lee Method' : 'Standard List'}
                                </span>
                            </div>

                            {/* Dynamic Morphing Arena */}
                            <div className="flex-1 relative min-h-0">
                                <AnimatePresence mode="wait">

                                    {activeFramework === 'Eisenhower' ? (
                                        <motion.div
                                            key="eisenhower"
                                            initial={{ opacity: 0, scale: 0.95, filter: "blur(5px)" }}
                                            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                                            exit={{ opacity: 0, scale: 1.05, filter: "blur(5px)" }}
                                            transition={{ duration: 0.3, ease: "easeInOut" }}
                                            className="absolute inset-0 flex flex-col gap-4"
                                        >
                                            <div className="grid grid-cols-2 grid-rows-2 gap-3 flex-1 min-h-0">
                                                <MatrixZone id="quadrant-1" title="Do First" subtitle="Urgent & Important" tasks={activeQuests.filter(t => t.eisenhowerQuadrant === 1)} color="text-red-400" bg="bg-red-400/5" border="border-red-400/30" activeBorder="border-red-400" />
                                                <MatrixZone id="quadrant-2" title="Schedule" subtitle="Not Urgent, Important" tasks={activeQuests.filter(t => t.eisenhowerQuadrant === 2)} color="text-[var(--accent-teal)]" bg="bg-[var(--accent-teal)]/5" border="border-[var(--accent-teal)]/30" activeBorder="border-[var(--accent-teal)]" />
                                                <MatrixZone id="quadrant-3" title="Delegate" subtitle="Urgent, Not Imp." tasks={activeQuests.filter(t => t.eisenhowerQuadrant === 3)} color="text-[var(--accent-yellow)]" bg="bg-[var(--accent-yellow)]/5" border="border-[var(--accent-yellow)]/30" activeBorder="border-[var(--accent-yellow)]" />
                                                <MatrixZone id="quadrant-4" title="Don't Do" subtitle="Not Urgent, Not Imp." tasks={activeQuests.filter(t => t.eisenhowerQuadrant === 4)} color="text-[var(--text-muted)]" bg="bg-[var(--bg-dark)]" border="border-[var(--border-color)]" activeBorder="border-[var(--text-muted)]" />
                                            </div>
                                            {activeQuests.filter(t => !t.eisenhowerQuadrant).length > 0 && (
                                                <div className="h-1/4 min-h-[120px] shrink-0">
                                                    <UnsortedZone id="seed-bank" tasks={activeQuests.filter(t => !t.eisenhowerQuadrant)} title="Unsorted Quests (Drag to Quadrant)" />
                                                </div>
                                            )}
                                        </motion.div>

                                    ) : activeFramework === '1-3-5' ? (
                                        <motion.div
                                            key="135"
                                            initial={{ opacity: 0, x: -30, filter: "blur(5px)" }}
                                            animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                                            exit={{ opacity: 0, x: 30, filter: "blur(5px)" }}
                                            transition={{ duration: 0.3, type: "spring", bounce: 0.2 }}
                                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                            className="absolute inset-0 flex flex-col gap-4 overflow-y-auto [&::-webkit-scrollbar]:hidden pr-1 pb-1"
                                        >
                                            <CapacityZone id="zone-heavy" title="1 Heavy Quest" count={activeQuests.filter(t => t.load === 'heavy').length} max={1} tasks={activeQuests.filter(t => t.load === 'heavy')} color="text-red-400" bg="bg-red-400/5" border="border-red-400/30" />
                                            <CapacityZone id="zone-medium" title="3 Medium Quests" count={activeQuests.filter(t => t.load === 'medium').length} max={3} tasks={activeQuests.filter(t => t.load === 'medium')} color="text-[var(--accent-yellow)]" bg="bg-[var(--accent-yellow)]/5" border="border-[var(--accent-yellow)]/30" />
                                            <CapacityZone id="zone-light" title="5 Light Quests" count={activeQuests.filter(t => t.load === 'light').length} max={5} tasks={activeQuests.filter(t => t.load === 'light')} color="text-[var(--accent-teal)]" bg="bg-[var(--accent-teal)]/5" border="border-[var(--accent-teal)]/30" />
                                        </motion.div>

                                    ) : activeFramework === 'ivy' ? (
                                        <motion.div
                                            key="ivy"
                                            initial={{ opacity: 0, y: 30, filter: "blur(5px)" }}
                                            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                                            exit={{ opacity: 0, y: -30, filter: "blur(5px)" }}
                                            transition={{ duration: 0.3, type: "spring", bounce: 0.2 }}
                                            className="absolute inset-0 flex flex-col gap-4 overflow-hidden"
                                        >
                                            {/* 🔥 PADDED SCROLL CONTAINER: px-1 and -mx-1 gives the glow room to breathe! */}
                                            <div style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }} className="flex-1 overflow-y-auto overflow-x-hidden [&::-webkit-scrollbar]:hidden flex flex-col gap-3 pb-6 px-1 -mx-1">
                                                {[1, 2, 3, 4, 5, 6].map(rank => {
                                                    const task = activeQuests.find(t => t.ivyRank === rank);
                                                    const activeRank = [1, 2, 3, 4, 5, 6].find(r => {
                                                        const t = activeQuests.find(t => t.ivyRank === r);
                                                        return !t || !t.isCompleted;
                                                    }) || 1;
                                                    const isLocked = task && rank > activeRank;

                                                    return <IvySlot key={rank} rank={rank} task={task} isLocked={isLocked} isActive={rank === activeRank} />;
                                                })}
                                            </div>
                                            {activeQuests.filter(t => !t.ivyRank).length > 0 && (
                                                <div className="h-1/3 min-h-[150px] shrink-0">
                                                    <UnsortedZone id="seed-bank" tasks={activeQuests.filter(t => !t.ivyRank)} title="Unranked Quests (Drag to Rank)" />
                                                </div>
                                            )}
                                        </motion.div>

                                    ) : (
                                        <motion.div
                                            key="standard"
                                            initial={{ opacity: 0, filter: "blur(5px)" }}
                                            animate={{ opacity: 1, filter: "blur(0px)" }}
                                            exit={{ opacity: 0, filter: "blur(5px)" }}
                                            transition={{ duration: 0.3 }}
                                            className="absolute inset-0 flex flex-col"
                                        >
                                            <StandardZone id="current-focus" tasks={sortedQuests} />
                                        </motion.div>
                                    )}

                                </AnimatePresence>
                            </div>
                        </div>
                    </section>

                    {/* MIDDLE Column: The Terrarium Drop Zone */}
                    <div ref={setGeodeRef} className={`h-[400px] lg:h-full relative flex flex-col rounded-4xl md:rounded-[2.5rem] p-2 md:p-3 transition-colors duration-300 ${isGeodeOver ? 'bg-[var(--accent-teal)] shadow-[0_0_30px_rgba(20,184,166,0.3)]' : 'bg-[#111] shadow-[inset_0_4px_20px_rgba(0,0,0,0.6),0_0_0_1px_var(--border-color)]'}`}>
                        <div className={`flex-1 w-full h-full rounded-[1.8rem] overflow-hidden relative shadow-[inset_0_0_60px_rgba(0,0,0,0.9)] transition-all ${isGeodeOver ? 'border-2 border-[var(--bg-dark)]' : 'border border-white/10'}`}>

                            <div className="absolute top-5 left-5 z-10 pointer-events-none">
                                <h2 className="text-xl font-black text-white drop-shadow-lg tracking-wide">Daily Synthesization</h2>
                                <p className="text-xs font-bold text-white/80 uppercase tracking-widest mt-1 drop-shadow-md">
                                    {globalArchivedQuests.length} Quests Mastered • {Math.round(completionRatio * 100)}%
                                </p>
                            </div>

                            {isGeodeOver && (
                                <div className="absolute inset-0 z-20 bg-[var(--accent-teal)]/20 backdrop-blur-sm flex items-center justify-center pointer-events-none transition-all">
                                    <motion.h2 initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-4xl font-black text-white drop-shadow-2xl tracking-tight">Drop to Initialize</motion.h2>
                                </div>
                            )}

                            {/* THE DROP ZONE FIX: 'pointer-events-none' ensures dnd-kit registers the drop zone! */}
                            <div className={`w-full h-full ${activeDragTask ? 'pointer-events-none' : ''}`}>
                                <GeodeScene
                                    completionRatio={completionRatio}
                                    snipingShard={snipingShard}
                                    setSnipingShard={setSnipingShard}
                                />
                            </div>
                        </div>
                    </div>

                    {/* RIGHT Column: Hall of Mastery */}
                    <section className="h-[600px] lg:h-full overflow-hidden flex flex-col">
                        <MasteryContainer
                            id="hall-of-mastery"
                            masteryTab={masteryTab}
                            setMasteryTab={setMasteryTab}
                            isEmpty={masteryTab === 'tasks' ? archivedQuests.length === 0 : masteredShards.length === 0}
                            emptyText={masteryTab === 'tasks' ? "No archived quests yet" : "No knowledge shards have reached 100% mastery yet."}
                        >
                            {masteryTab === 'tasks' ? (
                                archivedQuests.map(task => <TaskCard key={task.id} task={task} />)
                            ) : (
                                masteredShards.map(shard => (
                                    <MasteredShardCard
                                        key={shard.id}
                                        shard={shard}
                                        onSnipe={() => setSnipingShard(shard)}
                                    />
                                ))
                            )}
                        </MasteryContainer>
                    </section>

                </div>

                <DragOverlay dropAnimation={null}>
                    {activeDragTask ? <TaskCard task={activeDragTask} isOverlay /> : null}
                </DragOverlay>

            </div>
        </DndContext>
    );
}