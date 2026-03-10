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

    // 1. SETUP: Runs once to get User and setup Tab-Close listener
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

        // 🛑 THE FIX: Only set offline when the browser tab is actually CLOSED
        const handleTabClose = () => {
            if (userIdRef.current) {
                // Use a standard fetch or beacon if possible, but this works in most modern browsers
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
            if (channelRef.current) supabase.removeChannel(channelRef.current);
        };
    }, []); // 👈 Empty array: This cleanup ONLY runs when you leave the app

    // 2. MODE SWITCH: Runs when status changes. NO "offline" cleanup here!
    useEffect(() => {
        if (!userIdRef.current) return;

        // Fast broadcast
        if (channelRef.current) {
            channelRef.current.track({ user_id: userIdRef.current, status: currentStatus });
        }

        // Database Update
        supabase.from('profiles')
            .update({
                status: currentStatus,
                is_in_flowstate: currentStatus === 'flowState',
                active_session_type: currentStatus === 'mastering' ? 'AI_TUTOR' : null,
                last_seen: new Date().toISOString()
            })
            .eq('id', userIdRef.current);

    }, [currentStatus]); // 👈 No return cleanup function here!

    return null;
}