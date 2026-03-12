"use client";

import { Palette } from "lucide-react";
import dynamic from "next/dynamic";

// ⚡ STEP 1: Import the new tldraw wrapper
const TldrawWrapper = dynamic(
    () => import("@/components/ZenCanvas"),
    {
        ssr: false,
        loading: () => <div className="h-full w-full bg-[var(--bg-dark)] animate-pulse rounded-[32px]" />
    }
);

export default function ZenCanvas() {
    return (
        /* Outer container fills the viewport minus header height */
        <div className="h-[calc(100vh-100px)] flex flex-col space-y-4 overflow-hidden">

            <header className="shrink-0">
                <h1 className="text-3xl font-black text-[var(--text-main)] flex items-center gap-3">
                    <Palette className="text-[var(--accent-teal)]" size={32} />
                    Zen Canvas
                </h1>
                <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em] mt-2">
                    Doodle, map your mind, and let your thoughts flow freely.
                </p>
            </header>

            {/* ⚡ THE CONTAINER: Keep your rounded borders and shadow */}
            <div className="flex-1 min-h-0 rounded-[32px] overflow-hidden border border-[var(--border-color)] bg-background-card shadow-sm relative z-10">
                <div className="absolute inset-0">
                    <TldrawWrapper />
                </div>
            </div>
        </div>
    );
}