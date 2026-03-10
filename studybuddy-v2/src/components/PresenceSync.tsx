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

            // Determine the status string to send to DB and Lanterns
            const currentStatus = isTutorModeActive ? 'mastering' : (activeMode === 'none' ? 'idle' : activeMode);

            // Immediate Database Update for reliability
            await supabase.from('profiles').update({ status: currentStatus }).eq('id', user.id);

            // Initialize Presence Channel
            channel = supabase.channel('online-presence', {
                config: { presence: { key: user.id } }
            });

            channel.subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    await channel.track({
                        user_id: user.id,
                        status: currentStatus,
                        online_at: new Date().toISOString(),
                    });
                }
            });
        };

        startSync();

        // Secondary "Emergency" cleanup for tab closing
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden' && userIdRef.current) {
                // Fire and forget update as the tab hides/closes
                supabase.from('profiles').update({ status: 'offline' }).eq('id', userIdRef.current);
            }
        };

        window.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.removeEventListener("visibilitychange", handleVisibilityChange);
            if (userIdRef.current && channel) {
                // Fire and forget the offline update on component unmount
                supabase.from('profiles')
                    .update({ status: 'offline' })
                    .eq('id', userIdRef.current)
                    .then(() => channel.unsubscribe());
            }
        };
    }, [activeMode, isTutorModeActive]); // Re-sync immediately when app state changes

    return null;
}