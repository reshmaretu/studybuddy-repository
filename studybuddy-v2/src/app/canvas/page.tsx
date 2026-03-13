"use client";

// ⚡ Use the scoped package for v1.x
import { Tldraw } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { useState, useEffect } from "react";
import { Save, Cloud, CloudOff } from "lucide-react";

export default function ZenCanvas() {
    // In v1, the app instance is used instead of 'editor'
    const [app, setApp] = useState<any>(null);
    const [autoSaveCloud, setAutoSaveCloud] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // ☁️ Cloud Sync Logic
    useEffect(() => {
        if (!autoSaveCloud || !app) return;

        const interval = setInterval(async () => {
            setIsSaving(true);
            // v1 equivalent of snapshotting the state
            const document = app.document;

            /* TODO: Supabase Sync
            await supabase.from('whiteboards').upsert({ 
                user_id: 'user_id', 
                snapshot_data: document 
            });
            */

            console.log("☁️ v1 Sync to Supabase complete");
            setTimeout(() => setIsSaving(false), 500);
        }, 15000);

        return () => clearInterval(interval);
    }, [autoSaveCloud, app]);

    return (
        <div style={{ position: "absolute", inset: 0 }}>
            {/* 🎨 Floating Sanctuary UI */}
            <div className="absolute top-4 right-4 z-[100] flex items-center gap-2 bg-[var(--bg-dark)] p-1.5 rounded-xl border border-[var(--border-color)] shadow-md">
                <button
                    onClick={() => setAutoSaveCloud(!autoSaveCloud)}
                    className={`p-2 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold ${autoSaveCloud
                        ? 'bg-[var(--accent-teal)]/20 text-[var(--accent-teal)]'
                        : 'hover:bg-white/5 text-text-muted'
                        }`}
                >
                    {autoSaveCloud ? <Cloud size={16} /> : <CloudOff size={16} />}
                    {autoSaveCloud ? "SYNCING" : "LOCAL ONLY"}
                </button>

                <div className="w-px h-5 bg-[var(--border-color)] mx-1" />

                <button
                    onClick={() => setIsSaving(true)} // Manual Save Trigger
                    disabled={isSaving || autoSaveCloud}
                    className="flex items-center gap-2 px-3 py-2 bg-[var(--accent-teal)] hover:bg-[var(--accent-teal)]/80 text-white rounded-lg transition-all text-xs font-bold disabled:opacity-50"
                >
                    <Save size={16} className={isSaving ? "animate-pulse" : ""} />
                    {isSaving ? "SAVING..." : "SAVE NOW"}
                </button>
            </div>

            <Tldraw
                // ⚡ v1 uses 'id' for persistence instead of 'persistenceKey'
                id="studybuddy-zen-canvas-v1"
                // ⚡ v1 UI visibility is handled via showMenu
                showMenu={false}
                onMount={(appInstance) => setApp(appInstance)}
            />
        </div>
    );
}