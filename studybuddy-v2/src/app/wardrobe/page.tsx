"use client";

import { useEffect, useState } from "react";
import { Lock, CheckCircle2, Palette, Shirt, Sparkles, Gem } from "lucide-react";
import { useStudyStore } from "@/store/useStudyStore";
import { motion, AnimatePresence } from "framer-motion";

// --- THE CRYSTAL CATALOG ---
const CRYSTAL_CATALOG = {
    // 🟢 STARTER
    quartz: { name: "Clear Quartz", unlockLevel: 1, isPremium: false, color: "#e0f8ff", emissive: "#8cd8f5" },
    aquamarine: { name: "Aquamarine", unlockLevel: 1, isPremium: false, color: "#ecfeff", emissive: "#06b6d4" },

    // 🔵 PROGRESSION
    rose_quartz: { name: "Rose Quartz", unlockLevel: 3, isPremium: false, color: "#fdf2f8", emissive: "#f43f5e" },
    amethyst: { name: "Amethyst", unlockLevel: 5, isPremium: false, color: "#f3e8ff", emissive: "#c084fc" },
    citrine: { name: "Citrine", unlockLevel: 8, isPremium: false, color: "#fefce8", emissive: "#eab308" },
    emerald: { name: "Emerald", unlockLevel: 10, isPremium: false, color: "#ecfdf5", emissive: "#34d399" },
    sapphire: { name: "Deep Sapphire", unlockLevel: 15, isPremium: false, color: "#eff6ff", emissive: "#3b82f6" },
    morganite: { name: "Morganite", unlockLevel: 18, isPremium: false, color: "#fdf2f8", emissive: "#f472b6" },
    celestine: { name: "Celestine", unlockLevel: 20, isPremium: false, color: "#f0f9ff", emissive: "#7dd3fc" },
    jade: { name: "Meadow Jade", unlockLevel: 22, isPremium: false, color: "#f0fdf4", emissive: "#4ade80" },
    sunstone: { name: "Sunstone", unlockLevel: 28, isPremium: false, color: "#fff7ed", emissive: "#ea580c" },
    obsidian: { name: "Void Obsidian", unlockLevel: 30, isPremium: false, color: "#1f2937", emissive: "#6b21a8" },
    lapis: { name: "Lapis Lazuli", unlockLevel: 35, isPremium: false, color: "#1e3a8a", emissive: "#fbbf24" },
    carnelian: { name: "Carnelian", unlockLevel: 40, isPremium: false, color: "#fef2f2", emissive: "#dc2626" },
    malachite: { name: "Malachite", unlockLevel: 45, isPremium: false, color: "#064e3b", emissive: "#10b981" },

    // 🟡 PREMIUM
    ruby: { name: "Crimson Ruby", unlockLevel: 1, isPremium: true, color: "#fff1f2", emissive: "#fb7185" },
    topaz: { name: "Imperial Topaz", unlockLevel: 1, isPremium: true, color: "#fff7ed", emissive: "#f97316" },
    moonstone: { name: "Lunar Moonstone", unlockLevel: 1, isPremium: true, color: "#f8fafc", emissive: "#94a3b8" },
    opal: { name: "Iridescent Opal", unlockLevel: 1, isPremium: true, color: "#f8fafc", emissive: "#14b8a6" },
    onyx: { name: "Blood Onyx", unlockLevel: 1, isPremium: true, color: "#111827", emissive: "#dc2626" },
    fluorite: { name: "Neon Fluorite", unlockLevel: 1, isPremium: true, color: "#fdf4ff", emissive: "#d946ef" },
    bismuth: { name: "Bismuth", unlockLevel: 1, isPremium: true, color: "#312e81", emissive: "#ec4899" },
};

