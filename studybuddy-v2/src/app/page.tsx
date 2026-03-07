"use client";

import { Brain, Play, Pause, Settings, Bell, Flame, Coffee, Zap, RotateCcw, Calendar, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useStudyStore, Task } from "@/store/useStudyStore";
import { DndContext, DragEndEvent, DragStartEvent, useDroppable, DragOverlay } from "@dnd-kit/core";
import { AnimatePresence, motion } from "framer-motion";
import TaskCard from "@/components/TaskCard";
import { redirect } from "next/navigation";

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
        {isOver ? "Release to Complete!" : "Drop Quest Here"}
      </span>
    </motion.div>
  );
}

export default function Dashboard() {
  const [time, setTime] = useState(new Date());

  // THE FIX: We exclusively use activeDragTask now!
  const [activeDragTask, setActiveDragTask] = useState<Task | null>(null);

  const {
    tasks, focusScore, dailyStreak, totalSessions,
    timeLeft, isRunning, toggleTimer, resetTimer, decrementTimer, completeTask
  } = useStudyStore();

  // Safety filter to ensure we only try to render valid tasks
  const validTasks = tasks.filter(t => t && t.id);
  const activeTasks = validTasks.filter(t => !t.isCompleted);
  const completedTasks = validTasks.filter(t => t.isCompleted);

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

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const totalSeconds = 1500;
  const strokeOffset = 283 - (283 * (timeLeft / totalSeconds));
  const scoreOffset = 110 - (110 * (focusScore / 100));
  const formattedDate = time.toISOString().split('T')[0];

  // Drag and Drop Handlers
  const handleDragStart = (event: DragStartEvent) => {
    const task = validTasks.find(t => t.id === event.active.id);
    setActiveDragTask(task || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragTask(null);
    const { active, over } = event;

    if (over && over.id === "completion-zone") {
      if (window.confirm("Spark this quest as complete?")) {
        completeTask(active.id as string);
      }
    }
  };

  return (
    <DndContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="max-w-[1400px] mx-auto pb-12 space-y-6">

        {/* HEADER */}
        <header className="flex justify-between items-center mb-4">
          <div><h1 className="text-3xl font-bold text-[var(--text-main)]">Good Morning, Explorer!</h1></div>
          <div className="flex items-center gap-6">
            <div className="flex flex-col items-end">
              <span className="text-xl font-bold text-[var(--text-main)] leading-none">{time.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
              <span className="text-[var(--accent-teal)] font-bold tracking-widest uppercase text-[10px] mt-1">{time.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
            </div>
            <button className="p-2 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors relative">
              <Bell size={24} />
              <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[var(--bg-dark)]"></span>
            </button>
          </div>
        </header>

        {/* SPARKS FEED */}
        <fieldset className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl px-5 pb-5 pt-2 mt-4 mb-4">
          <legend className="ml-4 px-2 flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-[var(--text-muted)]">
            <Zap size={14} className="text-[var(--accent-yellow)]" /> Sparks Feed
          </legend>
          <div className="text-center mt-1">
            <p className="text-[var(--text-main)] italic text-sm">"Take a deep breath in, and let the sound of your lo-fi beats wash over you as you refocus your mind."</p>
            <p className="text-[var(--accent-teal)] text-xs font-bold mt-2">— Chum</p>
          </div>
        </fieldset>

        {/* TOP ROW: Score, Reset, Timer */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 flex items-center justify-between shadow-sm relative overflow-hidden">
            <div className="relative w-28 h-20 flex flex-col items-center justify-end">
              <svg viewBox="0 0 100 50" className="absolute top-0 w-full h-full overflow-visible">
                <path d="M 10 45 A 35 35 0 0 1 90 45" stroke="var(--border-color)" strokeWidth="10" fill="none" strokeLinecap="round" />
                <path d="M 10 45 A 35 35 0 0 1 90 45" stroke="var(--accent-teal)" strokeWidth="10" fill="none" strokeLinecap="round" strokeDasharray="110" strokeDashoffset={scoreOffset} style={{ filter: 'drop-shadow(0px 0px 8px var(--accent-teal))', transition: 'stroke-dashoffset 1s ease-out' }} />
              </svg>
              <div className="flex flex-col items-center z-10 mb-[-5px]">
                <span className="text-3xl font-bold text-[var(--text-main)] leading-none">{focusScore}</span>
                <span className="text-[9px] text-[var(--text-muted)] font-bold tracking-widest uppercase mt-1">Focus Score</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-3 w-36">
              <div className="flex items-center gap-1.5 text-[var(--text-main)] font-bold text-sm">
                <Flame size={16} className="text-[var(--accent-cyan)]" /> {totalSessions} Sessions
              </div>
              <button
                onClick={() => useStudyStore.getState().openFocusModal()}
                className="w-full py-2.5 rounded-lg bg-[var(--accent-teal)]/20 text-[var(--accent-teal)] font-bold hover:bg-[var(--accent-teal)] hover:text-[#0b1211] transition-all text-sm border border-[var(--accent-teal)]/30"
              >
                FlowState
              </button>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 flex flex-col items-center justify-center shadow-sm cursor-pointer group relative overflow-hidden">
            <div className="absolute inset-0 bg-[var(--accent-teal)] opacity-0 group-hover:opacity-5 transition-opacity duration-700"></div>
            <Brain size={48} className="text-[var(--accent-teal)] mb-3 group-hover:scale-110 transition-transform duration-500" style={{ filter: 'drop-shadow(0px 0px 10px var(--accent-teal))' }} />
            <h2 className="text-lg font-bold text-[var(--text-main)] mb-1">Brain Reset</h2>
            <p className="text-[var(--text-muted)] text-xs font-medium">2-min meditation</p>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-5 flex items-center justify-center shadow-sm relative min-h-[140px]">
            <button className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors"><Settings size={18} /></button>
            <div className="flex items-center gap-6 w-full justify-center">
              <button onClick={resetTimer} className="w-10 h-10 rounded-full bg-[var(--bg-dark)] border border-[var(--border-color)] flex items-center justify-center text-[var(--text-muted)] hover:text-[var(--text-main)] transition-colors z-10 active:scale-90">
                <RotateCcw size={16} />
              </button>
              <div className="relative w-28 h-28 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full transform -rotate-90 overflow-visible">
                  <circle cx="50" cy="50" r="45" stroke="var(--border-color)" strokeWidth="6" fill="none" />
                  <circle cx="50" cy="50" r="45" stroke="var(--accent-teal)" strokeWidth="6" fill="none" strokeDasharray="283" strokeDashoffset={strokeOffset} strokeLinecap="round" style={{ filter: 'drop-shadow(0px 0px 8px var(--accent-teal))', transition: 'stroke-dashoffset 1s linear' }} />
                </svg>
                <span className="text-2xl font-bold text-[var(--text-main)] tracking-wider font-mono z-10">{formatTime(timeLeft)}</span>
              </div>
              <button onClick={toggleTimer} className={`w-10 h-10 rounded-full border flex items-center justify-center transition-colors z-10 active:scale-90 ${isRunning ? 'bg-[var(--accent-yellow)]/20 border-[var(--accent-yellow)] text-[var(--accent-yellow)] hover:bg-[var(--accent-yellow)] hover:text-[#0b1211]' : 'bg-[var(--accent-teal)]/20 border-[var(--accent-teal)] text-[var(--accent-teal)] hover:bg-[var(--accent-teal)] hover:text-[#0b1211]'}`}>
                {isRunning ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
              </button>
            </div>
          </div>
        </section>

        {/* MIDDLE ROW: Pet & Brew */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 flex items-center gap-6 shadow-sm cursor-pointer hover:border-[var(--accent-teal)]/50 transition-colors">
            <div className="relative w-24 h-24 bg-black/20 rounded-2xl flex items-center justify-center border border-[var(--border-color)] flex-shrink-0">
              <span className="text-5xl drop-shadow-xl">🎗️</span>
              <div className="absolute -bottom-3 bg-[var(--accent-yellow)] text-black text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">LVL 4</div>
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-end mb-2">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-[var(--text-main)]">Growing</h3>
                  <div className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--accent-yellow)]/10 border border-[var(--accent-yellow)]/20 text-[var(--accent-yellow)] font-bold text-[10px] uppercase tracking-wide">
                    <Flame size={12} /> {dailyStreak} Day Streak
                  </div>
                </div>
                <span className="text-[10px] font-mono text-[var(--text-muted)] font-bold tracking-widest">XP: {completedTasks.length * 50}/1000</span>
              </div>
              <div className="h-2 w-full bg-black/30 rounded-full overflow-hidden mb-2">
                <div className="h-full bg-[var(--accent-teal)] rounded-full transition-all duration-1000" style={{ width: `${(completedTasks.length * 50 / 1000) * 100}%` }}></div>
              </div>
              <p className="text-sm text-[var(--text-muted)] italic">"Complete quests to grow together."</p>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-6 shadow-sm relative">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-bold text-[var(--text-main)] flex items-center gap-2">
                <Coffee size={18} className="text-[var(--accent-teal)]" /> The Daily Brew
              </h3>
              <span className="text-[10px] tracking-widest uppercase font-bold text-[var(--text-muted)]">Habits</span>
            </div>
            <div className="flex items-center gap-6">
              <div className="hidden sm:flex w-16 h-16 rounded-full border-[5px] border-[var(--border-color)]/50 items-center justify-center relative flex-shrink-0 opacity-70">
                <div className="absolute -right-3 top-2.5 w-4 h-8 border-[5px] border-l-0 border-[var(--border-color)]/50 rounded-r-full"></div>
              </div>
              <div className="flex flex-col gap-3 w-full">
                {['Drink a glass of water', 'Organize workspace', 'Read 10 pages'].map((habit, i) => (
                  <div key={i} className="flex items-center gap-3 group cursor-pointer">
                    <div className="w-4 h-4 rounded-full border-2 border-[var(--border-color)] group-hover:border-[var(--accent-teal)] transition-colors flex items-center justify-center"></div>
                    <span className={'text-sm text-[var(--text-muted)] group-hover:text-[var(--text-main)]'}>{habit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CURRENT FOCUS */}
        <section className="pt-2 relative">
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl font-bold text-[var(--text-main)]">Current Focus</h2>
            <span className="bg-[var(--bg-card)] border border-[var(--border-color)] px-2 py-1 rounded-md text-[11px] text-[var(--text-muted)] font-mono flex items-center gap-1.5">
              <Calendar size={12} /> {formattedDate}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">

            <AnimatePresence>
              {activeTasks.slice(0, 3).map((task) => (
                <TaskCard key={task.id} task={task} />
              ))}
            </AnimatePresence>

            {Array.from({ length: Math.max(0, 3 - activeTasks.length) }).map((_, i) => (
              <div key={`empty-${i}`} className="h-32 border-[3px] border-dashed border-[var(--text-muted)]/40 rounded-2xl flex items-center justify-center bg-[var(--bg-dark)]/50 hover:border-[var(--accent-teal)]/60 transition-colors cursor-pointer text-[var(--text-muted)] hover:text-[var(--text-main)] text-sm font-bold tracking-wide">
                + Open Slot
              </div>
            ))}

            <div className="h-32 border-[3px] border-dashed border-[var(--text-muted)]/40 rounded-2xl flex flex-col items-center justify-center bg-[var(--bg-dark)]/50 hover:border-[var(--accent-teal)]/60 transition-colors cursor-pointer text-[var(--text-muted)] hover:text-[var(--accent-teal)]">
              <span className="text-xl mb-1">✨</span>
              <span className="text-xs font-bold tracking-wide uppercase">Crystal Garden</span>
              <span className="text-[10px] opacity-70 mt-1">+{Math.max(0, activeTasks.length - 3)} hidden tasks</span>
            </div>
          </div>

          <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-2xl p-8 shadow-sm">
            <h3 className="text-lg font-bold text-[var(--text-main)] mb-6">Quest Progress</h3>
            <div className="grid grid-cols-3 gap-4 text-center mb-8 border-b border-[var(--border-color)] pb-8">
              <div className="flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-[var(--text-main)] mb-1">{activeTasks.length}</span>
                <span className="text-xs text-[var(--text-muted)] font-medium">Active</span>
              </div>
              <div className="flex flex-col items-center justify-center border-x border-[var(--border-color)]">
                <span className="text-4xl font-bold text-[var(--text-main)] mb-1">{completedTasks.length}</span>
                <span className="text-xs text-[var(--text-muted)] font-medium">Completed</span>
              </div>
              <div className="flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-[var(--text-main)] mb-1">{(totalSessions * 25 / 60).toFixed(1)}</span>
                <span className="text-xs text-[var(--text-muted)] font-medium">Hours</span>
              </div>
            </div>
            <div className="flex flex-col items-center justify-center text-center py-4">
              <CheckCircle2 size={24} className={completedTasks.length > 0 ? "text-[var(--accent-teal)] mb-2" : "text-[var(--border-color)] mb-2"} />
              <p className="text-[var(--text-muted)] text-sm">
                {completedTasks.length > 0 ? `You crushed ${completedTasks.length} quests!` : "No completed quests yet"}
              </p>
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

      </div>
    </DndContext>
  );
}