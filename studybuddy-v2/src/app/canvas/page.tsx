"use client";

// 1. ALL imports must be at the very top!
import { Palette } from "lucide-react";
import dynamic from "next/dynamic";
import "@tldraw/tldraw/tldraw.css";

// 2. We dynamically import the named 'Tldraw' component so it doesn't crash SSR
const Tldraw = dynamic(
    () => import("@tldraw/tldraw").then((mod) => mod.Tldraw),
    {
        ssr: false,
        loading: () => (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--bg-dark)] text-[var(--text-muted)]">
                <div className="w-8 h-8 border-4 border-[var(--accent-teal)] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-bold tracking-widest uppercase text-sm mt-2">Unrolling Canvas...</p>
            </div>
        )
    }
);

export default function ZenCanvas() {
    return (
        // calc(100vh - 4rem) ensures the canvas fills exactly the remaining screen height
        <div className="h-[calc(100vh-4rem)] flex flex-col space-y-4">

            {/* HEADER */}
            <header>
                <h1 className="text-3xl font-bold text-[var(--text-main)] flex items-center gap-3">
                    <Palette className="text-[var(--accent-teal)]" size={32} />
                    Zen Canvas
                </h1>
                <p className="text-[var(--text-muted)] mt-1">
                    Doodle, map your mind, and let your thoughts flow freely.
                </p>
            </header>

            {/* THE WHITEBOARD CONTAINER */}
            <div className="flex-1 rounded-2xl overflow-hidden border border-[var(--border-color)] shadow-sm relative z-0">

                {/* Tldraw Engine: 
          - persistenceKey: Automatically saves your entire mindmap to local storage!
          - inferDarkMode: Makes the canvas dark to match StudyBuddy's vibe.
        */}
                <Tldraw
                    persistenceKey="studybuddy-zen-canvas-v1"
                    inferDarkMode={true}
                />

            </div>

        </div>
    );
}