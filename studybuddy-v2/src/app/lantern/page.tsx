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
    status: 'flowstate' | 'cafe' | 'idle';
    hours: number;
    isHosting: boolean;
    roomCode?: string;
    isPremium: boolean;
    gridX: number;
    gridY: number;
    jitterX: number;
    jitterY: number;
}

const generateMockNetwork = (): LanternUser[] => {
    // ... (Keep your existing generateMockNetwork function exactly as is)
    const names = ["Alex", "Jordan", "Taylor", "Casey", "Riley", "Sam"];
    const chums = ["👻 Ghost", "🦉 Owl", "🦊 Fox", "🐼 Panda"];
    const users: LanternUser[] = [];
    const occupied = new Set();

    for (let i = 0; i < 45; i++) {
        let cx, cy;
        do {
            cx = Math.floor(Math.random() * 12);
            cy = Math.floor(Math.random() * 12);
        } while (occupied.has(`${cx},${cy}`));
        occupied.add(`${cx},${cy}`);

        const statusVal = Math.random();
        users.push({
            id: `user-${i}`,
            name: names[Math.floor(Math.random() * names.length)] + (Math.floor(Math.random() * 99)),
            chumLabel: chums[Math.floor(Math.random() * chums.length)],
            status: (statusVal > 0.6 ? 'flowstate' : (statusVal > 0.3 ? 'cafe' : 'idle')) as any,
            hours: Math.floor(Math.random() * 500) + 10,
            isHosting: Math.random() > 0.8,
            roomCode: Math.random().toString(36).substring(2, 6).toUpperCase(),
            isPremium: Math.random() > 0.7,
            gridX: cx,
            gridY: cy,
            jitterX: (Math.random() - 0.5) * 60,
            jitterY: (Math.random() - 0.5) * 60,
        });
    }
    return users;
};

export default function LanternNetPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [network] = useState<LanternUser[]>(generateMockNetwork);
    const { totalSessions, isPremiumUser } = useStudyStore();
    const router = useRouter();

    const [liveRooms, setLiveRooms] = useState<LanternUser[]>([]);

    // 👇 NEW: Store the current logged-in user's profile data
    const [myProfile, setMyProfile] = useState<{ displayName: string; fullName: string } | null>(null);

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

    useEffect(() => {
        const initNetworkData = async () => {
            // 1. 👇 Fetch Current User's custom Display Name
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data: profileData } = await supabase.from('profiles').select('display_name, full_name').eq('id', user.id).single();
                if (profileData) {
                    setMyProfile({
                        displayName: profileData.display_name,
                        fullName: profileData.full_name
                    });
                }
            }

            // 2. Fetch Live Rooms with their Host's Names
            const { data } = await supabase.from('rooms').select('*, profiles(display_name, full_name)');
            if (data) {
                const realUsers: LanternUser[] = data.map((room: any) => ({
                    id: room.host_id,
                    // Fallback Logic: Display Name -> Full Name -> "Live Host"
                    name: room.profiles?.display_name || room.profiles?.full_name || "Live Host",
                    chumLabel: "👻 Chum",
                    status: room.mode === 'cafe' ? 'cafe' : 'flowstate',
                    hours: 100,
                    isHosting: true,
                    roomCode: room.room_code,
                    isPremium: false,
                    gridX: Math.floor(Math.random() * 12),
                    gridY: Math.floor(Math.random() * 12),
                    jitterX: (Math.random() - 0.5) * 60,
                    jitterY: (Math.random() - 0.5) * 60,
                }));

                // Deduplicate hosts to prevent the React mapping key error
                const uniqueUsers = Array.from(new Map(realUsers.map(item => [item.id, item])).values());
                setLiveRooms(uniqueUsers);
            }
        };
        initNetworkData();
    }, []);

    const handleBroadcast = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        const roomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
        const { data: { user }, error: userError } = await supabase.auth.getUser();

        if (!user || userError) {
            alert("You need to be logged in to host a Sanctuary!");
            setIsSubmitting(false);
            return;
        }

        const { error: insertError } = await supabase.from('rooms').insert({
            room_code: roomCode,
            host_id: user.id,
            name: roomSettings.title,
            mode: roomSettings.mode,
            capacity: roomSettings.capacity,
            is_private: roomSettings.isLocked,
            vibe: roomSettings.vibe,
            password: null
        });

        if (insertError) {
            console.error("Error creating room:", insertError);
            alert("Failed to open the sanctuary.");
            setIsSubmitting(false);
            return;
        }

        await supabase.from('profiles').update({
            is_hosting: true,
            current_room: roomCode
        }).eq('id', user.id);

        setIsHostModalOpen(false);
        router.push(`/room/${roomCode}`);
    };

    // 👇 UPDATE: Use your fetched profile name for your own Map Node!
    const fullNetwork = useMemo(() => {
        // Fallback Chain for the current user
        const myName = myProfile?.displayName || myProfile?.fullName || "You";

        const me: LanternUser = {
            id: "me",
            name: myName, // 👈 Dynamically injected here!
            chumLabel: "👻 Ghost",
            status: 'flowstate',
            hours: totalSessions || 0,
            isHosting: true,
            isPremium: true,
            gridX: 6,
            gridY: 6,
            jitterX: 0,
            jitterY: 0
        };
        return [me, ...liveRooms, ...network];
    }, [network, liveRooms, totalSessions, myProfile]);

    const filteredNetwork = fullNetwork.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase())
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
                            placeholder="Search the void..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-2xl pl-11 pr-4 py-3 text-sm font-bold text-[var(--text-main)] outline-none focus:border-[var(--accent-teal)] transition-colors"
                        />
                    </div>

                    {/* 👇 TRIGGER MODAL HERE */}
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
                                    <span className={`text-[9px] font-bold uppercase tracking-wider ${user.status === 'flowstate' ? 'text-[var(--accent-teal)]' : 'text-[var(--accent-yellow)]'}`}>
                                        {user.status}
                                    </span>
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
