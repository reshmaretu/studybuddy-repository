"use client";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useStudyStore } from "@/store/useStudyStore";

export default function PresenceSync() {
    const { activeMode, isTutorModeActive } = useStudyStore();
    const userIdRef = useRef<string | null>(null);

    useEffect(() => {
        let channel: any;

        const startSync = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            userIdRef.current = user.id;

            // 1. Determine exact status for DB and Lanterns
            const currentStatus = isTutorModeActive ? 'mastering' : (activeMode === 'none' ? 'idle' : activeMode);

            // 2. Proactive Database Update (Forces the status change immediately)
            await supabase.from('profiles').update({ status: currentStatus }).eq('id', user.id);

            // 3. Realtime Presence Tracking
            channel = supabase.channel('online-presence', {
                config: { presence: { key: user.id } }
            });

            channel.subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: user.id,
                        status: currentStatus,
                    });
                }
            });
        };

        startSync();

        // 4. Emergency Cleanup for Tab Closing
        const handleVisibility = () => {
            if (document.visibilityState === 'hidden' && userIdRef.current) {
                // Fire and forget: update to offline as soon as tab is hidden/closed
                supabase.from('profiles').update({ status: 'offline' }).eq('id', userIdRef.current);
            }
        };

        window.addEventListener("visibilitychange", handleVisibility);

        return () => {
            window.removeEventListener("visibilitychange", handleVisibility);
            if (userIdRef.current && channel) {
                supabase.from('profiles').update({ status: 'offline' }).eq('id', userIdRef.current)
                    .then(() => channel.unsubscribe());
            }
        };
    }, [activeMode, isTutorModeActive]); // Syncs every time you change modes

    return null;
}