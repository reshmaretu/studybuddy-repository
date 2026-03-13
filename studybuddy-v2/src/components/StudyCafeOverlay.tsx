"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { useStudyStore } from "@/store/useStudyStore";
import {
    Coffee, X, Play, Pause, SkipForward,
    CheckCircle2, Music, Wind, Waves, Flame, Droplets, ChevronUp, ChevronDown
} from "lucide-react";
import { supabase } from "@/lib/supabase";

// ─── Atmosphere Definitions ─────────────────────────────────────────────────
const ATMOSPHERES = [
    {
        id: "lofi",
        label: "Rain & Lo-Fi",
        icon: Music,
        bg: ["#0d1117", "#141e2e", "#0e1a2b"],
        accent: "#38bdf8",
        glow: "rgba(56,189,248,0.15)",
        overlay: "rgba(10,14,22,0.72)",
        animation: `
            0%   { background-position: 0% 50%;   filter: brightness(1) saturate(1.1); }
            33%  { background-position: 40% 100%; filter: brightness(0.93) saturate(1.0); }
            66%  { background-position: 100% 50%; filter: brightness(0.98) saturate(1.15); }
            100% { background-position: 0% 50%;   filter: brightness(1) saturate(1.1); }
        `,
        css: "linear-gradient(135deg, #03071e, #06101f, #0d1b2a, #1e3a5f, #0d1b2a, #062040, #03071e)",
    },
    {
        id: "rain",
        label: "Stormy Window",
        icon: Droplets,
        bg: ["#0a0e14", "#111928", "#0c1622"],
        accent: "#93c5fd",
        glow: "rgba(147,197,253,0.12)",
        overlay: "rgba(8,12,20,0.75)",
        animation: `
            0%   { background-position: 0% 0%;   }
            50%  { background-position: 100% 100%; }
            100% { background-position: 0% 0%;   }
        `,
        css: "linear-gradient(160deg, #030712, #0c1445, #0a1128, #111c44, #070e22)",
    },
    {
        id: "cafe",
        label: "Sunlit Café",
        icon: Coffee,
        bg: ["#1a1008", "#2a1c0e", "#1e1208"],
        accent: "#fbbf24",
        glow: "rgba(251,191,36,0.18)",
        overlay: "rgba(18,10,4,0.68)",
        animation: `
            0%   { background-position: 0% 50%;   filter: brightness(1) sepia(0.15); }
            50%  { background-position: 100% 50%; filter: brightness(1.05) sepia(0.2); }
            100% { background-position: 0% 50%;   filter: brightness(1) sepia(0.15); }
        `,
        css: "linear-gradient(135deg, #190e04, #2d1a0a, #3d2410, #2a1a08, #1a0e04)",
    },
    {
        id: "ocean",
        label: "Ocean Waves",
        icon: Waves,
        bg: ["#061018", "#0a1e2e", "#041020"],
        accent: "#06b6d4",
        glow: "rgba(6,182,212,0.14)",
        overlay: "rgba(4,12,22,0.74)",
        animation: `
            0%   { background-position: 0% 50%; }
            33%  { background-position: 50% 100%; }
            66%  { background-position: 100% 0%; }
            100% { background-position: 0% 50%; }
        `,
        css: "linear-gradient(160deg, #02080f, #062030, #04183a, #062438, #021018)",
    },
    {
        id: "fire",
        label: "Fireplace",
        icon: Flame,
        bg: ["#180702", "#2a0e04", "#160600"],
        accent: "#f97316",
        glow: "rgba(249,115,22,0.2)",
        overlay: "rgba(14,5,0,0.70)",
        animation: `
            0%   { background-position: 0% 0%;   filter: brightness(1) saturate(1.2); }
            25%  { background-position: 30% 60%;  filter: brightness(1.08) saturate(1.1); }
            50%  { background-position: 100% 80%; filter: brightness(0.96) saturate(1.3); }
            75%  { background-position: 60% 40%;  filter: brightness(1.05) saturate(1.2); }
            100% { background-position: 0% 0%;   filter: brightness(1) saturate(1.2); }
        `,
        css: "linear-gradient(135deg, #0f0300, #2c0b02, #3d1004, #291004, #100300)",
    },
    {
        id: "wind",
        label: "Forest Wind",
        icon: Wind,
        bg: ["#050f08", "#0a1c10", "#040d06"],
        accent: "#86efac",
        glow: "rgba(134,239,172,0.13)",
        overlay: "rgba(4,10,6,0.73)",
        animation: `
            0%   { background-position: 0% 50%; }
            50%  { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        `,
        css: "linear-gradient(135deg, #020a04, #0b1e0e, #0f2212, #0c1a0e, #030a05)",
    },
];

