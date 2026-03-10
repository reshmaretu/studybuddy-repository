"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function PresenceSync() {
    useEffect(() => {
        const channel = supabase.channel('online-presence', {
            config: { presence: { key: 'user-status' } }
        });

        const syncStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            channel
                .on('presence', { event: 'sync' }, async () => {
                    const state = channel.presenceState();
                    // If our ID isn't in the state, we are technically "gone"
                    // But usually, we want to update the DB when we JOIN
                    await supabase.from('profiles').update({ status: 'online' }).eq('id', user.id);
                })
                // 👇 This is the magic part: When the channel closes, Supabase handles the rest
                .on('presence', { event: 'join' }, async ({ newPresences }) => {
                    await supabase.from('profiles').update({ status: 'online' }).eq('id', user.id);
                })
                .subscribe(async (status) => {
                    if (status === 'SUBSCRIBED') {
                        await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
                    }
                });
        };

        syncStatus();

        // 🛑 CRITICAL: Set offline when the component unmounts (tab closed)
        return () => {
            const setOffline = async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (user) await supabase.from('profiles').update({ status: 'offline' }).eq('id', user.id);
                channel.unsubscribe();
            };
            setOffline();
        };
    }, []);

    return null;
}