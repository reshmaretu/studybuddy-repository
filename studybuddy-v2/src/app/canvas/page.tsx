"use client";

import { Palette } from "lucide-react";
import dynamic from "next/dynamic";

const ExcalidrawWrapper = dynamic(
    () => import("@/components/ExcalidrawWrapper"),
    { ssr: false }
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
                <ExcalidrawWrapper />
            </div>

        </div>
    );
}