// ─── Standalone Centered Visualizer ───────────────────────────────────────────────
function CenteredVisualizer({ accent, isRunning }: { accent: string; isRunning: boolean }) {
    const bars = 30;
    const barHeights = useMemo(() => {
        return Array.from({ length: bars }, (_, i) => {
            const base = 3 + Math.sin((i / bars) * Math.PI) * 10;
            return [base, base + Math.floor(Math.random() * 18) + 4, base + Math.floor(Math.random() * 11), base + Math.floor(Math.random() * 20), base];
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <div className="flex flex-col items-center">
            {/* Upper bars */}
            <div className="flex items-end gap-[2px]">
                {barHeights.map((heights, i) => (
                    <motion.div key={`u${i}`} className="w-[3px] rounded-t-full"
                        style={{ backgroundColor: accent }}
                        animate={isRunning ? { height: heights.map(h => `${h}px`), opacity: [0.5, 1, 0.6, 0.9, 0.5] } : { height: '3px', opacity: 0.15 }}
                        transition={{ duration: 1.1 + (i % 5) * 0.16, repeat: Infinity, delay: (i % 7) * 0.07, ease: 'easeInOut' }}
                    />
                ))}
            </div>
            {/* Center line */}
            <div style={{ width: '100%', height: '1px', backgroundColor: `${accent}33` }} />
            {/* Lower (mirror) bars */}
            <div className="flex items-start gap-[2px]">
                {barHeights.map((heights, i) => (
                    <motion.div key={`d${i}`} className="w-[3px] rounded-b-full"
                        style={{ backgroundColor: accent }}
                        animate={isRunning ? { height: heights.map(h => `${h * 0.5}px`), opacity: [0.2, 0.45, 0.25, 0.4, 0.2] } : { height: '3px', opacity: 0.07 }}
                        transition={{ duration: 1.1 + (i % 5) * 0.16, repeat: Infinity, delay: (i % 7) * 0.07, ease: 'easeInOut' }}
                    />
                ))}
            </div>
        </div>
    );
}

// ─── Phase helpers ────────────────────────────────────────────────────────────
type Phase = "focus" | "short" | "long";
const PHASE_LABELS: Record<Phase, string> = { focus: "Focus", short: "Short Break", long: "Long Break" };

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StudyCafeOverlay() {
    const {
        activeMode, activeTaskId, tasks, timeLeft, isRunning,
        toggleTimer, completeTask, exitMode,
        pomodoroFocus, pomodoroShortBreak, pomodoroLongBreak, pomodoroCycles,
    } = useStudyStore();

    const [atmoId, setAtmoId] = useState("lofi");
    const [expanded, setExpanded] = useState(true);
    const [phase, setPhase] = useState<Phase>("focus");
    const [cycleCount, setCycleCount] = useState(0);
    const [showExitConfirm, setShowExitConfirm] = useState(false);
    const [showCompleteConfirm, setShowCompleteConfirm] = useState(false);
    const dragControls = useDragControls();
    const constraintsRef = useRef<HTMLDivElement>(null);

    const atmo = ATMOSPHERES.find(a => a.id === atmoId) ?? ATMOSPHERES[0];
    const task = activeTaskId ? tasks.find(t => t.id === activeTaskId) : null;
    const isActive = activeMode === "studyCafe";

    // 1. Add this tick effect so the timer actually moves
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (activeMode === 'studyCafe' && isRunning && timeLeft > 0) {
            interval = setInterval(() => useStudyStore.getState().decrementTimer(), 1000);
        }
        return () => clearInterval(interval);
    }, [activeMode, isRunning, timeLeft]);

    useEffect(() => {
        const anchorStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user && activeMode !== 'none') {
                await supabase.from('profiles')
                    .update({
                        status: activeMode === 'studyCafe' ? 'cafe' : 'flowState',
                        is_in_flowstate: activeMode === 'flowState'
                    })
                    .eq('id', user.id);
            }
        };
        anchorStatus();
    }, [activeMode]);

    // Phase transitions
    const phaseRef = useRef(phase);
    const cycleRef = useRef(cycleCount);
    phaseRef.current = phase;
    cycleRef.current = cycleCount;

    useEffect(() => {
        if (!isActive || timeLeft !== 0) return;
        const currentPhase = phaseRef.current;
        const currentCycle = cycleRef.current;
        if (currentPhase === "focus") {
            const next = currentCycle + 1;
            if (next % pomodoroCycles === 0) {
                setCycleCount(next);
                setPhase("long");
            } else {
                setCycleCount(next);
                setPhase("short");
            }
        } else {
            setPhase("focus");
        }
    }, [timeLeft, isActive, pomodoroCycles]);

    const formatTime = (s: number) =>
        `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

    const phaseTotal = phase === "focus" ? pomodoroFocus * 60 : phase === "short" ? pomodoroShortBreak * 60 : pomodoroLongBreak * 60;
    const progress = Math.max(0, Math.min(100, ((phaseTotal - timeLeft) / phaseTotal) * 100));
    const circumference = 2 * Math.PI * 44;

    const handleComplete = () => {
        setShowCompleteConfirm(true); // Open confirmation instead of immediate exit
    };

    const handleExit = () => {
        setShowExitConfirm(true); // Ensure exit triggers modal
    };

    const confirmComplete = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (task) completeTask(task.id);

        if (user) {
            await supabase.from('profiles')
                .update({ status: 'idle', is_in_flowstate: false })
                .eq('id', user.id);
        }

        useStudyStore.setState({ activeMode: 'none' });
        setShowCompleteConfirm(false);
        exitMode();
    };

    const confirmExit = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        setShowExitConfirm(false);
        document.body.removeAttribute("data-cafe");

        if (user) {
            await supabase.from('profiles')
                .update({ status: 'idle', is_in_flowstate: false })
                .eq('id', user.id);
        }

        useStudyStore.setState({ activeMode: 'none' });
        exitMode();
    };

    // Set/cleanup body attribute for glassmorphism injection
    useEffect(() => {
        if (isActive) {
            document.body.setAttribute("data-cafe", "true");
        }
        return () => {
            document.body.removeAttribute("data-cafe");
        };
    }, [isActive]);

    if (!isActive) return null;

    return (
        <>
            <style>{`
