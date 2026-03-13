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

    useEffect(() => {
        const loadFromCloud = async () => {
            if (!app) return;

            try {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const { data, error } = await supabase
                    .from('whiteboards')
                    .select('snapshot_data')
                    .eq('user_id', user.id)
                    .single();

                if (error && error.code !== 'PGRST116') throw error; // PGRST116 means no data found

                if (data?.snapshot_data) {
                    // v1.29.0 specific method to load the document
                    app.loadDocument(data.snapshot_data);
                    toast.success("Welcome back to your Sanctuary.");
                }
            } catch (error) {
                console.error("Load Error:", error);
                toast.error("Could not retrieve cloud data.");
            }
        };

        loadFromCloud();
    }, [app]);

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
                    onClick={() => setAutoSaveCloud(!autoSaveCloud)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest ${autoSaveCloud
                        ? 'bg-[var(--accent-teal)] text-white shadow-lg shadow-teal-500/20'
                        : 'bg-white/5 text-text-muted hover:bg-white/10'
                        }`}
                >
                    {autoSaveCloud ? <Cloud size={14} /> : <CloudOff size={14} />}
                    {autoSaveCloud ? "Cloud Sync: ON" : "Local Only"}
                </button>

                <button
                    onClick={handleSave}
                    disabled={isSaving || autoSaveCloud}
                    className="flex items-center gap-2 px-4 py-2 bg-[var(--text-main)] text-[var(--bg-dark)] rounded-xl hover:scale-105 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-30"
                >
                    <Save size={14} className={isSaving ? "animate-spin" : ""} />
                    {isSaving ? "Syncing..." : "Save Snapshot"}
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
