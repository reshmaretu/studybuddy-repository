"use client";

import { useState, useEffect } from "react";

const LoadingCanvas = () => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--bg-dark)] text-[var(--text-muted)] rounded-2xl border border-[var(--border-color)]">
        <div className="w-8 h-8 border-4 border-[var(--accent-teal)] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="font-black tracking-widest uppercase text-[10px] mt-2">Unrolling Canvas...</p>
    </div>
);

export default function ExcalidrawWrapper() {
    const [Excalidraw, setExcalidraw] = useState<any>(null);
    // ⚡ Detect current theme
    const [currentTheme, setCurrentTheme] = useState<"dark" | "light">("dark");

    useEffect(() => {
        const theme = document.documentElement.getAttribute("data-theme");
        setCurrentTheme(theme === "light" || theme === "sakura" ? "light" : "dark");

        import("@excalidraw/excalidraw").then((mod) => {
            setExcalidraw(() => mod.Excalidraw);
        });
    }, []);

    if (!Excalidraw) return <LoadingCanvas />;

    return (
        /* ⚡ FIX: Ensure 100% height and dynamic theme */
        <div className="w-full h-[calc(100vh-200px)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
            <Excalidraw theme={currentTheme} />
        </div>
    );
}