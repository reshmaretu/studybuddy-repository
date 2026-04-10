"use client";

import { Brain, Play, Pause, Settings, Bell, Flame, Coffee, Zap, RotateCcw, Calendar, CheckCircle2, Pin } from "lucide-react"; import { useEffect, useState } from "react";
import { useStudyStore, Task, calculateXpRequirement, getTitleForLevel } from "@/store/useStudyStore";
import { DndContext, DragEndEvent, DragStartEvent, useDroppable, DragOverlay } from "@dnd-kit/core";
import { AnimatePresence, motion } from "framer-motion";
import TaskCard from "@/components/TaskCard";
import { redirect } from "next/navigation";
import ChumRenderer from "@/components/ChumRenderer";
import BrainResetModal from "@/components/BrainResetModal";

// The Magical Drop Zone Component
function CompletionDropZone() {
    const { isOver, setNodeRef } = useDroppable({ id: "completion-zone" });

    return (
        <motion.div
            initial={{ y: 150, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 150, opacity: 0 }}
            ref={setNodeRef}
            className={`fixed bottom-10 left-1/2 -translate-x-1/2 w-96 h-32 rounded-3xl border-4 border-dashed flex flex-col items-center justify-center z-50 transition-all duration-300 backdrop-blur-md shadow-2xl ${isOver
                ? "bg-[var(--accent-teal)]/30 border-[var(--accent-teal)] scale-110 drop-shadow-[0_0_20px_var(--accent-teal)] text-[var(--text-main)]"
                : "bg-[var(--bg-dark)]/80 border-[var(--text-muted)] text-[var(--text-muted)]"
                }`}
        >
            <CheckCircle2 size={36} className={`mb-2 ${isOver ? "text-[var(--accent-teal)] animate-bounce" : ""}`} />
            <span className="text-lg font-bold tracking-widest uppercase">
                {isOver ? "Release to Bloom!" : "Gently Nurture Here"}
            </span>
        </motion.div>
    );
}