export default function WardrobePage() {
    // UI Tabs State
    const [activeTab, setActiveTab] = useState<'themes' | 'crystals'>('themes');
    const [shakeTarget, setShakeTarget] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(true);

    // Store State
    const { isPremiumUser, checkPremiumStatus, level, activeCrystalTheme, setActiveCrystalTheme, activeAtmosphereFilter, setActiveAtmosphereFilter } = useStudyStore(); const [activeAppTheme, setActiveAppTheme] = useState("deep-teal");

    useEffect(() => {
        const initWardrobe = async () => {
            setIsSyncing(true);
            const savedTheme = localStorage.getItem("appTheme") || "deep-teal";
            setActiveAppTheme(savedTheme);
            await checkPremiumStatus();
            setIsSyncing(false);
        };
        initWardrobe();
    }, [checkPremiumStatus]);

    const handleAppThemeChange = (themeId: string, isPremium: boolean) => {
        if (isPremium && !isPremiumUser) {
            setShakeTarget(themeId);
            setTimeout(() => setShakeTarget(null), 400);
            return;
        }
        setActiveAppTheme(themeId);
        localStorage.setItem("appTheme", themeId);
        document.documentElement.setAttribute("data-theme", themeId);
    };

    const handleCrystalChange = (crystalId: string, crystal: any) => {
        if (crystal.isPremium && !isPremiumUser) {
            setShakeTarget(crystalId);
            setTimeout(() => setShakeTarget(null), 400);
            return;
        }
        if (level < crystal.unlockLevel) {
            setShakeTarget(crystalId);
            setTimeout(() => setShakeTarget(null), 400);
            return;
        }
        // Save to store!
        if (setActiveCrystalTheme) setActiveCrystalTheme(crystalId);
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

    // Filtered Crystals
    const starterCrystals = Object.entries(CRYSTAL_CATALOG).filter(([_, c]) => !c.isPremium && c.unlockLevel === 1);
    const progressionCrystals = Object.entries(CRYSTAL_CATALOG).filter(([_, c]) => !c.isPremium && c.unlockLevel > 1).sort((a, b) => a[1].unlockLevel - b[1].unlockLevel);
    const premiumCrystals = Object.entries(CRYSTAL_CATALOG).filter(([_, c]) => c.isPremium);

    return (
        <div className="flex flex-col h-screen p-6 lg:p-10 bg-[var(--bg-dark)] overflow-hidden">
            <header className="mb-8 shrink-0">
                <h1 className="text-3xl font-black text-[var(--text-main)] flex items-center gap-3">
                    <Shirt className="text-[var(--accent-teal)]" size={32} /> The Wardrobe
                </h1>
                <p className="text-[var(--text-muted)] text-sm font-bold uppercase tracking-widest mt-2">
                    Personalize your presence & sanctuary
                </p>
            </header>

            <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 min-h-0">

                {/* LEFT PANEL: Character Preview */}
                <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-8 flex flex-col items-center justify-between relative overflow-hidden shadow-sm">
                    <div className="absolute top-6 left-8">
                        <span className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-[0.2em]">Character Preview</span>
                    </div>

                    <div className="flex-1 flex items-center justify-center w-full">
                        <div className="relative w-64 h-64 bg-[var(--bg-dark)]/30 rounded-full border border-[var(--border-color)] flex items-center justify-center shadow-inner">
                            <span className="text-8xl drop-shadow-2xl">👻</span>
                        </div>
                    </div>

                    <div className="w-full grid grid-cols-3 gap-3">
                        {['Base', 'Outfit', 'Head'].map(label => (
                            <button key={label} className="py-2.5 bg-[var(--bg-dark)]/50 border border-[var(--border-color)] rounded-xl text-[10px] font-black uppercase text-[var(--text-muted)] hover:border-[var(--accent-teal)] hover:text-[var(--accent-teal)] transition-all">
                                {label}
                            </button>
                        ))}
                    </div>
                </section>

                {/* RIGHT PANEL: Customization Hub */}
                <section className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl flex flex-col min-h-0 shadow-sm overflow-hidden">

                    {/* TABS HEADER */}
                    <div className="flex p-2 border-b border-[var(--border-color)]/50 bg-[var(--bg-dark)]/30">
                        <button
                            onClick={() => setActiveTab('themes')}
                            className={`flex-1 py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'themes' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-sidebar)] border border-transparent'}`}
                        >
                            <Palette size={14} className={activeTab === 'themes' ? 'text-[var(--accent-cyan)]' : ''} /> App Themes
                        </button>
                        <button
                            onClick={() => setActiveTab('crystals')}
                            className={`flex-1 py-3 px-4 rounded-xl text-[11px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${activeTab === 'crystals' ? 'bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-sidebar)] border border-transparent'}`}
                        >
                            <Gem size={14} className={activeTab === 'crystals' ? 'text-[var(--accent-teal)]' : ''} /> Crystal Vault
                        </button>
                    </div>

                    {/* TAB CONTENT */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar no-scrollbar relative">
                        <AnimatePresence mode="wait">

                            {/* APP THEMES TAB */}
                            {activeTab === 'themes' && (
                                <motion.div key="themes" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="space-y-8">
                                    <div>
                                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4 block">Standard Aesthetics</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {freeThemes.map((theme) => (
                                                <ThemeButton key={theme.id} theme={theme} isActive={activeAppTheme === theme.id} onClick={() => handleAppThemeChange(theme.id, false)} />
                                            ))}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Premium Collection</label>
                                            {!isPremiumUser && !isSyncing && <Sparkles size={12} className="text-[var(--accent-yellow)]" />}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {premiumThemes.map((theme) => (
                                                <ThemeButton key={theme.id} theme={theme} isActive={activeAppTheme === theme.id} isLocked={!isPremiumUser} isShaking={shakeTarget === theme.id} onClick={() => handleAppThemeChange(theme.id, true)} />
                                            ))}
                                        </div>
                                    </div>
                                    {/* NEW: GARDEN ATMOSPHERE FILTERS */}
                                    <div>
                                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4 block">Garden Atmosphere</label>
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {[
                                                { id: 'default', name: 'Dawn Mist' },
                                                { id: 'dark', name: 'Midnight Void' },
                                                { id: 'refreshing', name: 'Mint Breeze' },
                                                { id: 'cool', name: 'Glacial Chill' }
                                            ].map((filter) => (
                                                <button
                                                    key={filter.id}
                                                    onClick={() => setActiveAtmosphereFilter(filter.id as any)}
                                                    className={`py-3 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest transition-all ${activeAtmosphereFilter === filter.id ? 'border-[var(--accent-teal)] bg-[var(--bg-dark)] text-[var(--accent-teal)] shadow-[0_0_10px_rgba(20,184,166,0.15)]' : 'border-[var(--border-color)] bg-[var(--bg-sidebar)]/50 text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-[var(--bg-sidebar)]'}`}
                                                >
                                                    {filter.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <hr className="border-[var(--border-color)]/30" />
                                </motion.div>
                            )}

                            {/* CRYSTAL VAULT TAB */}
                            {activeTab === 'crystals' && (
                                <motion.div key="crystals" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="space-y-8">

                                    <div>
                                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4 block">Starter Seeds</label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {starterCrystals.map(([id, crystal]) => (
                                                <CrystalButton key={id} crystal={crystal} isActive={activeCrystalTheme === id} onClick={() => handleCrystalChange(id, crystal)} />
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-4 block flex items-center gap-2">Ascension Unlocks <span className="bg-[var(--accent-teal)]/20 text-[var(--accent-teal)] px-2 py-0.5 rounded-full text-[8px]">LVL {level}</span></label>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {progressionCrystals.map(([id, crystal]) => (
                                                <CrystalButton key={id} crystal={crystal} isActive={activeCrystalTheme === id} isLocked={level < crystal.unlockLevel} isShaking={shakeTarget === id} onClick={() => handleCrystalChange(id, crystal)} />
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <label className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest">Pro Collection</label>
                                            {!isPremiumUser && !isSyncing && <Sparkles size={12} className="text-[var(--accent-yellow)]" />}
                                        </div>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            {premiumCrystals.map(([id, crystal]) => (
                                                <CrystalButton key={id} crystal={crystal} isActive={activeCrystalTheme === id} isLocked={!isPremiumUser} isShaking={shakeTarget === id} onClick={() => handleCrystalChange(id, crystal)} />
                                            ))}
                                        </div>
                                    </div>

                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </section>
            </div>
        </div>
    );
}

// 🎨 Helper Component for App Themes
function ThemeButton({ theme, isActive, isLocked, isShaking, onClick }: any) {
    return (
        <button onClick={onClick} className={`group relative flex items-center p-4 rounded-2xl border-2 transition-all duration-200 ${isShaking ? 'animate-premium-shake border-red-500' : isActive ? 'border-[var(--accent-teal)] bg-[var(--bg-dark)] shadow-lg' : 'border-[var(--border-color)] bg-[var(--bg-sidebar)]/50 hover:bg-[var(--bg-sidebar)]'} ${isLocked && !isActive ? 'opacity-60 hover:opacity-100' : ''}`}>
            <div className="w-8 h-8 rounded-full mr-3 border border-[var(--border-color)] shadow-sm shrink-0" style={{ background: `linear-gradient(135deg, ${theme.color1} 50%, ${theme.color2} 50%)` }} />
            <span className="font-bold text-xs text-[var(--text-main)] flex-1 text-left">{theme.name}</span>
            {isActive ? <CheckCircle2 className="text-[var(--accent-teal)] w-4 h-4 shrink-0" /> : isLocked && <Lock size={12} className="text-[var(--text-muted)] shrink-0" />}
        </button>
    );
}

// 💎 Helper Component for Crystals
function CrystalButton({ crystal, isActive, isLocked, isShaking, onClick }: any) {
    return (
        <button onClick={onClick} className={`group relative flex items-center p-4 rounded-2xl border-2 transition-all duration-200 ${isShaking ? 'animate-premium-shake border-red-500' : isActive ? 'border-[var(--accent-teal)] bg-[var(--bg-dark)] shadow-[0_0_15px_rgba(20,184,166,0.15)]' : 'border-[var(--border-color)] bg-[var(--bg-sidebar)]/50 hover:bg-[var(--bg-sidebar)]'} ${isLocked && !isActive ? 'opacity-60 hover:opacity-100' : ''}`}>
            {/* Glowing Gem Preview */}
            <div className="w-8 h-8 rounded-lg mr-3 shadow-inner shrink-0 relative overflow-hidden" style={{ backgroundColor: crystal.color, border: `1px solid ${crystal.emissive}50` }}>
                <div className="absolute inset-0 opacity-50 blur-md" style={{ backgroundColor: crystal.emissive }}></div>
                {/* Facet illusion */}
                <div className="absolute top-0 left-0 right-0 h-1/2 bg-white/30 skew-y-12 translate-y-[-50%]"></div>
            </div>

            <div className="flex-1 text-left flex flex-col">
                <span className="font-bold text-xs text-[var(--text-main)]">{crystal.name}</span>
                {isLocked && !crystal.isPremium && (
                    <span className="text-[9px] text-[var(--text-muted)] font-black tracking-widest uppercase">Unlocks Lvl {crystal.unlockLevel}</span>
                )}
                {isLocked && crystal.isPremium && (
                    <span className="text-[9px] text-[var(--accent-yellow)] font-black tracking-widest uppercase">Pro Exclusive</span>
                )}
            </div>

            {isActive ? <CheckCircle2 className="text-[var(--accent-teal)] w-4 h-4 shrink-0" /> : isLocked && <Lock size={12} className="text-[var(--text-muted)] shrink-0" />}
        </button>
    );
}