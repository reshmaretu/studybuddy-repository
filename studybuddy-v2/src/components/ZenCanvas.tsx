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
    const [isSaving, setIsSaving] = useState(false);

    // Initialize state from localStorage
    const [autoSaveCloud, setAutoSaveCloud] = useState(() => {
        if (typeof window !== 'undefined') {
            return localStorage.getItem('zen_cloud_sync') === 'true';
        }
        return false;
    });

    // Update localStorage when it changes
    useEffect(() => {
        localStorage.setItem('zen_cloud_sync', autoSaveCloud.toString());
    }, [autoSaveCloud]);

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

    useEffect(() => {
        // Only run if cloud sync is enabled and the app is ready
        if (!autoSaveCloud || !app) return;

        const autoSaveInterval = setInterval(() => {
            handleSave();
        }, 30000); // Auto-save every 30 seconds

        return () => clearInterval(autoSaveInterval);
    }, [autoSaveCloud, app]);

    return (
        <div style={{ position: "absolute", inset: 0 }}>
            {/* 🎨 Floating Sanctuary UI */}
            {/* 🎨 Zen Controls: High-Contrast Crystal */}
            <div className="absolute top-4 right-4 z-[200] flex items-center gap-2 bg-white/5 backdrop-blur-2xl p-1.5 rounded-2xl border border-white/10 shadow-2xl">
                <button
                    onClick={() => setAutoSaveCloud(!autoSaveCloud)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all text-[10px] font-black uppercase tracking-tighter ${autoSaveCloud
                            ? 'bg-teal-400 text-black shadow-[0_0_20px_rgba(45,212,191,0.4)]'
                            : 'bg-white/10 text-white/60 hover:text-white'
                        }`}
                >
                    {autoSaveCloud ? <Cloud size={14} /> : <CloudOff size={14} />}
                    {autoSaveCloud ? "SYNCING" : "LOCAL"}
                </button>

                <button
                    onClick={handleSave}
                    disabled={isSaving || autoSaveCloud}
                    className="px-4 py-1.5 bg-white text-black rounded-xl hover:scale-105 transition-all text-[10px] font-black uppercase tracking-widest disabled:opacity-30"
                >
                    {isSaving ? "STASHING..." : "SAVE SNAPSHOT"}
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
