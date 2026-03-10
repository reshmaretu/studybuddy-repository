//PresenceSync.tsx
"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function PresenceSync() {
    useEffect(() => {
        let userId: string | null = null;
        const channel = supabase.channel('online-presence', {
            config: { presence: { key: 'user-status' } }
        });

        const initPresence = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            userId = user.id;

            channel
                .on('presence', { event: 'join' }, async ({ newPresences }) => {
                    // Only update DB if the joining presence matches the current user
                    if (newPresences.some(p => p.user_id === userId)) {
                        await supabase.from('profiles').update({ status: 'online' }).eq('id', userId);
                    }
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await channel.track({ user_id: userId, online_at: new Date().toISOString() });
                    }
                });
        };

        initPresence();

        // 🛑 OPTIMIZED CLEANUP
        return () => {
            if (userId) {
                // We use a non-awaited promise here because the browser may kill 
                // the process before an 'await' finishes during a tab close.
                supabase.from('profiles').update({ status: 'offline' }).eq('id', userId).then(() => {
                    channel.unsubscribe();
                });
            }
        };
    }, []);

    return null;
}