"use client";

import { useState, useEffect } from "react";
import { Save, Cloud, CloudOff } from "lucide-react";
import dynamic from "next/dynamic";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// ⚡ THE SHIELD: This dynamically imports the actual Tldraw component
// only when the code is running in a browser (ssr: false).
const TldrawComponent = dynamic(
    () => import("@tldraw/tldraw").then((mod) => mod.Tldraw),
    {
        ssr: false,
        loading: () => <div className="h-full w-full bg-[var(--bg-dark)] animate-pulse" />
    }
);

export default function ZenCanvas() {
    const [app, setApp] = useState<any>(null);
    const [autoSaveCloud, setAutoSaveCloud] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!app) return;
        setIsSaving(true);

        try {
            // v1.29.0 uses app.document for the full whiteboard state
            const snapshot = app.document;

            const { error } = await supabase
                .from('whiteboards')
                .upsert({
                    // user_id is the primary key in our SQL schema
                    user_id: (await supabase.auth.getUser()).data.user?.id,
                    snapshot_data: snapshot,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            toast.success("Sanctuary synced to cloud.");
        } catch (error) {
            console.error("Sync Error:", error);
            toast.error("Failed to sync to cloud.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div style={{ position: "absolute", inset: 0 }}>
            {/* 🎨 Floating Sanctuary UI */}
            <div className="absolute top-4 right-4 z-[100] flex items-center gap-2 ...">
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="absolute bottom-6 right-6 z-[100] bg-[var(--accent-teal)] hover:opacity-90 text-white px-4 py-2 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
                >
                    {isSaving ? "SYNCING..." : "SYNC TO CLOUD"}
                </button>
            </div>

            <TldrawComponent
                id="studybuddy-zen-canvas-v1"
                showMenu={false}
                onMount={(appInstance: any) => setApp(appInstance)}
            />
        </div>
    );
}
