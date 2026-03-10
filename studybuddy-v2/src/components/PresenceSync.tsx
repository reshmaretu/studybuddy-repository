"use client";
import { useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { useStudyStore } from "@/store/useStudyStore";

export default function PresenceSync() {
    const { activeMode, isTutorModeActive } = useStudyStore();
    const userIdRef = useRef<string | null>(null);

    // ⚡ THE "TURBO" EFFECT: Determine status outside the effect
    const currentStatus = isTutorModeActive ? 'mastering' : (activeMode === 'none' ? 'idle' : activeMode);

    useEffect(() => {
        let channel: any;

        const sync = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            userIdRef.current = user.id;

            // 1. Fire-and-forget DB update (don't 'await' it to prevent UI lag)
            supabase.from('profiles').update({ status: currentStatus }).eq('id', user.id);

            // 2. Realtime Channel
            channel = supabase.channel('online-presence', {
                config: { presence: { key: user.id } }
            });

            channel.subscribe(async (status: string) => {
                if (status === 'SUBSCRIBED') {
                    // 3. Track immediately
                    await channel.track({ user_id: user.id, status: currentStatus });
                }
            });
        };

        sync();

        return () => {
            if (userIdRef.current) {
                // Emergency offline flip
                supabase.from('profiles').update({ status: 'offline' }).eq('id', userIdRef.current);
                channel?.unsubscribe();
            }
        };
    }, [currentStatus]); // 👈 Re-syncs the INSTANT currentStatus changes

    return null;
}