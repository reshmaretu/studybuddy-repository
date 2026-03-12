"use client";
import { Tldraw } from 'tldraw';
import 'tldraw/tldraw.css';

export default function ZenCanvas() {
    return (
        <div className="w-full h-full rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-dark)]">
            <Tldraw
                persistenceKey="studybuddy_v2_sanctuary"

                // ⚡ FIX: In the latest v2.x, we hide the Share panel by setting 
                // the specific UI component to null.
                components={{
                    SharePanel: null,
                }}

                onMount={(editor) => {
                    const theme = document.documentElement.getAttribute("data-theme");
                    const isDark = !["light", "sakura", "nordic"].includes(theme || "");

                    // ⚡ FIX: 'isDarkMode' is now 'colorScheme' ('dark' | 'light')
                    editor.user.updateUserPreferences({
                        colorScheme: isDark ? 'dark' : 'light'
                    });
                }}
            />
        </div>
    );
}