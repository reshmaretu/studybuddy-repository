"use client";

import { Palette } from "lucide-react";
import dynamic from "next/dynamic";

const Excalidraw = dynamic(
    () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
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
                <Excalidraw
                    theme="dark"
                />
            </div>

        </div>
    );
}