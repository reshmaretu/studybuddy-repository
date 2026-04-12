"use client";

import { useStudyStore } from "@/store/useStudyStore";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Zap, Target, BookOpen, Wind, CheckCircle2, X, Globe, User } from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import ChumRenderer from "./ChumRenderer";

const STEPS = [
    {
        title: "Welcome to the Sanctuary",
        message: "I am Chum, your digital companion. Together, we will turn your focus into a flourishing garden.",
        icon: <Sparkles className="text-amber-400" size={32} />,
        path: "/dashboard",
        selector: "h1" // Welcome header
    },
    {
        title: "Garden Blooms",
        message: "Your tasks are 'Blooms'. Drag them to the central altar (Check icon) to complete them and earn Spirit Essence.",
        icon: <CheckCircle2 className="text-emerald-400" size={32} />,
        path: "/dashboard",
        selector: "#garden-blooms-area" 
    },
    {
        title: "Crystal Forging",
        message: "Step into the Crystal Forge to upload your notes. I will forge them into knowledge crystals for us to study.",
        icon: <BookOpen className="text-indigo-400" size={32} />,
        path: "/garden",
        selector: "#garden-main-zone" 
    },
    {
        title: "The Lantern Void",
        message: "Synchronize with other Guardians in the Lantern. Host rooms or join existing flows across the network.",
        icon: <Globe className="text-cyan-400" size={32} />,
        path: "/lantern",
        selector: "canvas"
    },
    {
        title: "Your Identity",
        message: "Customize your presence, check your rewards, and synchronize your shards across the cloud here.",
        icon: <User className="text-fuchsia-400" size={32} />,
        path: "/account",
        selector: "main"
    }
];

export default function TutorialIntro() {
    const { hasCompletedTutorial, setCompletedTutorial, displayName } = useStudyStore();
    const [step, setStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);
    const router = useRouter();
    const pathname = usePathname();
    const [spotlight, setSpotlight] = useState({ x: 0, y: 0, w: 0, h: 0, opacity: 0 });

    useEffect(() => {
        if (!hasCompletedTutorial) {
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [hasCompletedTutorial]);

    // Update spotlight when step or pathname changes
    useEffect(() => {
        if (!isVisible) return;
        
        const currentStep = STEPS[step];
        if (pathname !== currentStep.path) {
            router.push(currentStep.path);
            // Give time for layout to shift
            setTimeout(updateSpotlight, 800);
        } else {
            updateSpotlight();
        }
    }, [step, pathname, isVisible]);

    const updateSpotlight = () => {
        const selector = STEPS[step].selector;
        const el = document.querySelector(selector);
        if (el) {
            const rect = el.getBoundingClientRect();
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
    };

    const handleNext = () => {
        if (step < STEPS.length - 1) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        setIsVisible(false);
        setTimeout(() => {
            setCompletedTutorial(true);
            router.push("/dashboard");
        }, 500);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[200] pointer-events-none">
            {/* DIMMED OVERLAY WITH MASK */}
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-sm pointer-events-auto"
                style={{
                    clipPath: spotlight.opacity > 0 
                        ? `polygon(0% 0%, 0% 100%, ${spotlight.x}px 100%, ${spotlight.x}px ${spotlight.y}px, ${spotlight.x + spotlight.w}px ${spotlight.y}px, ${spotlight.x + spotlight.w}px ${spotlight.y + spotlight.h}px, ${spotlight.x}px ${spotlight.y + spotlight.h}px, ${spotlight.x}px 100%, 100% 100%, 100% 0%)`
                        : 'none'
                }}
            />

            <div className="absolute inset-0 flex items-center justify-center p-4">
                <motion.div
                    initial={{ scale: 0.8, opacity: 0, y: 40 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    className="relative w-full max-w-lg bg-(--bg-card) border-2 border-(--accent-teal) rounded-[40px] shadow-[0_0_80px_rgba(45,212,191,0.3)] overflow-hidden flex flex-col p-8 md:p-10 items-center text-center pointer-events-auto"
                >
                    <button 
                        onClick={handleComplete}
                        className="absolute top-6 right-6 p-2 text-(--text-muted) hover:text-(--text-main) transition-colors"
                    >
                        <X size={20} />
                    </button>

                    {/* ANIMATED CHUM */}
                    <div className="relative w-24 h-24 mb-6">
                        <div className="absolute inset-0 bg-(--accent-teal)/10 rounded-full blur-2xl animate-pulse" />
                        <ChumRenderer size="w-20 h-20 scale-[1.8] translate-y-4" />
                    </div>

                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            className="flex flex-col items-center gap-3"
                        >
                            <div className="p-3 rounded-2xl bg-(--bg-sidebar) border border-(--border-color) shadow-inner mb-1">
                                {STEPS[step].icon}
                            </div>
                            <h2 className="text-xl md:text-2xl font-black text-(--text-main) tracking-tight">
                                {STEPS[step].title}
                            </h2>
                            <p className="text-sm md:text-base text-(--text-muted) leading-relaxed">
                                {STEPS[step].message}
                            </p>
                        </motion.div>
                    </AnimatePresence>

                    {/* PROGRESS DOTS */}
                    <div className="flex gap-1.5 mt-8 mb-6">
                        {STEPS.map((_, i) => (
                            <div 
                                key={i} 
                                className={`h-1 rounded-full transition-all duration-300 ${i === step ? 'w-6 bg-(--accent-teal)' : 'w-1.5 bg-(--border-color)'}`} 
                            />
                        ))}
                    </div>

                    {/* ACTIONS */}
                    <div className="flex w-full gap-3">
                        <button 
                            onClick={handleComplete}
                            className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-(--text-muted) hover:text-(--text-main) transition-colors"
                        >
                            Skip
                        </button>
                        <button 
                            onClick={handleNext}
                            className="flex-[2] py-3.5 bg-(--accent-teal) text-black rounded-2xl text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-xl shadow-(--accent-teal)/30"
                        >
                            {step === STEPS.length - 1 ? "Start Journey" : "Next Phase"}
                            <ArrowRight size={16} />
                        </button>
                    </div>
                </motion.div>
            </div>
            
            {/* Visual Spotlight Border Helper */}
            {spotlight.opacity > 0 && (
                <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute border-2 border-(--accent-teal) rounded-xl shadow-[0_0_20px_var(--accent-teal)] pointer-events-none"
                    style={{
                        left: spotlight.x - 4,
                        top: spotlight.y - 4,
                        width: spotlight.w + 8,
                        height: spotlight.h + 8,
                    }}
                />
            )}
        </div>
    );
}
