"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useStudyStore } from "@/store/useStudyStore";

export function useGlobalSync() {
    const { activeMode, activeTaskId, isTutorModeActive } = useStudyStore();

    useEffect(() => {
        const updatePresence = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // ⚡ Determine Status based on Dashboard State
            let status = 'idle';
            let sessionType = 'NONE';
            let inFlow = false;

            if (isTutorModeActive) {
                status = 'mastering';
                sessionType = 'AI_TUTOR';
            } else if (activeMode === 'flowState') {
                status = 'flowstate';
                inFlow = true;
            } else if (activeMode === 'studyCafe') {
                status = 'cafe';
            }

            // Update Profiles Table
            await supabase.from('profiles').update({
                status: status,
                is_in_flowstate: inFlow,
                active_session_type: sessionType,
                current_task_id: activeTaskId
            }).eq('id', user.id);
        };

        updatePresence();

        // 🛑 Cleanup on Exit or Tab Close
        return () => {
            const clearPresence = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('profiles').update({
                        status: 'offline',
                        is_in_flowstate: false,
                        active_session_type: 'NONE'
                    }).eq('id', user.id);
                }
            };
            clearPresence();
        };
    }, [activeMode, activeTaskId, isTutorModeActive]);
}