"use client";

import { useStudyStore } from "@/store/useStudyStore";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Zap, Target, BookOpen, Wind, CheckCircle2, X, Globe, User, MessageSquare, Shirt, Database, Calendar, Palette, Coffee, PlayCircle, Hammer, Layout, Trophy, ShieldCheck, Cpu, Brain } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import ChumRenderer from "./ChumRenderer";

const STEPS = [
    // DASHBOARD
    {
        title: "Welcome",
        message: "I'm Chum! I'll help you turn focus into a flourishing garden.",
        icon: <Sparkles className="text-amber-400" size={24} />,
        path: "/dashboard",
        selector: "h1" 
    },
    {
        title: "Daily Blooms",
        message: "Your active tasks. Drag them to the altar to earn Spirit Essence.",
        icon: <CheckCircle2 className="text-emerald-400" size={24} />,
        path: "/dashboard",
        selector: "#garden-blooms-area" 
    },
    {
        title: "Focus Engine",
        message: "Toggle between Pomodoro or FlowState focus protocols here.",
        icon: <Zap className="text-amber-500" size={24} />,
        path: "/dashboard",
        selector: "#dashboard-timer-core" 
    },
    {
        title: "Brain Reset",
        message: "Feeling cluttered? Use the Brain Reset to clear focus debt and restart your flow.",
        icon: <Brain className="text-cyan-400" size={24} />,
        path: "/dashboard",
        selector: "#dashboard-brain-reset",
        flash: true
    },

    // GARDEN
    {
        title: "The Garden",
        message: "Configure your task frameworks (GTD, 1-3-5) in the Garden Zone.",
        icon: <Layout className="text-indigo-400" size={24} />,
        path: "/garden",
        selector: "#garden-framework-zone" 
    },
    {
        title: "Synthesizer",
        message: "Watch this living 3D Crystal grow as you master your goals.",
        icon: <Target className="text-amber-400" size={24} />,
        path: "/garden",
        selector: "#garden-crystal-visual" 
    },
    {
        title: "Mastery Hall",
        message: "Mastered tasks are archived here as permanent knowledge shards.",
        icon: <BookOpen className="text-emerald-400" size={24} />,
        path: "/garden",
        selector: "#garden-mastery-col" 
    },

    // ARCHIVE
    {
        title: "Seed Shard",
        message: "We've pre-uploaded a 'Seed Shard' to get you started.",
        icon: <Sparkles className="text-amber-400" size={24} />,
        path: "/archive",
        selector: "#archive-demo-shard"
    },
    {
        title: "Shard Vault",
        message: "Your Shard Vault holds all extracted wisdom and insights.",
        icon: <Database className="text-purple-400" size={24} />,
        path: "/archive",
        selector: "#archive-shard-vault"
    },
    {
        title: "The Forge",
        message: "Use the Forge to extract new shards from your research.",
        icon: <Hammer className="text-yellow-500" size={24} />,
        path: "/archive",
        selector: "#archive-forge-trigger"
    },

    // WARDROBE
    {
        title: "Aesthetics",
        message: "Switch between Base, Atmosphere, and Accessory protocols.",
        icon: <Palette className="text-pink-400" size={24} />,
        path: "/wardrobe",
        selector: "#wardrobe-customization-hub"
    },
    {
        title: "Vessel",
        message: "Preview your companion's current aesthetic and attire.",
        icon: <Shirt className="text-indigo-400" size={24} />,
        path: "/wardrobe",
        selector: "#wardrobe-avatar-preview"
    },

    // CALENDAR
    {
        title: "Temporal Nexus",
        message: "The Nexus Forecast displays your upcoming daily blooms.",
        icon: <Calendar className="text-blue-400" size={24} />,
        path: "/calendar",
        selector: "#calendar-nexus-anchor"
    },
    {
        title: "Seed Bank",
        message: "Unscheduled tasks are stashed here for future planting.",
        icon: <Database className="text-emerald-400" size={24} />,
        path: "/calendar",
        selector: "#calendar-seed-bank"
    },
    {
        title: "View Modes",
        message: "Toggle between Forecast and Month views as needed.",
        icon: <Layout className="text-amber-400" size={24} />,
        path: "/calendar",
        selector: "#calendar-view-toggle"
    },

    // LANTERN
    {
        title: "Lantern Net",
        message: "Visualize the global network of active focus lanterns.",
        icon: <Globe className="text-cyan-400" size={24} />,
        path: "/lantern",
        selector: "#lantern-map-anchor"
    },
    {
        title: "Hall of Focus",
        message: "The leaderboard tracks the network's top contributors.",
        icon: <Trophy className="text-yellow-500" size={24} />,
        path: "/lantern",
        selector: "#lantern-leaderboard"
    },
    {
        title: "Broadcast",
        message: "Host your own study sanctuary for the net to join.",
        icon: <Zap className="text-amber-400" size={24} />,
        path: "/lantern",
        selector: "#lantern-host-trigger"
    },

    // ACCOUNT
    {
        title: "Identity",
        message: "Manage your garden identity and system credentials.",
        icon: <User className="text-fuchsia-400" size={24} />,
        path: "/account",
        selector: "#account-identity-module"
    },
    {
        title: "Validation",
        message: "Ensure your Neural Link is verified for full access.",
        icon: <ShieldCheck className="text-emerald-400" size={24} />,
        path: "/account",
        selector: "#account-security-vault"
    },
    {
        title: "Optimization",
        message: "Sync 3D performance to your specific hardware profile.",
        icon: <Cpu className="text-amber-400" size={24} />,
        path: "/account",
        selector: "#account-environmental-sync"
    }
];

