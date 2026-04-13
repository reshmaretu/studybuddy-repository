"use client";

import { useState, useEffect } from "react";
import StudyCanvas from "@/components/canvas/StudyCanvas";
import CanvasToolbar from "@/components/canvas/CanvasToolbar";
import { useCanvasStore } from "@/store/useCanvasStore";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export const dynamic = "force-dynamic";

export default function CanvasPage() {
    const { getSnapshot, loadFromSnapshot } = useCanvasStore();
    const [isSaving, setIsSaving] = useState(false);

    // ☁️ LOAD FROM CLOUD ON MOUNT
    useEffect(() => {
        const loadCanvas = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('whiteboards')
                .select('snapshot_data')
                .eq('user_id', user.id)
                .single();

            if (data?.snapshot_data) {
                loadFromSnapshot(data.snapshot_data);
            }
        };
        loadCanvas();
    }, []);

    // 💾 SAVE TO CLOUD
    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const snapshot = getSnapshot();
            const { error } = await supabase
                .from('whiteboards')
                .upsert({
                    user_id: user.id,
                    snapshot_data: snapshot,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            toast.success("Sanctuary Blueprint Stashed!");
        } catch (error) {
            console.error(error);
            toast.error("Sync Failed");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div id="canvas-spirit-board" className="h-[calc(100vh-100px)] flex flex-col relative overflow-hidden">
            <CanvasToolbar onSave={handleSave} isSaving={isSaving} />
            <StudyCanvas />
        </div>
    );
}