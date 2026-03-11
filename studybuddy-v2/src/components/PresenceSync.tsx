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
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            userIdRef.current = user.id;

            // Only create the channel once
            if (!channelRef.current) {
                channelRef.current = supabase.channel('online-presence', {
                    config: { presence: { key: user.id } }
                });

                channelRef.current.subscribe(async (status: string) => {
                    if (status === 'SUBSCRIBED') {
                        await channelRef.current.track({ user_id: user.id, status: currentStatus });
                    }
                });
            }
        };

        init();

        // 🛑 THE ONLY PLACE FOR OFFLINE: When the tab actually closes.
        const handleTabClose = () => {
            if (userIdRef.current) {
                supabase.from('profiles').update({
                    status: 'offline',
                    is_in_flowstate: false,
                    active_session_type: null
                }).eq('id', userIdRef.current).then();
            }
        };

        window.addEventListener('beforeunload', handleTabClose);
        return () => {
            window.removeEventListener('beforeunload', handleTabClose);
            // We don't remove channel here anymore because we want it persistent 
            // until the component truly unmounts globally.
        };
    }, []);

    // ⚡ SYNC ON EVERY STATUS CHANGE
    useEffect(() => {
        if (!userIdRef.current) return;

        // 🛑 STOP GLOBAL SYNC IN ROOMS
        // If isInRoom is true, we exit early and do NOT track or update status.
        // The StudyRoom component is now the sole owner of the status.
        if (isInRoom) return;

        // Update Database (Global Persistence)
        supabase.from('profiles')
            .update({
                status: currentStatus,
                is_in_flowstate: currentStatus === 'flowState',
                active_session_type: currentStatus === 'mastering' ? 'AI_TUTOR' : null,
                last_seen: new Date().toISOString()
            })
            .eq('id', userIdRef.current)
            .then();

        if (channelRef.current) {
            channelRef.current.track({ user_id: userIdRef.current, status: currentStatus });
        }

        const heartbeat = setInterval(() => {
            if (channelRef.current && userIdRef.current) {
                channelRef.current.track({ user_id: userIdRef.current, status: currentStatus });
            }
        }, 30000);

        return () => clearInterval(heartbeat);
    }, [currentStatus, isInRoom]); // ⚡ Re-sync when entering/leaving rooms

    return null;
}