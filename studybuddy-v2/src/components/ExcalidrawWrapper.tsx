"use client";

import { useState, useEffect } from "react";

// Excalidraw must be imported lazily on client only
let ExcalidrawComponent: any = null;

export default function ExcalidrawWrapper() {
    const [Excalidraw, setExcalidraw] = useState<any>(null);

    useEffect(() => {
        import("@excalidraw/excalidraw").then((mod) => {
            setExcalidraw(() => mod.Excalidraw);
        });
    }, []);

    if (!Excalidraw) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-[var(--bg-dark)] text-[var(--text-muted)]">
                <div className="w-8 h-8 border-4 border-[var(--accent-teal)] border-t-transparent rounded-full animate-spin mb-4"></div>
                <p className="font-bold tracking-widest uppercase text-sm mt-2">Unrolling Canvas...</p>
            </div>
        );
    }

    return <Excalidraw theme="dark" />;
}