body[data-cafe="true"] {
    /* 🧊 REFINED CRYSTAL: Slightly more "substance" (0.04 vs 0.01) */
    --bg-card: rgba(255, 255, 255, 0.04) !important;
    --bg-dark: rgba(0, 0, 0, 0.2) !important; /* Darker base for better contrast */
    --border-color: rgba(255, 255, 255, 0.15) !important;
    --text-main: #ffffff !important;
}

body[data-cafe="true"] .bg-background-card,
body[data-cafe="true"] section > div,
body[data-cafe="true"] fieldset,
body[data-cafe="true"] .rounded-2xl,
body[data-cafe="true"] .rounded-xl {
    /* 🛡️ THE GLASS LAYER */
    background: linear-gradient(
        135deg, 
        rgba(255, 255, 255, 0.08) 0%, 
        rgba(255, 255, 255, 0.02) 100%
    ) !important;
    backdrop-filter: blur(24px) saturate(1.6) brightness(0.9) !important;
    -webkit-backdrop-filter: blur(24px) saturate(1.6) brightness(0.9) !important;
    
    /* 💎 DOUBLE-EDGED BORDER: Creates a sharp "Crystal" edge */
    border: 1px solid rgba(255, 255, 255, 0.1) !important;
    box-shadow: 
        0 12px 40px rgba(0, 0, 0, 0.4),
        inset 0 0 0 1.5px rgba(255, 255, 255, 0.05) !important;
}

