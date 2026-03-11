"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useStudyStore } from "@/store/useStudyStore";
import { usePathname } from "next/navigation";

export default function PresenceSync() {
    const pathname = usePathname();
    const { activeMode, isTutorModeActive } = useStudyStore();
    const userIdRef = useRef<string | null>(null);
    const channelRef = useRef<any>(null);

    const isInRoom = pathname.startsWith('/room/');
    // 🛑 EMBARGO: If any of these are active, this component stays SILENT
    const isSpecialMode = isInRoom || activeMode === 'flowState' || activeMode === 'studyCafe';

    // ⚡ Match exactly with LanternNetwork STATUS_CONFIG
    const currentStatus = isTutorModeActive ? 'mastering' : (activeMode === 'none' ? 'idle' : (activeMode === 'studyCafe' ? 'cafe' : activeMode));

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) userIdRef.current = user.id;
        };
        init();
    }, []);

    useEffect(() => {
        const handleTabClose = async () => {
            // Only set offline if we aren't in a specialized mode that handles its own cleanup
            if (!userIdRef.current || isSpecialMode) return;

            await supabase.from('profiles').update({
                status: 'offline',
                is_in_flowstate: false,
                active_session_type: null
            }).eq('id', userIdRef.current);
        };

        window.addEventListener('beforeunload', handleTabClose);
        return () => window.removeEventListener('beforeunload', handleTabClose);
    }, [isSpecialMode]);

    useEffect(() => {
        if (!userIdRef.current || isSpecialMode) return;

        const syncStatus = async () => {
            // 🛡️ Guard: Check if a Room/Mode component already took control of the DB
            const { data: profile } = await supabase.from('profiles').select('status').eq('id', userIdRef.current).single();
            const protectedStatuses = ['hosting', 'drafting', 'flowState', 'cafe'];
            if (protectedStatuses.includes(profile?.status)) return;

            await supabase.from('profiles')
                .update({
                    status: currentStatus,
                    is_in_flowstate: currentStatus === 'flowState',
                    active_session_type: currentStatus === 'mastering' ? 'AI_TUTOR' : null,
                    last_seen: new Date().toISOString()
                })
                .eq('id', userIdRef.current);
        };

        syncStatus();

        const heartbeat = setInterval(() => {
            if (channelRef.current && userIdRef.current) {
                channelRef.current.track({ user_id: userIdRef.current, status: currentStatus });
            }
        }, 30000);

        return () => clearInterval(heartbeat);
    }, [currentStatus, isSpecialMode]);

    return null;
}