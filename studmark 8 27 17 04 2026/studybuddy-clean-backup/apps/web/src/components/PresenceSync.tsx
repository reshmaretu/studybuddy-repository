"use client";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useStudyStore } from "@/store/useStudyStore";
import { usePathname } from "next/navigation";

export default function PresenceSync() {
    const pathname = usePathname();
    const { activeMode, isTutorModeActive } = useStudyStore();
    const userIdRef = useRef<string | null>(null);
    const channelRef = useRef<import('@supabase/supabase-js').RealtimeChannel | null>(null);

    const isInRoom = pathname.startsWith('/room/');
    // 🛑 EMBARGO: If any of these are active, this component stays SILENT
    const isSpecialMode = isInRoom || activeMode === 'flowState' || activeMode === 'studyCafe';

    // ⚡ Match exactly with LanternNetwork STATUS_CONFIG
    const currentStatus = isTutorModeActive ? 'mastering' : (activeMode === 'none' ? 'idle' : (activeMode === 'studyCafe' ? 'cafe' : activeMode));

    const [isReady, setIsReady] = useState(false);

    useEffect(() => {
        const init = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                userIdRef.current = user.id;

                // ⚡ FIX: Force an initial "idle" sync if not in a special mode
                if (!isSpecialMode) {
                    await supabase.from('profiles')
                        .update({ status: 'idle', last_seen: new Date().toISOString() })
                        .eq('id', user.id);
                }

                setIsReady(true);
            }
        };
        init();
    }, [isSpecialMode]);

    useEffect(() => {
        const handleTabClose = () => {
            // 🛑 EMBARGO: If in a room/mode, let that component's cleanup handle it.
            if (!userIdRef.current || isSpecialMode) return;

            // ⚡ USE CASE: navigator.sendBeacon is more reliable for "fire and forget" 
            // updates during tab closure than a standard async supabase call.
            const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?id=eq.${userIdRef.current}`;
            const headers = {
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                'Content-Type': 'application/json'
            };
            const body = JSON.stringify({
                status: 'offline',
                is_in_flowstate: false,
                last_seen: new Date().toISOString()
            });

            navigator.sendBeacon(url, body);
        };

        window.addEventListener('beforeunload', handleTabClose);
        return () => window.removeEventListener('beforeunload', handleTabClose);
    }, [isSpecialMode, isReady]);

    useEffect(() => {
        // 🛑 EMBARGO: If in room/mode or not ready, stay silent
        if (!isReady || !userIdRef.current || isSpecialMode) return;

        // 1. Initialize Global Realtime Channel
        const channel = supabase.channel('global-presence');
        channelRef.current = channel;

        const syncToDB = async () => {
            // 🛡️ Final guard: don't overwrite if overlays/rooms are in control
            const { data: profile } = await supabase.from('profiles').select('status').eq('id', userIdRef.current).single();
            const protectedStatuses = ['hosting', 'drafting', 'flowState', 'cafe'];
            if (protectedStatuses.includes(profile?.status)) return;

            // ⚡ UPDATING DATABASE
            await supabase.from('profiles').update({
                status: currentStatus,
                last_seen: new Date().toISOString()
            }).eq('id', userIdRef.current);
        };

        // 2. Subscribe and Pulse
        channel.subscribe(async (s) => {
            if (s === 'SUBSCRIBED') {
                // Pulse Presence for the Lantern Map
                await channel.track({ user_id: userIdRef.current, status: currentStatus });
                // Update persistent database status
                await syncToDB();
            }
        });

        // 3. Keep-Alive Heartbeat
        const heartbeat = setInterval(async () => {
            if (channelRef.current) {
                await channelRef.current.track({ user_id: userIdRef.current, status: currentStatus });
            }
        }, 30000);

        return () => {
            clearInterval(heartbeat);
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [currentStatus, isSpecialMode, isReady]); // ⚡ ADDED isReady to ensure ID availability

    return null;
}