"use client";

import { useEffect, useState } from "react";
import { Lock, CheckCircle2 } from "lucide-react";

export default function AccountPage() {
    const [activeTheme, setActiveTheme] = useState("deep-teal");
    const isPremiumUser = false; // We will connect this to Supabase later!

    // Load the saved theme when the page opens
    useEffect(() => {
        const savedTheme = localStorage.getItem("appTheme") || "deep-teal";
        setActiveTheme(savedTheme);
    }, []);

    // Function to switch the theme instantly
    const handleThemeChange = (themeId: string, isPremium: boolean) => {
        if (isPremium && !isPremiumUser) {
            alert("This is a Premium theme! Upgrade to unlock.");
            return;
        }

        // Update State, LocalStorage, and HTML attribute
        setActiveTheme(themeId);
        localStorage.setItem("appTheme", themeId);
        document.documentElement.setAttribute("data-theme", themeId);
    };

    const freeThemes = [
        { id: "deep-teal", name: "Deep Teal", color1: "#101918", color2: "#14b8a6" },
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
        <div className="max-w-4xl">
            <header className="mb-8">
                <h1 className="text-3xl font-bold text-[var(--text-main)] mb-2">Account & Appearance</h1>
                <p className="text-[var(--text-muted)]">Customize your StudyBuddy sanctuary.</p>
            </header>

            {/* FREE THEMES SECTION */}
            <section className="mb-10">
                <h2 className="text-xl font-semibold mb-4 text-[var(--text-main)]">Free Aesthetics</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {freeThemes.map((theme) => (
                        <button
                            key={theme.id}
                            onClick={() => handleThemeChange(theme.id, false)}
                            className={`relative flex items-center p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${activeTheme === theme.id
                                    ? "border-[var(--accent-teal)] bg-[var(--bg-card)]"
                                    : "border-[var(--border-color)] bg-[var(--bg-sidebar)] opacity-80"
                                }`}
                        >
                            <div
                                className="w-10 h-10 rounded-full mr-4 border border-[var(--border-color)] shadow-md flex-shrink-0"
                                style={{ background: `linear-gradient(135deg, ${theme.color1} 50%, ${theme.color2} 50%)` }}
                            />
                            <span className="font-medium text-[var(--text-main)] text-left flex-1">{theme.name}</span>
                            {activeTheme === theme.id && <CheckCircle2 className="text-[var(--accent-teal)] w-5 h-5 ml-2" />}
                        </button>
                    ))}
                </div>
            </section>

            {/* PREMIUM THEMES SECTION */}
            <section>
                <div className="flex items-center gap-3 mb-4">
                    <h2 className="text-xl font-semibold text-[var(--text-main)]">Premium Aesthetics</h2>
                    {!isPremiumUser && (
                        <span className="bg-[var(--accent-yellow)] text-black text-xs font-bold px-2 py-1 rounded flex items-center gap-1 uppercase tracking-wide">
                            <Lock size={12} /> Pro
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {premiumThemes.map((theme) => (
                        <button
                            key={theme.id}
                            onClick={() => handleThemeChange(theme.id, true)}
                            className={`relative flex items-center p-4 rounded-xl border-2 transition-all duration-200 hover:scale-105 ${activeTheme === theme.id
                                    ? "border-[var(--accent-yellow)] bg-[var(--bg-card)]"
                                    : "border-[var(--border-color)] bg-[var(--bg-sidebar)] opacity-60 hover:opacity-100"
                                }`}
                        >
                            <div
                                className="w-10 h-10 rounded-full mr-4 border border-[var(--border-color)] shadow-md flex-shrink-0"
                                style={{ background: `linear-gradient(135deg, ${theme.color1} 50%, ${theme.color2} 50%)` }}
                            />
                            <span className="font-medium text-[var(--text-main)] text-left flex-1">{theme.name}</span>
                            {!isPremiumUser && <Lock className="text-[var(--text-muted)] w-4 h-4 ml-2" />}
                            {activeTheme === theme.id && isPremiumUser && <CheckCircle2 className="text-[var(--accent-yellow)] w-5 h-5 ml-2" />}
                        </button>
                    ))}
                </div>
            </section>
        </div>
    );
}