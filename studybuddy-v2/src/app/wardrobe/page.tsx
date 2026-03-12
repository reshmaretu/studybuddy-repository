"use client";

import { useEffect, useState } from "react";
import { Lock, CheckCircle2, Palette, Shirt, Sparkles } from "lucide-react";
import { useStudyStore } from "@/store/useStudyStore";
import { motion, AnimatePresence } from "framer-motion";

export default function WardrobePage() {
    const [activeTheme, setActiveTheme] = useState("deep-teal");
    const [shakeTarget, setShakeTarget] = useState<string | null>(null);
    const { isPremiumUser, checkPremiumStatus } = useStudyStore();

    useEffect(() => {
        const savedTheme = localStorage.getItem("appTheme") || "deep-teal";
        setActiveTheme(savedTheme);
        checkPremiumStatus(); // Ensure store is synced with Supabase
    }, []);

    const handleThemeChange = (themeId: string, isPremium: boolean) => {
        if (isPremium && !isPremiumUser) {
            setShakeTarget(themeId);
            setTimeout(() => setShakeTarget(null), 400);
            return;
        }

        setActiveTheme(themeId);
        localStorage.setItem("appTheme", themeId);
        document.documentElement.setAttribute("data-theme", themeId);
    };

    const freeThemes = [
        { id: "deep-teal", name: "Deep Teal", color1: "#101918", color2: "#2dd4bf" },
        { id: "dark-forest", name: "Dark Forest", color1: "#1a1a1a", color2: "#8fc1b5" },
        { id: "light", name: "Light Mode", color1: "#f8fafc", color2: "#3b82f6" },
    ];

    const premiumThemes = [
        { id: "sakura", name: "Sakura Sanctuary", color1: "#2a2125", color2: "#ff8fb8" },
        { id: "academia", name: "Dark Academia", color1: "#1e1b18", color2: "#d4af37" },
        { id: "lofi", name: "Lofi Sunset", color1: "#171026", color2: "#f472b6" },
        { id: "nordic", name: "Nordic Frost", color1: "#e2e8f0", color2: "#0284c7" },
        { id: "e-ink", name: "E-Ink (Obsidian)", color1: "#000000", color2: "#ffffff" },
    ];

    return (
        <div className="flex flex-col h-screen p-6 lg:p-10 bg-background-dark overflow-hidden">
            <header className="mb-8 shrink-0">
                <h1 className="text-3xl font-black text-text-main flex items-center gap-3">
                    <Shirt className="text-accent-teal" size={32} /> The Wardrobe
                </h1>
                <p className="text-text-muted text-sm font-bold uppercase tracking-widest mt-2">
                    Personalize your presence & sanctuary
                </p>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">

                To align the Wardrobe widgets with your Dashboard, we need to move away from the current hardcoded rounded-[40px] containers and utilize the precise design tokens seen in your Dashboard screenshot.

                Your Dashboard uses rounded-3xl for widgets, rounded-xl for buttons, and specific background transparency layers.

                🛠️ The Fix: Dashboard-Aligned Wardrobe Page
                Replace the section blocks in your WardrobePage with this updated styling to achieve a 1:1 match with your Dashboard widgets.

                TypeScript

                /* --- Updated Left Section: Character Preview --- */
                <section className="bg-background-card border border-border rounded-3xl p-8 flex flex-col items-center justify-between relative overflow-hidden shadow-sm">
                    <div className="absolute top-6 left-8">
                        <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Character Preview</span>
                    </div>

                    {/* Use the Dashboard's inner-glow circle style */}
                    <div className="flex-1 flex items-center justify-center w-full">
                        <div className="relative w-64 h-64 bg-background-dark/30 rounded-full border border-border flex items-center justify-center shadow-inner">
                            {/* 👻 Your LayeredChum will sit here */}
                            <span className="text-8xl drop-shadow-2xl">👻</span>
                        </div>
                    </div>

                    {/* Bottom buttons updated to match Dashboard secondary button style */}
                    <div className="w-full grid grid-cols-3 gap-3">
                        {['Base', 'Outfit', 'Head'].map(label => (
                            <button key={label} className="py-2.5 bg-background-dark/50 border border-border rounded-xl text-[10px] font-black uppercase text-text-muted hover:border-accent-teal hover:text-accent-teal transition-all">
                                {label}
                            </button>
                        ))}
                    </div>
                </section>

/* --- Updated Right Sectio n: Atmosphere Selection --- */
                <section className="bg-background-card border border-border rounded-3xl flex flex-col min-h-0 shadow-sm">
                    <div className="p-6 border-b border-border/50">
                        <h3 className="text-[11px] font-black text-text-main uppercase tracking-widest flex items-center gap-2">
                            <Palette size={14} className="text-accent-cyan" /> Sanctuary Atmosphere
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar no-scrollbar">
                        {/* Free Tier */}
                        <div>
                            <label className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-4 block">Standard Aesthetics</label>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {freeThemes.map((theme) => (
                                    <ThemeButton
                                        key={theme.id}
                                        theme={theme}
                                        isActive={activeTheme === theme.id}
                                        onClick={() => handleThemeChange(theme.id, false)}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Premium Tier */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <label className="text-[10px] font-black text-text-muted uppercase tracking-widest">Premium Collection</label>
                                {!isPremiumUser && <Sparkles size={12} className="text-accent-yellow" />}
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {premiumThemes.map((theme) => (
                                    <ThemeButton
                                        key={theme.id}
                                        theme={theme}
                                        isActive={activeTheme === theme.id}
                                        isLocked={!isPremiumUser}
                                        isShaking={shakeTarget === theme.id}
                                        onClick={() => handleThemeChange(theme.id, true)}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

// 🎨 Helper Component for Theme Buttons
function ThemeButton({ theme, isActive, isLocked, isShaking, onClick }: any) {
    return (
        <button
            onClick={onClick}
            className={`group relative flex items-center p-4 rounded-2xl border-2 transition-all duration-200 ${isShaking ? 'animate-premium-shake border-red-500' :
                isActive ? 'border-accent-teal bg-background-dark shadow-lg' :
                    'border-border bg-background-sidebar/50 hover:bg-background-sidebar'
                } ${isLocked && !isActive ? 'opacity-60' : ''}`}
        >
            <div
                className="w-8 h-8 rounded-full mr-3 border border-border shadow-sm shrink-0"
                style={{ background: `linear-gradient(135deg, ${theme.color1} 50%, ${theme.color2} 50%)` }}
            />
            <span className="font-bold text-xs text-text-main flex-1 text-left">{theme.name}</span>
            {isActive ? <CheckCircle2 className="text-accent-teal w-4 h-4" /> : isLocked && <Lock size={12} className="text-text-muted" />}
        </button>
    );
}