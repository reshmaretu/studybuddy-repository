"use client";

import { Tldraw, Editor } from "tldraw";
import "tldraw/tldraw.css";
import { useState, useEffect } from "react";

export default function TldrawWrapper() {
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setIsClient(true);
    }, []);

    // ⚡ THE HYDRATION KILL-SWITCH: 
    // This ensures the server sends an empty div, and the heavy 
    // tldraw engine ONLY loads once the browser is active.
    if (!isClient) {
        return <div className="h-full w-full bg-[var(--bg-dark)] opacity-0" />;
    }

    const handleMount = (editor: Editor) => {
        // 🤫 Mute the license warnings for the school demo
        const originalLog = console.log;
        console.log = (...args) => {
            if (typeof args[0] === 'string' && (args[0].includes('------------------') || args[0].toLowerCase().includes('license'))) {
                return;
            }
            originalLog(...args);
        };

        // 🎨 Theme Logic
        const theme = document.documentElement.getAttribute("data-theme");
        const isDark = !["light", "sakura", "nordic"].includes(theme || "");
        editor.user.updateUserPreferences({
            colorScheme: isDark ? "dark" : "light"
        });
    };

    return (
        <div className="h-full w-full">
            <Tldraw
                persistenceKey="studybuddy_v2_sanctuary"
                // This stops tldraw from trying to connect to their paid sync servers
                components={{
                    SharePanel: null,
                }}
                onMount={handleMount}
            />
        </div>
    );
}