"use client";

import { Tldraw } from "@tldraw/tldraw";
import { useState } from "react";
import { supabase } from "@/lib/supabase"; // Ensure your client is exported here
import { toast } from "sonner"; // Or your preferred notification tool

export default function ZenCanvas() {
    const [app, setApp] = useState<any>(null);
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
        <div className="relative h-full w-full">
            <Tldraw
                // 'id' triggers the IndexedDB local persistence automatically
                id="studybuddy_sanctuary"
                onMount={(inst) => setApp(inst)}
                showMenu={false}
            />

            <button
                onClick={handleSave}
                disabled={isSaving}
                className="absolute bottom-6 right-6 z-[100] bg-[var(--accent-teal)] hover:opacity-90 text-white px-4 py-2 rounded-xl font-bold shadow-lg transition-all disabled:opacity-50"
            >
                {isSaving ? "SYNCING..." : "SYNC TO CLOUD"}
            </button>
        </div>
    );
}