export default function TutorialIntro() {
    const { hasCompletedTutorial, setCompletedTutorial } = useStudyStore();
    const [step, setStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const [spotlight, setSpotlight] = useState({ x: 0, y: 0, w: 0, h: 0, opacity: 0 });

    // Handle Tutorial Visibility and Reset
    useEffect(() => {
        if (!hasCompletedTutorial) {
            setStep(0);
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        } else {
            setIsVisible(false);
        }
    }, [hasCompletedTutorial]);

    useEffect(() => {
        if (!isVisible) return;
        
        const currentStep = STEPS[step];
        const normalizedPath = pathname.endsWith('/') ? pathname.slice(0, -1) : pathname;
        // Clean up current and target paths for comparison
        const tPath = currentStep.path.replace(/\/$/, '') || '/dashboard';
        const nPath = normalizedPath || '/dashboard';

        if (nPath !== tPath) {
            setIsTransitioning(true);
            router.push(currentStep.path);
            
            // Poll for the element to appear and HAVE SIZE
            let attempts = 0;
            const poll = setInterval(() => {
                const el = document.querySelector(currentStep.selector);
                const rect = el?.getBoundingClientRect();
                
                if ((el && rect && rect.width > 20) || attempts > 50) { // More robust size check
                    clearInterval(poll);
                    // Critical buffer for 3D canvases to finish frame-init
                    setTimeout(() => {
                        updateSpotlight();
                        setIsTransitioning(false);
                    }, 500); 
                }
                attempts++;
            }, 100);

            return () => clearInterval(poll);
        } else {
            updateSpotlight();
            setIsTransitioning(false);
        }
    }, [step, pathname, isVisible]);

    const updateSpotlight = () => {
        const selector = STEPS[step].selector;
        const el = document.querySelector(selector);
        if (el) {
            // Scroll into view
            el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
            
            setTimeout(() => {
                const rect = el.getBoundingClientRect();
                if (rect.width > 0) {
                    setSpotlight({
                        x: rect.left,
                        y: rect.top,
                        w: rect.width,
                        h: rect.height,
                        opacity: 1
                    });
                } else {
                    setSpotlight(prev => ({ ...prev, opacity: 0 }));
                }
            }, 700); 
        } else {
            setSpotlight(prev => ({ ...prev, opacity: 0 }));
        }
    };

    const handleNext = () => {
        if (isTransitioning) return;
        if (step < STEPS.length - 1) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        setIsVisible(false);
        setCompletedTutorial(true);
        router.push("/dashboard");
    };

    if (!isVisible) return null;

    const currentStep = STEPS[step];
    const isTopHalf = spotlight.opacity > 0 && (spotlight.y + spotlight.h / 2) < (typeof window !== 'undefined' ? window.innerHeight / 2 : 500);
    const isLeftHalf = spotlight.opacity > 0 && (spotlight.x + spotlight.w / 2) < (typeof window !== 'undefined' ? window.innerWidth / 2 : 800);

    return (
        <div className="fixed inset-0 z-[200] pointer-events-none">
            {/* DIMMED OVERLAY WITH MASK - CLICK TO PROCEED */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                onClick={handleNext}
                className="absolute inset-0 bg-black/85 backdrop-blur-sm pointer-events-auto cursor-pointer"
                style={{
                    clipPath: spotlight.opacity > 0 
                        ? `polygon(0% 0%, 0% 100%, ${spotlight.x}px 100%, ${spotlight.x}px ${spotlight.y}px, ${spotlight.x + spotlight.w}px ${spotlight.y}px, ${spotlight.x + spotlight.w}px ${spotlight.y + spotlight.h}px, ${spotlight.x}px ${spotlight.y + spotlight.h}px, ${spotlight.x}px 100%, 100% 100%, 100% 0%)`
                        : 'none'
                }}
            />

            <div className={`absolute inset-0 flex p-4 md:p-12 transition-all duration-700 items-center justify-center ${
                spotlight.opacity === 0 || isTransitioning ? 'items-center justify-center' : isTopHalf ? 'items-end' : 'items-start'
            } ${
                spotlight.opacity === 0 || isTransitioning ? '' : isLeftHalf ? 'justify-end' : 'justify-start'
            }`}>
                
                {/* TUTORIAL BUBBLE */}
                <motion.div
                    layout
                    initial={{ opacity: 0, scale: 0.5, y: 100 }} 
                    animate={{ opacity: isTransitioning ? 0 : 1, scale: isTransitioning ? 0.9 : 1, y: isTransitioning ? 20 : 0 }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="relative w-full max-w-[280px] bg-[var(--bg-card)]/95 backdrop-blur-2xl border-2 border-[var(--border-color)] p-5 rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.8)] pointer-events-auto flex flex-col"
                >
                    {/* CHUM AVATAR */}
                    <div className="absolute -top-10 -left-6 w-20 h-20 pointer-events-none">
                        <div className="absolute inset-0 bg-(--accent-teal)/10 rounded-full blur-2xl animate-pulse" />
                        <ChumRenderer size="w-16 h-16 scale-[1.8] translate-y-4" />
                    </div>

                    <div className="flex justify-between items-start mb-3 ml-12">
                        <h2 className="text-lg font-black text-(--text-main) tracking-tight">
                            {STEPS[step].title}
                        </h2>
                        <button 
                            onClick={handleComplete}
                            className="p-1 text-(--text-muted) hover:text-(--text-main) transition-colors"
                        >
                            <X size={16} />
                        </button>
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ x: 10, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -10, opacity: 0 }}
                            className="flex flex-col"
                        >
                            <div className="flex items-start gap-3 mb-2">
                                <div className="p-2 rounded-lg bg-(--bg-sidebar) border border-(--border-color) text-(--text-main) shrink-0">
                                    {STEPS[step].icon}
                                </div>
                                <p className="text-xs text-(--text-muted) leading-relaxed font-bold">
                                    {STEPS[step].message}
                                </p>
                            </div>
                        </motion.div>
                    </AnimatePresence>

                    {/* PROGRESS & ACTIONS */}
                    <div className="flex items-center justify-between mt-4">
                        <div className="flex gap-1 overflow-hidden max-w-[120px]">
                            {STEPS.map((_, i) => (
                                <div 
                                    key={i} 
                                    className={`h-0.5 rounded-full transition-all duration-300 shrink-0 ${i === step ? 'w-4 bg-(--accent-teal)' : 'w-1 bg-(--border-color)'}`} 
                                />
                            ))}
                        </div>
                        <button 
                            onClick={handleNext}
                            className="bg-(--accent-teal) text-black rounded-xl px-4 py-2 text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-lg"
                        >
                            {step === STEPS.length - 1 ? "End" : "Next"}
                        </button>
                    </div>

                    <div className={`absolute w-4 h-4 rotate-45 border-2 z-[-1] -bottom-2 ${isLeftHalf ? 'left-8' : 'right-8'} bg-[var(--bg-card)] border-[var(--border-color)]`}
                         style={{ clipPath: 'polygon(100% 100%, 100% 0, 0 100%)' }} 
                    />
                </motion.div>
            </div>
            
            {/* Visual Spotlight Border Helper */}
            {spotlight.opacity > 0 && !isTransitioning && (
                <div 
                    className="absolute pointer-events-none"
                    style={{
                        left: spotlight.x - 4,
                        top: spotlight.y - 4,
                        width: spotlight.w + 8,
                        height: spotlight.h + 8,
                    }}
                >
                    <motion.div 
                        layoutId="spotlight-border"
                        className={`w-full h-full rounded-xl border-2 ${currentStep.flash ? 'border-(--accent-yellow) shadow-[0_0_50px_rgba(250,204,21,1)]' : 'border-(--accent-teal) shadow-[0_0_30px_rgba(45,212,191,0.5)]'}`}
                    >
                        {currentStep.flash && (
                            <motion.div 
                                animate={{ opacity: [0.3, 1, 0.3], scale: [1, 1.05, 1] }}
                                transition={{ repeat: Infinity, duration: 1 }}
                                className="absolute inset-[-8px] border-4 border-(--accent-yellow) rounded-[20px] blur-sm"
                            />
                        )}
                    </motion.div>
                </div>
            )}
        </div>
    );
}
