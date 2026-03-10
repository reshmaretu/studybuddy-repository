"use client";

import { useState, useEffect, useMemo } from "react";
import { Search, Trophy, Radio, Plus, X, Waves, Coffee, Sparkles, Clock, Timer, Lock } from "lucide-react";
import ThreeLanternNet from "@/components/LanternNetwork";
import { useStudyStore } from "@/store/useStudyStore";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export interface LanternUser {
    id: string;
    name: string;
    chumLabel: string;
    status: 'offline' | 'idle' | 'drafting' | 'hosting' | 'joined' | 'flowstate' | 'cafe' | 'mastering';
    hours: number;
    roomCode?: string;
    isPremium: boolean;
    isHosting: boolean; // 👈 Add this back
    gridX: number;
    gridY: number;
    jitterX: number;
    jitterY: number;
}
export default function LanternNetPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const { totalSessions, isPremiumUser } = useStudyStore();
    const router = useRouter();

    // The single source of truth for the entire map
    const [fullNetwork, setFullNetwork] = useState<LanternUser[]>([]);

    const [isHostModalOpen, setIsHostModalOpen] = useState(false);
    const [roomSettings, setRoomSettings] = useState({
        title: "Deep Work Session",
        mode: 'flowstate' as 'flowstate' | 'cafe',
        capacity: 5,
        isLocked: false,
        vibe: 'default',
        workDuration: 25,
        breakDuration: 5
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ⚡ SINGLE SOURCE OF TRUTH: FETCH & REAL-TIME SYNC
    useEffect(() => {
        let isSubscribed = true;

        const fetchNetwork = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            const currentUserId = authUser?.id;

            const [profilesRes, roomsRes] = await Promise.all([
                supabase.from('profiles').select(`
            id, display_name, full_name, total_hours, 
            chum_avatar, status, focus_score, is_premium,
            is_in_flowstate, active_session_type
        `),
                supabase.from('rooms').select('*')
            ]);

            if (profilesRes.data && isSubscribed) {
                const rooms = roomsRes.data || [];
                const users: LanternUser[] = profilesRes.data.map((p, index) => {
                    const hostedRoom = rooms.find(r => r.host_id === p.id);
                    const isMe = p.id === currentUserId;

                    // ⚡ STATUS PRIORITY: AI Mastering > Flowstate > Cafe > Hosting > Idle
                    let currentStatus: LanternUser['status'] = 'idle';

                    if (p.active_session_type === 'AI_TUTOR') {
                        currentStatus = 'mastering';
                    } else if (p.is_in_flowstate) {
                        currentStatus = 'flowstate';
                    } else if (hostedRoom) {
                        currentStatus = hostedRoom.mode === 'cafe' ? 'cafe' : 'hosting';
                    } else {
                        currentStatus = (p.status as any) || 'offline';
                    }

                    return {
                        id: isMe ? 'me' : p.id,
                        name: p.display_name || p.full_name || "Anonymous",
                        hours: p.total_hours || 0,
                        focusScore: p.focus_score || 0, // 👈 Derived from your schema
                        status: currentStatus,
                        isHosting: !!hostedRoom,
                        roomCode: hostedRoom?.room_code,
                        roomTitle: hostedRoom?.name,
                        isPremium: p.is_premium || false,
                        chumLabel: p.chum_avatar || "👻 Ghost",
                        gridX: isMe ? 6 : Math.floor(index / 5),
                        gridY: isMe ? 6 : index % 5,
                        jitterX: isMe ? 0 : (Math.random() - 0.5) * 40,
                        jitterY: isMe ? 0 : (Math.random() - 0.5) * 40,
                    };
                });
                setFullNetwork(users);
            }
        };

        fetchNetwork();

        // 🟢 COMBINED REAL-TIME CHANNEL
        // Listens for room changes AND tracks user presence in one go
        const channel = supabase.channel('lantern_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => fetchNetwork())
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => fetchNetwork())
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    const { data: { user } } = await supabase.auth.getUser();
                    if (user) {
                        // Mark user as idle/online when they enter the map
                        await supabase.from('profiles').update({ status: 'idle' }).eq('id', user.id);
                        fetchNetwork();
                    }
                }
            });

        return () => {
            isSubscribed = false;
            supabase.removeChannel(channel);
        };
    }, [totalSessions]); // totalSessions triggers a refresh if global stats change

    const handleBroadcast = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (!user || authError) {
            alert("Session expired. Please log in again.");
            setIsSubmitting(false);
            return;
        }

        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();

        const { error } = await supabase.from('rooms').insert({
            room_code: roomCode,
            host_id: user.id,
            name: roomSettings.title,
            status: 'DRAFT',
            work_duration: roomSettings.workDuration,
            break_duration: roomSettings.breakDuration,
            mode: roomSettings.mode,
            capacity: roomSettings.capacity,
            is_private: roomSettings.isLocked,
            vibe: roomSettings.vibe || 'default'
        });

        if (!error) {
            router.push(`/room/${roomCode}`);
        } else {
            console.error("Insert Error:", error.message);
            alert("Architect error: Could not initialize blueprint.");
            setIsSubmitting(false);
        }
    };

    // SEARCH FILTER
    const filteredNetwork = fullNetwork.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.roomCode && user.roomCode.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    useEffect(() => setIsMounted(true), []);
    if (!isMounted) return null;

    return (
        <div className="flex flex-col lg:flex-row h-screen max-h-screen p-4 pb-8 lg:p-6 lg:pb-10 gap-6 bg-[var(--bg-dark)] overflow-hidden">

            {/* LEFT PANEL */}
            <div className="w-full lg:w-[340px] flex flex-col gap-6 h-full z-10 flex-shrink-0 min-h-0">
                {/* Control Hub */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-[32px] shadow-sm flex flex-col gap-5">
                    <h1 className="text-2xl font-black text-[var(--text-main)] flex items-center gap-2">
                        <Radio size={24} className="text-[var(--accent-teal)]" /> Lantern Net
                    </h1>

                    <div className="relative">
                        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search the void or room code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-2xl pl-11 pr-4 py-3 text-sm font-bold text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] transition-colors"
                        />
                    </div>

                    <button
                        onClick={() => setIsHostModalOpen(true)}
                        className="w-full py-3.5 bg-[var(--accent-teal)] text-black rounded-2xl font-black text-sm shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <Plus size={18} /> Host Room
                    </button>
                </div>

                {/* HALL OF FOCUS */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-[32px] p-6 flex-1 flex flex-col min-h-0 shadow-sm">
                    <h3 className="text-sm font-black text-[var(--text-main)] flex items-center gap-2 mb-4 pb-4 border-b border-[var(--border-color)] uppercase tracking-wide">
                        <Trophy size={18} className="text-[var(--accent-yellow)]" /> Hall of Focus
                    </h3>
                    <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                        {filteredNetwork.sort((a, b) => b.hours - a.hours).map((user, index) => (
                            <div
                                key={user.id}
                                className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${user.id === 'me' ? 'bg-[var(--accent-teal)]/10 border-[var(--accent-teal)]/20' : 'bg-transparent border-transparent hover:border-[var(--border-color)] hover:bg-[var(--bg-dark)]'}`}
                            >
                                <span className={`text-xs font-black w-5 text-center ${index < 3 ? 'text-[var(--accent-yellow)]' : 'text-[var(--text-muted)]'}`}>
                                    {index + 1}
                                </span>
                                <div className="flex-1 flex flex-col">
                                    <span className="text-sm font-black text-[var(--text-main)]">{user.name}</span>
                                    {/* 👇 FIXED: Removed the redundant Flowstate status here to keep UI clean */}
                                </div>
                                <span className="text-xs font-black text-[var(--text-muted)] bg-[var(--bg-dark)] px-2 py-1 rounded-lg">
                                    {user.hours}h
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: THREE.JS MAP */}
            <div className="flex-1 h-full rounded-[40px] overflow-hidden border border-[var(--border-color)] shadow-xl relative min-h-0">
                <ThreeLanternNet users={filteredNetwork} />
            </div>

            {/* THE STUDY ARCHITECT MODAL (Simplified Entrance) */}
            <AnimatePresence>
                {isHostModalOpen && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsHostModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-[#1a1a1a] border border-white/5 rounded-[40px] w-full max-w-4xl overflow-hidden relative z-10 shadow-2xl flex flex-col md:flex-row min-h-[400px]"
                        >
                            {/* LEFT: Standard Settings */}
                            <div className="flex-[1.5] p-8 lg:p-10 flex flex-col justify-between">
                                <div>
                                    <h2 className="text-[28px] font-black text-white flex items-center gap-3 mb-10 tracking-tight">
                                        <Radio className="text-[#84ccb9]" size={28} /> Host Room
                                    </h2>

                                    <div className="space-y-8">
                                        <div>
                                            <label className="text-[11px] font-black uppercase tracking-widest text-white/50 mb-3 block">Room Title</label>
                                            <input
                                                type="text"
                                                value={roomSettings.title}
                                                onChange={(e) => setRoomSettings({ ...roomSettings, title: e.target.value })}
                                                className="w-full bg-[#111111] border border-white/5 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-[#84ccb9]/50 transition-all text-lg"
                                                placeholder="e.g. Deep Work Session"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleBroadcast}
                                    className="mt-12 w-full py-4 bg-white text-black rounded-2xl font-black text-base hover:bg-gray-100 active:scale-95 transition-all flex items-center justify-center gap-3"
                                >
                                    <Radio size={18} /> Initialize Blueprint
                                </button>
                            </div>

                            {/* RIGHT: Premium Architect Panel */}
                            <div className="flex-1 bg-[#151515] border-t md:border-t-0 md:border-l border-white/5 p-8 lg:p-10 flex flex-col relative">
                                <button
                                    onClick={() => setIsHostModalOpen(false)}
                                    className="absolute top-6 right-6 z-20 text-white/50 hover:text-white transition-colors p-2 bg-[#1a1a1a] rounded-full border border-white/5"
                                >
                                    <X size={16} />
                                </button>

                                <h3 className="text-sm font-black text-[#e8c366] flex items-center gap-2 mb-10 uppercase tracking-widest">
                                    <Sparkles size={16} /> Architect Pro
                                </h3>

                                <div className="space-y-8 flex-1">
                                    {/* Capacity (Premium Locked) */}
                                    <div className={`flex flex-col gap-3 ${!isPremiumUser ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                        <span className="text-[11px] font-black text-white/50 uppercase tracking-widest flex justify-between">
                                            Capacity {!isPremiumUser && <Lock size={12} />}
                                        </span>
                                        <select
                                            value={roomSettings.capacity}
                                            onChange={(e) => setRoomSettings({ ...roomSettings, capacity: Number(e.target.value) })}
                                            className="bg-[#1a1a1a] border border-white/5 p-4 rounded-xl text-base font-bold text-white outline-none appearance-none cursor-pointer"
                                        >
                                            <option value={5}>5 Users (Free)</option>
                                            <option value={15}>15 Users</option>
                                            <option value={50}>50 Users</option>
                                        </select>
                                    </div>

                                    {/* Privacy (Premium Locked) */}
                                    <div className={`flex items-center justify-between pt-4 ${!isPremiumUser ? 'opacity-50 grayscale pointer-events-none' : ''}`}>
                                        <span className="text-[11px] font-black text-white/50 uppercase tracking-widest flex items-center gap-2">
                                            Private Room {!isPremiumUser && <Lock size={12} />}
                                        </span>
                                        <button
                                            onClick={() => setRoomSettings({ ...roomSettings, isLocked: !roomSettings.isLocked })}
                                            className={`w-12 h-6 rounded-full relative transition-colors ${roomSettings.isLocked ? 'bg-[#84ccb9]' : 'bg-[#1a1a1a] border border-white/10'}`}
                                        >
                                            <motion.div layout className={`w-4 h-4 rounded-full bg-white absolute top-1 ${roomSettings.isLocked ? 'right-1' : 'left-1 bg-white/50'}`} />
                                        </button>
                                    </div>

                                    {/* Password Input (Only shows if Private is toggled on) */}
                                    <AnimatePresence>
                                        {roomSettings.isLocked && isPremiumUser && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                                                <input
                                                    type="text" placeholder="Enter Room Password"
                                                    onChange={(e) => setRoomSettings({ ...roomSettings, vibe: e.target.value })} // Map to your DB schema if needed
                                                    className="w-full bg-[#111111] border border-white/5 rounded-xl px-4 py-3 text-white text-sm font-bold outline-none mt-2"
                                                />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
