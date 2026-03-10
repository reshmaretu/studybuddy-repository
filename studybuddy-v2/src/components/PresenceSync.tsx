"use client";
import { useEffect } from "react";
import { supabase } from "@/lib/supabase";

export default function PresenceSync() {
    useEffect(() => {
        const syncStatus = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // On window close, set status to offline in the DB
            const handleUnload = async () => {
                // Using navigator.sendBeacon or a synchronous fetch is unreliable here,
                // so we rely on Supabase Presence's automatic channel cleanup.
            };

            const channel = supabase.channel('online-users');
            channel.subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    // When we leave, Supabase triggers the 'postgres_changes' or we can use a Database Function
                    await channel.track({ user_id: user.id });
                }
            });
        };
        syncStatus();
    }, []);

    return null;
}