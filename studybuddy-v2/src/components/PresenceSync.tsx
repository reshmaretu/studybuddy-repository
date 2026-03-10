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

            // Initialize Channel
            channel = supabase.channel('online-presence', {
                config: { presence: { key: user.id } }
            });

            channel
                .on('presence', { event: 'sync' }, () => {
                    // Logic to handle global presence updates if needed
                })
                .subscribe(async (status: string) => {
                    if (status === 'SUBSCRIBED') {
                        // Track specific user metadata in Realtime
                        await channel.track({
                            user_id: user.id,
                            status: isTutorModeActive ? 'mastering' : activeMode,
                            online_at: new Date().toISOString(),
                        });
                    }
                });
        };

        startSync();

        // 🛑 CLEANUP: Ensure offline status sticks
        return () => {
            if (userIdRef.current && channel) {
                // Fire and forget the offline update
                supabase.from('profiles')
                    .update({ status: 'offline' })
                    .eq('id', userIdRef.current)
                    .then(() => channel.unsubscribe());
            }
        };
    }, [activeMode, isTutorModeActive]); // Re-sync when mode changes

    return null;
}