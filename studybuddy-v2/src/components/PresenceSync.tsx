"use client";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useStudyStore } from "@/store/useStudyStore";
import { usePathname } from "next/navigation";

export default function PresenceSync() {
    const pathname = usePathname();
    const { activeMode, isTutorModeActive } = useStudyStore();
    const userIdRef = useRef<string | null>(null);
    const channelRef = useRef<any>(null);

    const isInRoom = pathname.includes('/room/');
    // ⚡ INSTANT STATUS DERIVATION
    const currentStatus = isTutorModeActive ? 'mastering' : (activeMode === 'none' ? 'idle' : activeMode);

    useEffect(() => {
        const handleTabClose = async () => {
            if (!userIdRef.current || isInRoom) return; // ⚡ DON'T set offline if in a room (room cleanup handles this)

            await supabase.from('profiles').update({
                status: 'offline',
                is_in_flowstate: false,
                active_session_type: null
            }).eq('id', userIdRef.current);
        };

        window.addEventListener('beforeunload', handleTabClose);
        return () => window.removeEventListener('beforeunload', handleTabClose);
    }, [isInRoom]); // ⚡ Listen to room status to toggle listener behavior

    // ⚡ SYNC ON EVERY STATUS CHANGE
    useEffect(() => {
        if (!userIdRef.current || isInRoom) return; // 🛑 HARD EXIT: If in room, this component is totally silent

        const syncStatus = async () => {
            // 🛡️ DOUBLE CHECK: One final guard against race conditions
            const { data: profile } = await supabase.from('profiles').select('status').eq('id', userIdRef.current).single();
            if (profile?.status === 'hosting' || profile?.status === 'drafting') return;

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

        // 💓 GLOBAL HEARTBEAT (Only active when NOT in a room)
        const heartbeat = setInterval(() => {
            if (channelRef.current && userIdRef.current) {
                channelRef.current.track({ user_id: userIdRef.current, status: currentStatus });
            }
        }, 30000);

        // Initial track
        if (channelRef.current) {
            channelRef.current.track({ user_id: userIdRef.current, status: currentStatus });
        }

        return () => clearInterval(heartbeat);
    }, [currentStatus, isInRoom]); // ⚡ Re-sync when entering/leaving rooms

    return null;
}