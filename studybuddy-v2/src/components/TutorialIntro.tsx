"use client";

import { useStudyStore } from "@/store/useStudyStore";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowRight, Zap, Target, BookOpen, Wind, CheckCircle2, X } from "lucide-react";
import { useState, useEffect } from "react";
import ChumRenderer from "./ChumRenderer";

const STEPS = [
    {
        title: "Welcome to the Sanctuary",
        message: "I am Chum, your digital companion. Together, we will turn your focus into a flourishing garden.",
        icon: <Sparkles className="text-amber-400" size={32} />,
        chumMood: "happy"
    },
    {
        title: "The Garden Blooms",
        message: "Your tasks are 'Blooms'. Drag them to the central altar to complete them and earn Spirit Essence (XP).",
        icon: <Zap className="text-cyan-400" size={32} />,
        chumMood: "focused"
    },
    {
        title: "Crystal Forging",
        message: "Upload your notes or books to 'Forge Crystals'. Use them in Tutor Mode to master any subject with my help.",
        icon: <BookOpen className="text-indigo-400" size={32} />,
        chumMood: "smart"
    },
    {
        title: "Flow & Spirit",
        message: "Stay focused to increase your Focus Score. Level up to unlock new wardrobe items and garden themes.",
        icon: <Wind className="text-teal-400" size={32} />,
        chumMood: "cozy"
    }
];

export default function TutorialIntro() {
    const { hasCompletedTutorial, setCompletedTutorial, displayName } = useStudyStore();
    const [step, setStep] = useState(0);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!hasCompletedTutorial) {
            const timer = setTimeout(() => setIsVisible(true), 1500);
            return () => clearTimeout(timer);
        }
    }, [hasCompletedTutorial]);

    const handleNext = () => {
        if (step < STEPS.length - 1) {
            setStep(step + 1);
        } else {
            handleComplete();
        }
    };

    const handleComplete = () => {
        setIsVisible(false);
        setTimeout(() => setCompletedTutorial(true), 500);
    };

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />

            <motion.div
                initial={{ scale: 0.8, opacity: 0, rotate: -2 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                className="relative w-full max-w-xl bg-(--bg-card) border border-(--border-color) rounded-[40px] shadow-[0_0_50px_rgba(45,212,191,0.2)] overflow-hidden flex flex-col p-8 md:p-12 items-center text-center"
            >
                <button 
                    onClick={handleComplete}
                    className="absolute top-6 right-6 p-2 text-(--text-muted) hover:text-(--text-main) transition-colors"
                >
                    <X size={20} />
                </button>

                {/* ANIMATED CHUM */}
                <div className="relative w-32 h-32 mb-8">
                    <div className="absolute inset-0 bg-(--accent-teal)/10 rounded-full blur-2xl animate-pulse" />
                    <ChumRenderer size="w-24 h-24 scale-[1.8] translate-y-4" />
                </div>

                <AnimatePresence mode="wait">
                    <motion.div
                        key={step}
                        initial={{ x: 20, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -20, opacity: 0 }}
                        className="flex flex-col items-center gap-4"
                    >
                        <div className="p-4 rounded-3xl bg-(--bg-sidebar) border border-(--border-color) shadow-inner mb-2">
                            {STEPS[step].icon}
                        </div>
                        <h2 className="text-2xl md:text-3xl font-black text-(--text-main) tracking-tight">
                            {STEPS[step].title}
                        </h2>
                        <p className="text-base md:text-lg text-(--text-muted) leading-relaxed max-w-sm">
                            {step === 0 ? `Hello, ${displayName}! ` : ''}{STEPS[step].message}
                        </p>
                    </motion.div>
                </AnimatePresence>

                {/* PROGRESS DOTS */}
                <div className="flex gap-2 mt-10 mb-8">
                    {STEPS.map((_, i) => (
                        <div 
                            key={i} 
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-(--accent-teal)' : 'w-2 bg-(--border-color)'}`} 
                        />
                    ))}
                </div>

                {/* ACTIONS */}
                <div className="flex w-full gap-4">
                    <button 
                        onClick={handleComplete}
                        className="flex-1 py-4 text-xs font-black uppercase tracking-widest text-(--text-muted) hover:text-(--text-main) transition-colors"
                    >
                        Skip Intro
                    </button>
                    <button 
                        onClick={handleNext}
                        className="flex-[2] py-4 bg-(--accent-teal) text-black rounded-2xl text-sm font-black uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:scale-105 transition-all shadow-xl shadow-(--accent-teal)/20"
                    >
                        {step === STEPS.length - 1 ? "Enter Sanctuary" : "Next Phase"}
                        <ArrowRight size={18} />
                    </button>
                </div>

                {/* EXTRAVAGANT DECORATIONS */}
                <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-(--accent-teal)/5 blur-3xl rounded-full" />
                <div className="absolute -top-20 -right-20 w-40 h-40 bg-(--accent-yellow)/5 blur-3xl rounded-full" />
            </motion.div>
        </div>
    );
}