export default function Dashboard() {
    const [time, setTime] = useState(new Date());

    // THE FIX: We exclusively use activeDragTask now!
    const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);

    const {
        tasks, focusScore, dailyStreak, totalSessions, totalSecondsTracked,
        timeLeft, isRunning, toggleTimer, resetTimer, decrementTimer, completeTask,
        isInitialized, xp, level, pomodoroFocus
    } = useStudyStore();

    // Safety filter to ensure we only try to render valid tasks
    const validTasks = tasks.filter(t => t && t.id);
    const activeTasks = validTasks.filter(t => !t.isCompleted);
    const completedTasks = validTasks.filter(t => t.isCompleted);

    const [sparkQuote, setSparkQuote] = useState("Sparking up the feed...");

    useEffect(() => {
        const initStore = async () => {
            const store = useStudyStore.getState();
            if (!store.isInitialized) {
                await store.initializeData();
            }
        };
        initStore();
    }, []);

    // Timer Engine
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isRunning && timeLeft > 0) {
            interval = setInterval(() => decrementTimer(), 1000);
        }
        return () => clearInterval(interval);
    }, [isRunning, timeLeft, decrementTimer]);

    useEffect(() => {
        const clockTimer = setInterval(() => setTime(new Date()), 60000);
        return () => clearInterval(clockTimer);
    }, []);

    // Dynamic Sparks Feed Fetcher
    useEffect(() => {
        const fetchSpark = async () => {
            const prompt = "You are Chum, a cozy, lo-fi loving study buddy. Give me exactly one short, inspiring sentence about focus, time management, or well-being to start the day. Do not use quotation marks.";
            try {
                const res = await fetch("/api/chat", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ messages: [{ role: "user", content: prompt }] })
                });
                const data = await res.json();
                if (!res.ok || data.error) throw new Error("Cloud failed");
                setSparkQuote(data.response);
            } catch (e) {
                // Local Fallback
                try {
                    const res = await fetch(`${useStudyStore.getState().ollamaUrl}/api/chat`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ model: "llama3.2:1b", messages: [{ role: "user", content: prompt }], stream: false })
                    });
                    const data = await res.json();
                    setSparkQuote(data.message.content);
                } catch (err) {
                    setSparkQuote("Take a deep breath in, and let the sound of your lo-fi beats wash over you as you refocus your mind.");
                }
            }
        };
        fetchSpark();
    }, []);

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60).toString().padStart(2, '0');
        const s = (seconds % 60).toString().padStart(2, '0');
        return `${m}:${s}`;
    };

    const [isBrainResetOpen, setIsBrainResetOpen] = useState(false);

    const totalSeconds = 1500;
    const strokeOffset = 283 - (283 * (timeLeft / totalSeconds));
    const scoreOffset = 110 - (110 * (focusScore / 100));
    const formattedDate = time.toISOString().split('T')[0];

    // 👇 1. PUT THE GREETING LOGIC RIGHT HERE!
    const currentHour = time.getHours();
    let greeting = "Good Evening";
    if (currentHour >= 5 && currentHour < 12) {
        greeting = "Good Morning";
    } else if (currentHour >= 12 && currentHour < 17) {
        greeting = "Good Afternoon";
    }

    // Attempt to grab the user's name from the store, falling back to "Guardian"
    const store = useStudyStore();
    const displayName = store.displayName || store.fullName || "Guardian";
    // 👆 END OF GREETING LOGIC

    // Drag and Drop Handlers
    const handleDragStart = (event: DragStartEvent) => {
        const task = validTasks.find(t => t.id === event.active.id);
        setActiveDragTask(task || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        setActiveDragTask(null);
        const { active, over } = event;

        if (over && over.id === "completion-zone") {
            if (window.confirm("Spark this bloom to completion?")) {
                completeTask(active.id as string);
            }
        }
    };

    return (
        <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="max-w-[1400px] mx-auto pb-24 md:pb-12 space-y-6 px-4 md:px-0">

                {/* HEADER */}
                <header className="flex justify-between items-center gap-6 mb-4 pt-4 md:pt-0">
                    <div className="flex-1 min-w-0 pr-2">
                        <h1 className="text-xl md:text-3xl font-black text-[var(--text-main)] truncate leading-tight">
                            {greeting}, {displayName}!
                        </h1>
                    </div>
                    <div className="flex items-center gap-4 sm:gap-8 shrink-0">
                        <div className="flex flex-col items-end">
                            <span className="text-base md:text-xl font-black text-[var(--text-main)] leading-none">{time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                            <span className="text-[var(--accent-teal)] font-bold tracking-widest uppercase text-[8px] md:text-[10px] mt-1 whitespace-nowrap">{time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        </div>
                        <button className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors relative shrink-0">
                            <Bell size={24} />
                            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-(--bg-dark)"></span>
                        </button>
                    </div>
                </header>

                {/* SPARKS FEED */}
                <fieldset className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-5 pb-5 pt-2 mt-4 mb-4">
                    <legend className="ml-4 px-2 flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]">
                        <Zap size={14} className="text-[var(--accent-yellow)]" /> Sparks Feed
                    </legend>
                    <div className="text-center mt-1">
                        <p className="text-[var(--text-main)] italic text-sm">"{sparkQuote}"</p>
                        <p className="text-[var(--accent-teal)] text-xs font-bold mt-2">— Chum</p>
                    </div>
                </fieldset>

                {/* TOP ROW: Score, Reset, Timer */}
                <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 md:p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
                        {!isInitialized ? (
                            <div className="w-full h-full flex items-center gap-4 animate-pulse">
                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full border-4 border-(--border-color)" />
                                <div className="flex-1 space-y-3">
                                    <div className="h-4 bg-(--border-color) rounded w-1/2" />
                                    <div className="h-8 bg-(--border-color) rounded w-full" />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="relative w-24 h-16 md:w-28 md:h-20 flex flex-col items-center justify-end">
                                    <svg viewBox="0 0 100 50" className="absolute top-0 w-full h-full overflow-visible">
                                        {/* The magical pathLength="100" standardizes the stroke calculation perfectly */}
                                        <path d="M 10 45 A 35 35 0 0 1 90 45" stroke="var(--border-color)" strokeWidth="10" fill="none" strokeLinecap="round" pathLength="100" />
                                        <path
                                            d="M 10 45 A 35 35 0 0 1 90 45"
                                            stroke="var(--accent-teal)"
                                            strokeWidth="10" fill="none" strokeLinecap="round"
                                            pathLength="100"
                                            strokeDasharray="100"
                                            strokeDashoffset={100 - focusScore}
                                            style={{ filter: 'drop-shadow(0px 0px 8px var(--accent-teal))', transition: 'stroke-dashoffset 1s ease-out' }}
                                        />
                                    </svg>
                                    <div className="flex flex-col items-center z-10 mb-[-5px]">
                                        <span className="text-2xl md:text-3xl font-bold text-[var(--text-main)] leading-none">{focusScore}</span>
                                        <span className="text-[8px] md:text-[9px] text-[var(--text-muted)] font-bold tracking-widest uppercase mt-1">Focus Score</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-center gap-3 w-32 md:w-36">
                                    <div className="flex items-center gap-1.5 text-[var(--text-main)] font-bold text-xs md:text-sm">
                                        <Flame size={14} className="text-[var(--accent-cyan)] md:size-16" /> {totalSessions} Focus Flows
                                    </div>
                                    <button
                                        onClick={() => useStudyStore.getState().openFocusModal()}
                                        className="w-full py-2 md:py-2.5 rounded-lg bg-[var(--accent-teal)]/20 text-[var(--accent-teal)] font-bold hover:bg-[var(--accent-teal)] hover:text-[#0b1211] transition-all text-xs md:text-sm border border-[var(--accent-teal)]/30 flex items-center justify-center gap-2 shadow-sm"
                                    >
                                        <Pin size={14} /> Focus
                                    </button>
                                </div>
                            </>
                        )}
                    </div>

                    <button
                        onClick={() => setIsBrainResetOpen(true)}
                        className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 flex flex-col items-center justify-center shadow-sm cursor-pointer group relative overflow-hidden hover:border-[var(--accent-teal)]/50 transition-colors w-full"
                    >
                        <div className="absolute inset-0 bg-[var(--accent-teal)] opacity-0 group-hover:opacity-5 transition-opacity duration-700"></div>
                        <Brain size={48} className="text-[var(--accent-teal)] mb-3 group-hover:scale-110 transition-transform duration-500" style={{ filter: 'drop-shadow(0px 0px 10px var(--accent-teal))' }} />
                        <h2 className="text-lg font-bold text-[var(--text-main)] mb-1">Mindful Reset</h2>
                        <p className="text-[var(--text-muted)] text-xs font-medium">Breathe deeply</p>
                    </button>

                </section>

                {/* MIDDLE ROW: Pet */}
                <section className="grid grid-cols-1 lg:grid-cols-1 gap-5">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-4 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 md:gap-6 shadow-sm cursor-pointer hover:border-[var(--accent-teal)]/50 transition-colors">

                        {/* Strictly locked 24x24 container */}
                        <div className="relative w-20 h-20 md:w-24 md:h-24 min-w-[5rem] md:min-w-[6rem] min-h-[5rem] md:min-h-[6rem] bg-black/20 rounded-2xl flex items-center justify-center border border-[var(--border-color)] flex-shrink-0">

                            {/* Bulletproof wrapper */}
                            <div className="absolute inset-0 flex items-center justify-center rounded-2xl overflow-hidden pointer-events-none">
                                <ChumRenderer size="w-14 h-14 md:w-16 md:h-16 scale-125 translate-y-1.5" />
                            </div>

                            <div className="absolute -bottom-3 bg-[var(--accent-yellow)] text-black text-[9px] md:text-[10px] font-bold px-3 py-1 rounded-full shadow-lg z-10">LVL {level}</div>
                        </div>

                        {/* Added min-w-0 here to ensure the text doesn't overflow */}
                        <div className="flex-1 min-w-0 w-full">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-2 gap-2 sm:gap-0">
                                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                                    <h3 className="text-lg md:text-xl font-bold text-[var(--text-main)] truncate max-w-[200px] md:max-w-none">{getTitleForLevel(level)}</h3>
                                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--accent-yellow)]/10 border border-[var(--accent-yellow)]/20 text-[var(--accent-yellow)] font-bold text-[9px] md:text-[10px] uppercase tracking-wide whitespace-nowrap">
                                        <Flame size={12} /> {dailyStreak} Day Streak
                                    </div>
                                </div>
                                <span className="text-[9px] md:text-[10px] font-mono text-[var(--text-muted)] font-bold tracking-widest whitespace-nowrap">Spirit: {xp}/{calculateXpRequirement(level)}</span>
                            </div>
                            <div className="h-2 w-full bg-black/30 rounded-full overflow-hidden mb-2">
                                <div className="h-full bg-[var(--accent-teal)] rounded-full transition-all duration-1000" style={{ width: `${(xp / calculateXpRequirement(level)) * 100}%` }}></div>
                            </div>
                            <p className="text-xs md:text-sm text-[var(--text-muted)] italic truncate">"Nurture your blooms, grow your soul."</p>
                        </div>
                    </div>

                </section>

                {/* CURRENT FOCUS */}
                <section className="pt-2 relative">
                    <div className="flex items-center gap-3 mb-4">
                        <h2 className="text-xl font-bold text-[var(--text-main)]">Garden Blooms</h2>
                        <span className="bg-[var(--bg-card)] border border-[var(--border-color)] px-2 py-1 rounded-md text-[11px] text-[var(--text-muted)] font-mono flex items-center gap-1.5">
                            <Calendar size={12} /> {formattedDate}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">

                        <AnimatePresence>
                            {!isInitialized ? (
                                Array.from({ length: 3 }).map((_, i) => (
                                    <div key={i} className="h-32 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl animate-pulse p-4 flex flex-col gap-3">
                                        <div className="h-4 bg-[var(--border-color)] rounded w-3/4" />
                                        <div className="h-3 bg-[var(--border-color)] rounded w-1/2" />
                                        <div className="mt-auto flex gap-2">
                                            <div className="h-6 w-12 bg-[var(--border-color)] rounded" />
                                            <div className="h-6 w-12 bg-[var(--border-color)] rounded" />
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <>
                                    {activeTasks.slice(0, 3).map((task) => (
                                        <TaskCard key={task.id} task={task} />
                                    ))}

                                    {Array.from({ length: Math.max(0, 3 - activeTasks.length) }).map((_, i) => (
                                        <div key={`empty-${i}`} className="h-24 md:h-32 border-[3px] border-dashed border-[var(--text-muted)]/40 rounded-2xl flex items-center justify-center bg-[var(--bg-dark)]/50 hover:border-[var(--accent-teal)]/60 transition-colors cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)] text-xs md:text-sm font-bold tracking-wide">
                                            + Open Slot
                                        </div>
                                    ))}
                                </>
                            )}
                        </AnimatePresence>

                        <div className="h-24 md:h-32 border-[3px] border-dashed border-[var(--text-muted)]/40 rounded-2xl flex flex-col items-center justify-center bg-[var(--bg-dark)]/50 hover:border-[var(--accent-teal)]/60 transition-colors cursor-pointer text-[var(--text-muted)] hover:text-[var(--accent-teal)]">
                            <span className="text-lg md:text-xl mb-1">✨</span>
                            <span className="text-[10px] md:text-xs font-bold tracking-wide uppercase">Crystal Garden</span>
                            <span className="text-[9px] md:text-[10px] opacity-70 mt-1">+{Math.max(0, activeTasks.length - 3)} hidden blooms</span>
                        </div>
                    </div>

                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-8 shadow-sm">
                        <h3 className="text-lg font-bold text-[var(--text-main)] mb-6">Garden Strength</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-4 text-center mb-8 border-b border-[var(--border-color)] pb-8">
                            <div className="flex flex-col items-center justify-center">
                                <span className="text-3xl md:text-4xl font-bold text-[var(--text-main)] mb-1">{activeTasks.length}</span>
                                <span className="text-xs text-[var(--text-muted)] font-medium">Active</span>
                            </div>
                            <div className="flex flex-col items-center justify-center border-y sm:border-y-0 sm:border-x border-[var(--border-color)] py-4 sm:py-0">
                                <span className="text-3xl md:text-4xl font-bold text-[var(--text-main)] mb-1">{completedTasks.length}</span>
                                <span className="text-xs text-[var(--text-muted)] font-medium">Completed</span>
                            </div>
                            <div className="flex flex-col items-center justify-center">
                                {/* 👇 Now divides literal seconds by 3600 to get true hours! */}
                                <span className="text-3xl md:text-4xl font-bold text-[var(--text-main)] mb-1">{(totalSecondsTracked / 3600).toFixed(1)}</span>
                                <span className="text-xs text-[var(--text-muted)] font-medium">Flow Hours</span>
                            </div>
                        </div>
                        <div className="flex flex-col items-center justify-center text-center py-4">
                            {!isInitialized ? (
                                <div className="flex flex-col items-center gap-2 animate-pulse w-full">
                                    <div className="w-6 h-6 rounded-full bg-[var(--border-color)]" />
                                    <div className="h-3 bg-[var(--border-color)] rounded w-1/3" />
                                </div>
                            ) : (
                                <>
                                    <CheckCircle2 size={24} className={completedTasks.length > 0 ? "text-[var(--accent-teal)] mb-2" : "text-[var(--border-color)] mb-2"} />
                                    <p className="text-[var(--text-muted)] text-sm">
                                        {completedTasks.length > 0 ? `You nurtured ${completedTasks.length} blooms today.` : "Keep tending your garden."}
                                    </p>
                                </>
                            )}
                        </div>
                    </div>
                </section>

                {/* The Animated Drop Zone Toggle */}
                <AnimatePresence>
                    {activeDragTask && <CompletionDropZone />}
                </AnimatePresence>

                {/* The Floating Drag Visualizer */}
                <DragOverlay dropAnimation={null}>
                    {activeDragTask ? <TaskCard task={activeDragTask as Task} isOverlay /> : null}
                </DragOverlay>

                <BrainResetModal isOpen={isBrainResetOpen} onClose={() => setIsBrainResetOpen(false)} />
            </div>
        </DndContext>
    );
}