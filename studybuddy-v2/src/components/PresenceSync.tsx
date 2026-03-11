"use client";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useStudyStore } from "@/store/useStudyStore";

export default function PresenceSync() {
    const { activeMode, isTutorModeActive } = useStudyStore();
    const userIdRef = useRef<string | null>(null);
    const channelRef = useRef<any>(null);

    // ⚡ INSTANT STATUS DERIVATION
    const currentStatus = isTutorModeActive ? 'mastering' : (activeMode === 'none' ? 'idle' : activeMode);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            userIdRef.current = user.id;

            channelRef.current = supabase.channel('online-presence', {
                config: { presence: { key: user.id } }
            });

            channelRef.current.subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    await channelRef.current.track({ user_id: user.id, status: currentStatus });
                }
            });
        };

        init();

        // 🛑 THE ONLY PLACE FOR OFFLINE: When the tab actually closes.
        const handleTabClose = () => {
            if (userIdRef.current) {
                // Use a non-awaited call to ensure it fires before the process dies
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
            // ⚡ CRITICAL: Do NOT update DB to offline here. 
            // Only kill the realtime channel to prevent memory leaks.
            if (channelRef.current) supabase.removeChannel(channelRef.current);
        };
    }, []);

    useEffect(() => {
        if (!userIdRef.current) return;

        // Broadcast to Map instantly
        if (channelRef.current) {
            channelRef.current.track({ user_id: userIdRef.current, status: currentStatus });
        }

        // Persistent Sync
        supabase.from('profiles')
            .update({
                status: currentStatus,
                is_in_flowstate: currentStatus === 'flowState',
                active_session_type: currentStatus === 'mastering' ? 'AI_TUTOR' : null,
                last_seen: new Date().toISOString()
            })
            .eq('id', userIdRef.current);

    }, [currentStatus]);

    return null;
}