/* 🚪 SIDEBAR GLASS: Slightly more opaque to ground the UI */
body[data-cafe="true"] nav {
    background: rgba(10, 10, 15, 0.4) !important;
    backdrop-filter: blur(30px) !important;
    border-right: 1px solid rgba(255, 255, 255, 0.1) !important;
}
`}</style>

            {/* The Fixed Background Layer */}
            <div
                className="fixed inset-0 pointer-events-none transition-all duration-1000"
                style={{
                    background: atmo.css,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    animation: 'cafe-breathe 12s ease infinite',
                    zIndex: -1
                }}
            />

            {/* 🛡️ THE VISUALIZER FIX: Moved into the background layer (z-index 0) behind the dashboard */}
            {/* 🛡️ THE VISUALIZER FIX: Increased opacity and adjusted positioning */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 1 }}>
                <div
                    className="absolute flex items-center justify-center opacity-80" // Increased from 40%
                    style={{
                        bottom: '25%',
                        left: 'calc(50% + 40px)',
                        transform: 'translateX(-50%)',
                        filter: 'drop-shadow(0 0 12px var(--atmo-glow))' // Uses the theme's accent color
                    }}
                >
                    <CenteredVisualizer accent={atmo.accent} isRunning={isRunning} />
                </div>

                {/* Ambient Glow Blobs */}
                <motion.div
                    animate={{ scale: [1, 1.15, 1], opacity: [0.5, 0.85, 0.5] }}
                    transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                    className="absolute bottom-[-10%] left-[-5%] w-[50vw] h-[50vw] rounded-full blur-[140px]"
                    style={{ backgroundColor: atmo.glow }}
                />
                <motion.div
                    animate={{ scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }}
                    transition={{ duration: 13, repeat: Infinity, ease: "easeInOut", delay: 3 }}
                    className="absolute top-[-10%] right-[-5%] w-[40vw] h-[40vw] rounded-full blur-[120px]"
                    style={{ backgroundColor: atmo.glow }}
                />
            </div>

            {/* ── Constraints container for drag ─── */}
            <div ref={constraintsRef} className="fixed inset-0 pointer-events-none" style={{ zIndex: 8020 }} />

            {/* ═══════════════════════════════════════════════════════════════
                THE CAFÉ COMMAND CENTER — Draggable Pill / Console
            ═══════════════════════════════════════════════════════════════ */}
            <motion.div
                drag
                dragControls={dragControls}
                dragMomentum={false}
                dragConstraints={constraintsRef}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 28 }}
                className="fixed pointer-events-auto select-none"
                style={{
                    zIndex: 8030,
                    bottom: "5rem",
                    left: "50%",
                    translateX: "-50%",
                    x: "-50%",
                }}
            >
                <AnimatePresence mode="wait" initial={false}>
                    {/* ─── MINIMIZED PILL ─── */}
                    {!expanded ? (
                        <motion.div
                            key="pill"
                            initial={{ scale: 0.85, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.85, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            onPointerDown={(e) => dragControls.start(e)}
                            className="flex items-center gap-4 px-5 py-3 rounded-full cursor-grab active:cursor-grabbing"
                            style={{
                                background: "rgba(12,12,14,0.92)",
                                backdropFilter: "blur(24px)",
                                border: `1px solid ${atmo.accent}30`,
                                boxShadow: `0 0 0 1px rgba(255,255,255,0.06), 0 8px 40px rgba(0,0,0,0.7), 0 0 40px ${atmo.glow}`,
                            }}
                        >
                            {/* Glow dot */}
                            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: atmo.accent }} />

                            {/* Timer */}
                            <span className="font-mono font-bold text-xl text-white tracking-widest">{formatTime(timeLeft)}</span>

                            {/* Play/Pause */}
                            <button
                                onClick={toggleTimer}
                                className="w-8 h-8 rounded-full flex items-center justify-center transition-all hover:scale-110"
                                style={{ backgroundColor: `${atmo.accent}20`, color: atmo.accent, border: `1px solid ${atmo.accent}40` }}
                            >
                                {isRunning ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                            </button>

                            {/* Expand */}
                            <button
                                onClick={() => setExpanded(true)}
                                className="text-white/40 hover:text-white/80 transition-colors"
                            >
                                <ChevronUp size={16} />
                            </button>

                            {/* Exit */}
                            <button onClick={handleExit} className="text-white/30 hover:text-red-400 transition-colors">
                                <X size={14} />
                            </button>
                        </motion.div>

                    ) : (
                        <motion.div
                            key="console"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            transition={{ duration: 0.25 }}
                            onPointerDown={(e) => dragControls.start(e)}
                            className="flex rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing relative"
                            style={{
                                background: "rgba(10,10,12,0.92)",
                                backdropFilter: "blur(32px) saturate(1.5)",
                                border: `1px solid rgba(255,255,255,0.09)`,
                                boxShadow: `0 0 0 1px rgba(255,255,255,0.05), 0 16px 60px rgba(0,0,0,0.8), 0 0 60px ${atmo.glow}`,
                                width: "580px",
                            }}
                        >
                            {/* Top accent line */}
                            <div className="absolute top-0 left-0 right-0 h-px"
                                style={{ background: `linear-gradient(90deg, transparent, ${atmo.accent}60, transparent)` }} />

                            {/* ─── LEFT: Track Selector ─── */}
                            <div className="flex flex-col p-4 gap-0.5" style={{ width: "165px", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
                                <p className="text-[9px] font-black tracking-[0.2em] uppercase mb-3" style={{ color: `${atmo.accent}80` }}>
                                    Atmosphere
                                </p>
                                {ATMOSPHERES.map((a) => {
                                    const Icon = a.icon;
                                    const active = a.id === atmoId;
                                    return (
                                        <button
                                            key={a.id}
                                            onClick={() => setAtmoId(a.id)}
                                            className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
                                            style={{
                                                background: active ? `${a.accent}15` : "transparent",
                                                border: active ? `1px solid ${a.accent}35` : "1px solid transparent",
                                                color: active ? a.accent : "rgba(255,255,255,0.4)",
                                            }}
                                        >
                                            {/* Active dot or icon */}
                                            <span className="flex items-center justify-center w-4 h-4 flex-shrink-0">
                                                {active ? (
                                                    <motion.span
                                                        animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
                                                        transition={{ duration: 1.4, repeat: Infinity }}
                                                        className="w-2 h-2 rounded-full block"
                                                        style={{ backgroundColor: a.accent, boxShadow: `0 0 8px ${a.glow}` }}
                                                    />
                                                ) : (
                                                    <Icon size={13} />
                                                )}
                                            </span>
                                            <span className="font-medium text-xs">{a.label}</span>
                                            {/* Animated bars for active */}
                                            {active && (
                                                <span className="ml-auto flex items-end gap-[2px] h-3">
                                                    {[1, 2, 3].map(i => (
                                                        <motion.span
                                                            key={i}
                                                            className="w-[3px] rounded-full"
                                                            style={{ backgroundColor: a.accent }}
                                                            animate={isRunning
                                                                ? { height: ["3px", `${6 + i * 3}px`, "3px"] }
                                                                : { height: "3px" }
                                                            }
                                                            transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                                                        />
                                                    ))}
                                                </span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* ─── CENTER: Timer ─── */}
                            <div className="flex-1 flex flex-col items-center justify-center py-6 px-4 gap-4">
                                {/* Phase Badges */}
                                <div className="flex gap-2">
                                    {(["focus", "short", "long"] as Phase[]).map(p => (
                                        <span
                                            key={p}
                                            className="text-[8px] font-black tracking-[0.18em] uppercase px-2.5 py-1 rounded-full transition-all"
                                            style={phase === p ? {
                                                background: `${atmo.accent}20`,
                                                color: atmo.accent,
                                                border: `1px solid ${atmo.accent}40`,
                                            } : {
                                                color: "rgba(255,255,255,0.2)",
                                                border: "1px solid transparent",
                                            }}
                                        >
                                            {PHASE_LABELS[p]}
                                        </span>
                                    ))}
                                </div>

                                {/* SVG Ring + Timer */}
                                <div className="relative flex items-center justify-center">
                                    <svg width="130" height="130" viewBox="0 0 100 100" className="absolute">
                                        <circle cx="50" cy="50" r="44" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="2" />
                                        <circle
                                            cx="50" cy="50" r="44" fill="none"
                                            stroke={atmo.accent}
                                            strokeWidth="2.5"
                                            strokeLinecap="round"
                                            strokeDasharray={circumference}
                                            strokeDashoffset={circumference * (1 - progress / 100)}
                                            style={{
                                                transform: "rotate(-90deg)",
                                                transformOrigin: "50px 50px",
                                                transition: "stroke-dashoffset 1s linear",
                                                filter: `drop-shadow(0 0 6px ${atmo.accent})`,
                                            }}
                                        />
                                    </svg>
                                    <span
                                        className="font-mono font-bold text-4xl text-white tracking-widest relative"
                                        style={{
                                            textShadow: `0 0 30px ${atmo.accent}60`,
                                        }}
                                    >
                                        {formatTime(timeLeft)}
                                    </span>
                                </div>

                                {/* Controls */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={toggleTimer}
                                        className="w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110"
                                        style={{
                                            background: `${atmo.accent}15`,
                                            border: `1px solid ${atmo.accent}40`,
                                            color: atmo.accent,
                                            boxShadow: isRunning ? `0 0 20px ${atmo.glow}` : "none",
                                        }}
                                    >
                                        {isRunning ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                                    </button>
                                    <button
                                        onClick={() => setPhase(p => p === "focus" ? "short" : "focus")}
                                        className="w-9 h-9 rounded-full flex items-center justify-center transition-all hover:scale-110"
                                        style={{ color: "rgba(255,255,255,0.35)", border: "1px solid rgba(255,255,255,0.08)" }}
                                    >
                                        <SkipForward size={15} />
                                    </button>
                                </div>


                                {/* Cycle Dots */}
                                <div className="flex items-center gap-1.5">
                                    {Array.from({ length: pomodoroCycles }).map((_, i) => (
                                        <div key={i} className="w-1.5 h-1.5 rounded-full transition-all"
                                            style={{ backgroundColor: i < (cycleCount % pomodoroCycles) ? atmo.accent : "rgba(255,255,255,0.15)" }} />
                                    ))}
                                </div>
                            </div>

                            {/* ─── RIGHT: Chapter ─── */}
                            <div className="flex flex-col justify-between p-4" style={{ width: "165px", borderLeft: "1px solid rgba(255,255,255,0.06)" }}>
                                <div>
                                    <p className="text-[9px] font-black tracking-[0.2em] uppercase mb-3" style={{ color: `${atmo.accent}80` }}>
                                        Current Chapter
                                    </p>
                                    {task ? (
                                        <div>
                                            <span className="text-[9px] uppercase tracking-widest font-extrabold mb-2 block"
                                                style={{ color: atmo.accent }}>
                                                {task.load} Load
                                            </span>
                                            <h3 className="text-white font-bold text-sm leading-snug mb-2">{task.title}</h3>
                                            <p className="text-xs text-white/40 line-clamp-3 leading-relaxed">{task.description}</p>
                                        </div>
                                    ) : (
                                        <p className="text-xs text-white/30 italic">Free session — no chapter set.</p>
                                    )}
                                </div>

                                <div className="flex flex-col gap-2 mt-4">
                                    <button
                                        onClick={handleComplete}
                                        className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all hover:scale-[1.02]"
                                        style={{
                                            background: `${atmo.accent}18`,
                                            border: `1px solid ${atmo.accent}40`,
                                            color: atmo.accent,
                                            boxShadow: `0 0 20px ${atmo.glow}`,
                                        }}
                                    >
                                        <CheckCircle2 size={16} />
                                        Complete
                                    </button>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setExpanded(false)}
                                            className="flex-1 flex items-center justify-center py-2 rounded-xl text-xs font-medium transition-colors text-white/30 hover:text-white/60"
                                            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                                        >
                                            <ChevronDown size={14} className="mr-1" /> Minimise
                                        </button>
                                        <button
                                            onClick={handleExit}
                                            className="w-9 h-9 flex items-center justify-center rounded-xl text-white/20 hover:text-red-400 transition-colors"
                                            style={{ border: "1px solid rgba(255,255,255,0.06)" }}
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.div>

            <AnimatePresence>
                {showCompleteConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/80 backdrop-blur-md"
                    >
                        <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-8 max-w-sm text-center shadow-2xl">
                            <div className="w-16 h-16 bg-teal-500/20 text-teal-400 rounded-full flex items-center justify-center mx-auto mb-4">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2">Chapter Complete?</h3>
                            <p className="text-white/40 text-sm mb-6">Ready to log your progress and return to the Lantern Network?</p>
                            <div className="grid grid-cols-2 gap-4">
                                <button onClick={() => setShowCompleteConfirm(false)} className="py-3 rounded-xl border border-white/10 text-white font-bold hover:bg-white/5 transition-colors">Not yet</button>
                                <button onClick={confirmComplete} className="py-3 rounded-xl bg-teal-500 text-black font-bold hover:bg-teal-400 transition-colors">Finish</button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Exit Confirm ─── */}
            <AnimatePresence>
                {showExitConfirm && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 flex items-center justify-center"
                        style={{ zIndex: 9999, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
                    >
                        <motion.div
                            initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
                            className="rounded-3xl p-8 max-w-sm w-full text-center"
                            style={{
                                background: "rgba(12,12,14,0.96)",
                                border: "1px solid rgba(255,255,255,0.1)",
                                boxShadow: `0 0 0 1px rgba(255,255,255,0.05), 0 32px 80px rgba(0,0,0,0.8), 0 0 60px ${atmo.glow}`,
                            }}
                        >
                            <Coffee size={36} className="mx-auto mb-4" style={{ color: atmo.accent }} />
                            <h3 className="text-xl font-bold text-white mb-2">Leave the Café?</h3>
                            <p className="text-white/40 text-sm mb-6">Your flow will be saved. The vibe stops here.</p>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => setShowExitConfirm(false)}
                                    className="py-3 rounded-xl font-bold text-white/70 hover:text-white transition-colors"
                                    style={{ border: "1px solid rgba(255,255,255,0.1)" }}
                                >Stay</button>
                                <button
                                    onClick={confirmExit} // ⚡ FIX: Use the async handoff function instead of inline exitMode
                                    className="py-3 rounded-xl font-bold text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                    style={{ border: "1px solid rgba(239,68,68,0.3)" }}
                                >
                                    Leave
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    );
}