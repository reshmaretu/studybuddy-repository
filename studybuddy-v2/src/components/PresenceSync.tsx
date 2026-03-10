"use client";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useStudyStore } from "@/store/useStudyStore";

export default function PresenceSync() {
    const { activeMode, isTutorModeActive } = useStudyStore();
    const userIdRef = useRef<string | null>(null);
    const channelRef = useRef<any>(null);

    // ⚡ Derive status instantly for the dependency array
    const currentStatus = isTutorModeActive ? 'mastering' : (activeMode === 'none' ? 'idle' : activeMode);

    // 1. Setup Phase: Only runs once to get User and Initialize Channel
    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            userIdRef.current = user.id;

            // Initialize channel once and keep it in a ref
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

        return () => {
            if (userIdRef.current) {
                // Final offline flip
                supabase.from('profiles').update({ status: 'offline' }).eq('id', userIdRef.current);
                channelRef.current?.unsubscribe();
            }
        };
    }, []); // Empty dependency array: only init once

    // 2. Update Phase: Runs every time currentStatus changes
    useEffect(() => {
        if (!userIdRef.current) return;

        if (channelRef.current) {
            channelRef.current.track({ user_id: userIdRef.current, status: currentStatus });
        }

        supabase.from('profiles')
            .update({
                status: currentStatus,
                // ⚡ FIX: Use 'flowState' (camelCase) to match your interface types
                is_in_flowstate: currentStatus === 'flowState',
                active_session_type: currentStatus === 'mastering' ? 'AI_TUTOR' : null
            })
            .eq('id', userIdRef.current);

    }, [currentStatus]);
    return null;
}