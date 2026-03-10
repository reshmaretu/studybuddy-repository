"use client";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useStudyStore } from "@/store/useStudyStore";

export default function PresenceSync() {
    const { activeMode, isTutorModeActive } = useStudyStore();
    const userIdRef = useRef<string | null>(null);
    const channelRef = useRef<any>(null);

    // ⚡ INSTANT STATUS DERIVATION
    // Matches the casing used in your TypeScript types ('flowState' vs 'flowstate')
    const currentStatus = isTutorModeActive ? 'mastering' : (activeMode === 'none' ? 'idle' : activeMode);

    // 1. INITIALIZATION: Run once on mount
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            userIdRef.current = user.id;

            // Setup Realtime Channel
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

        // 🛑 EMERGENCY TAB-CLOSE CLEANUP
        // Fires before the browser kills the JS process
        const handleTabClose = () => {
            if (userIdRef.current) {
                // Using a non-awaited call to increase the chance it hits the network buffer
                supabase.from('profiles').update({
                    status: 'offline',
                    is_in_flowstate: false,
                    active_session_type: null
                }).eq('id', userIdRef.current);
            }
        };

        window.addEventListener('beforeunload', handleTabClose);

        return () => {
            window.removeEventListener('beforeunload', handleTabClose);
            channelRef.current?.unsubscribe();
        };
    }, []);

    // 2. LIVE UPDATE: Fires whenever activeMode or isTutorModeActive changes
    useEffect(() => {
        if (!userIdRef.current || !channelRef.current) return;

        const updateStatus = async () => {
            // ⚡ BROADCAST FIRST (Instant for map)
            channelRef.current.track({ user_id: userIdRef.current, status: currentStatus });

            // 🐢 UPDATE DB (Background)
            await supabase.from('profiles').update({
                status: currentStatus,
                is_in_flowstate: currentStatus === 'flowState',
                active_session_type: currentStatus === 'mastering' ? 'AI_TUTOR' : null,
                last_seen: new Date().toISOString()
            }).eq('id', userIdRef.current);
        };

        updateStatus();
    }, [currentStatus]);

    return null;
}