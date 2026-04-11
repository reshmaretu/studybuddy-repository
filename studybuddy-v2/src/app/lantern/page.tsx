"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Trophy, Radio, Plus, X, Crosshair } from "lucide-react";
import ThreeLanternNet, { LanternNetHandle } from "@/components/LanternNetwork";
import ChumRenderer from "@/components/ChumRenderer";
import { useStudyStore } from "@/store/useStudyStore";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export interface LanternUser {
    id: string;
    name: string;
    chumLabel: string;
    focusScore: number;
    status: 'offline' | 'idle' | 'drafting' | 'hosting' | 'joined' | 'flowState' | 'cafe' | 'mastering';
    hours: number;
    roomCode?: string;
    roomTitle?: string;
    roomDescription?: string;
    isPremium: boolean;
    isHosting: boolean;
    gridX: number;
    gridY: number;
    jitterX: number;
    jitterY: number;
    avatarUrl?: string;
    activeAccessories?: any[];
}

const getStableRandom = (id: string, seed: string) => {
    let hash = 0;
    const str = id + seed;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) - hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return (Math.abs(hash) % 1000) / 1000;
};

const formatUser = (p: any, rooms: any[], currentUserId: string | null, index: number): LanternUser => {
    const hostedRoom = rooms.find(r => r.host_id === p.id);
    const joinedRoom = p.joined_room_code ? rooms.find(r => r.room_code === p.joined_room_code) : null;
    const isMe = p.id === currentUserId;

    let currentStatus: LanternUser['status'] = 'idle';

    if (p.active_session_type === 'AI_TUTOR') {
        currentStatus = 'mastering';
    } else if (hostedRoom) {
        currentStatus = hostedRoom.status === 'DRAFT' ? 'drafting' :
            (hostedRoom.mode === 'cafe' ? 'cafe' : 'hosting');
    } else if (p.status === 'joined') {
        currentStatus = 'joined';
    } else if (p.is_in_flowstate) {
        currentStatus = 'flowState';
    } else {
        currentStatus = (p.status as any) || 'offline';
    }

    const stats = Array.isArray(p.user_stats) ? p.user_stats[0] : p.user_stats;
    const wardrobe = Array.isArray(p.chum_wardrobe) ? p.chum_wardrobe[0] : p.chum_wardrobe;

    // Stable Grid logic
    const gridX = isMe ? 6 : Math.floor((getStableRandom(p.id, "x") * 100) % 12);
    const gridY = isMe ? 6 : Math.floor((getStableRandom(p.id, "y") * 100) % 12);

    const relevantRoom = hostedRoom || joinedRoom;

    return {
        id: isMe ? 'me' : p.id,
        name: (p.display_name && p.display_name.trim() !== "") ? p.display_name : (p.full_name && p.full_name.trim() !== "") ? p.full_name : "Anonymous",
        status: currentStatus,
        hours: stats ? Number(((stats.total_seconds_tracked || 0) / 3600).toFixed(1)) : 0,
        focusScore: stats ? (stats.focus_score || 0) : 0,
        isHosting: !!hostedRoom,
        roomCode: relevantRoom?.room_code,
        roomTitle: (relevantRoom?.name && relevantRoom.name !== "undefined") ? relevantRoom.name : "Sanctuary",
        roomDescription: (relevantRoom?.description && relevantRoom.description !== "undefined") ? relevantRoom.description : undefined,
        isPremium: p.is_premium || false,
        chumLabel: wardrobe ? `${wardrobe.base_emoji || "👻"}${wardrobe.hat_emoji || ""}` : "Chum",
        gridX,
        gridY,
        jitterX: isMe ? 0 : (getStableRandom(p.id, "jitterX") - 0.5) * 40,
        jitterY: isMe ? 0 : (getStableRandom(p.id, "jitterY") - 0.5) * 40,
        avatarUrl: p.avatar_url,
        activeAccessories: wardrobe?.active_accessories || []
    };
};

export default function LanternNetPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const {
        totalSessions, activeMode, isTutorModeActive, isDev, devOverlayEnabled,
        debrisSize, debrisColor, debrisCount, debrisSpread, setDebris,
        mockUsers, setMockUsers, isPremiumUser, setSettings, totalSecondsTracked
    } = useStudyStore();
    const router = useRouter();

    const [fullNetwork, setFullNetwork] = useState<LanternUser[]>([]);
    const [isNetworkLoading, setIsNetworkLoading] = useState(true);
    const isFirstLoad = useRef(true);
    const lanternRef = useRef<LanternNetHandle>(null);

    const [isDevOverlayOpen, setIsDevOverlayOpen] = useState(false);
    const [appTheme, setAppTheme] = useState('deep-teal');

    useEffect(() => {
        const saved = localStorage.getItem('appTheme') || 'deep-teal';
        setAppTheme(saved);

        // Ensure HTML tag is also synced (fallback for components relying on it)
        document.documentElement.setAttribute('data-theme', saved);
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (isDev && devOverlayEnabled && e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'd') {
                e.preventDefault();
                setIsDevOverlayOpen(p => !p);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isDev, devOverlayEnabled]);

    const generateMockUser = (existingUsers: LanternUser[], id: string): LanternUser => {
        const statuses: LanternUser['status'][] = ['idle', 'drafting', 'hosting', 'joined', 'flowState', 'cafe', 'mastering', 'offline'];
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const isHosting = status === 'hosting' || status === 'drafting';

        let gridX = 6, gridY = 6;
        let attempts = 0;
        while (attempts < 100) {
            gridX = Math.floor(Math.random() * 24) - 6;
            gridY = Math.floor(Math.random() * 24) - 6;
            if (gridX === 6 && gridY === 6) { attempts++; continue; }
            const clash = existingUsers.some(u => u.gridX === gridX && u.gridY === gridY);
            if (!clash) break;
            attempts++;
        }

        return {
            id: `mock-${id}`,
            name: `Bot ${id}`,
            chumLabel: "🤖 Bot",
            focusScore: Math.floor(Math.random() * 5000),
            status,
            hours: Math.floor(Math.random() * 500),
            isPremium: Math.random() > 0.5,
            isHosting,
            roomCode: isHosting ? `MCK${id.substring(0, 3)}` : undefined,
            roomTitle: isHosting ? `Mock Sanctuary ${id}` : undefined,
            gridX,
            gridY,
            jitterX: (Math.random() - 0.5) * 40,
            jitterY: (Math.random() - 0.5) * 40,
        };
    };

    const [isHostModalOpen, setIsHostModalOpen] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [activeTab, setActiveTab] = useState<'chums' | 'rooms'>('chums');
    const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);

    useEffect(() => {
        setSettings({ isSidebarHidden: isMaximized });
    }, [isMaximized, setSettings]);
    const [roomSettings, setRoomSettings] = useState({
        title: "Deep Work Session",
        description: "",
        mode: 'flowstate' as 'flowstate' | 'cafe',
        capacity: 4,
        isLocked: false,
        password: "",
        workDuration: 25,
        breakDuration: 5
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        let isSubscribed = true;
        let currentUserId: string | null = null;

        const fetchNetwork = async () => {
            const { data: authData } = await supabase.auth.getUser();
            const user = authData?.user;
            if (!user || !isSubscribed) return;
            currentUserId = user.id;

            if (isFirstLoad.current) {
                setIsNetworkLoading(true);
            }
            try {
                // Fetch all data in parallel
                const results = await Promise.all([
                    supabase.from('profiles').select('id, display_name, full_name, status, is_in_flowstate, active_session_type, is_premium, avatar_url'),
                    supabase.from('rooms').select('*'),
                    supabase.from('user_stats').select('user_id, focus_score, total_seconds_tracked'),
                    supabase.from('chum_wardrobe').select('user_id, active_accessories'),
                ]);

                const [profilesRes, roomsRes, statsRes, wardrobeRes] = results;

                if (profilesRes.data && isSubscribed) {
                    const rooms = roomsRes.data || [];
                    const statsMap = new Map((statsRes.data || []).map(s => [s.user_id, s]));
                    const wardrobeMap = new Map((wardrobeRes.data || []).map(w => [w.user_id, w]));

                    const users: LanternUser[] = profilesRes.data.map((p, index) => {
                        const mergedProfile = {
                            ...p,
                            user_stats: statsMap.get(p.id) || null,
                            chum_wardrobe: wardrobeMap.get(p.id) || null
                        };

                        if (p.id === currentUserId) {
                            return formatUser({
                                ...mergedProfile,
                                user_stats: {
                                    ...(mergedProfile.user_stats || {}),
                                    total_seconds_tracked: totalSecondsTracked // Use local real-time value
                                },
                                is_in_flowstate: activeMode === 'flowState',
                                active_session_type: isTutorModeActive ? 'AI_TUTOR' : null,
                                status: activeMode === 'none' ? 'idle' : activeMode
                            }, rooms, currentUserId, index);
                        }
                        return formatUser(mergedProfile, rooms, currentUserId, index);
                    });
                    setFullNetwork(users);
                }
            } catch (err) {
                console.error("Lantern Network Fetch Error:", err);
            } finally {
                if (isSubscribed) {
                    setIsNetworkLoading(false);
                    isFirstLoad.current = false;
                }
            }
        };

        fetchNetwork();

        const channel = supabase.channel('lantern_sync')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms' }, () => {
                if (isSubscribed) fetchNetwork();
            })
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
                if (isSubscribed) fetchNetwork();
            })
            .subscribe();

        return () => {
            isSubscribed = false;
            supabase.removeChannel(channel);
        };
    }, [totalSessions, activeMode, isTutorModeActive]);

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
            description: roomSettings.description, // Added description
            status: 'DRAFT',
            work_duration: roomSettings.workDuration,
            break_duration: roomSettings.breakDuration,
            mode: roomSettings.mode,
            capacity: roomSettings.capacity,
            is_private: roomSettings.isLocked,
            password: roomSettings.isLocked ? roomSettings.password : null, // Added password
            vibe: 'default'
        });

        if (!error) {
            router.push(`/room/${roomCode}?title=${encodeURIComponent(roomSettings.title)}`);
        } else {
            console.error("Insert Error:", error.message);
            alert("Architect error: Could not initialize blueprint.");
            setIsSubmitting(false);
        }
    };

    const combinedNetwork = [...fullNetwork, ...mockUsers];
    const filteredNetwork = combinedNetwork.filter(user =>
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.roomCode && user.roomCode.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    useEffect(() => setIsMounted(true), []);
    if (!isMounted) return null;

    return (
        <div data-theme={appTheme} className="flex flex-col lg:flex-row h-screen max-h-screen p-4 pb-8 lg:p-6 lg:pb-10 gap-6 bg-(--bg-dark) overflow-hidden relative">

            <AnimatePresence>
                {isDevOverlayOpen && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute top-20 left-1/2 -translate-x-1/2 z-999 bg-(--bg-card) border-2 border-red-500/50 p-6 rounded-3xl shadow-[0_0_50px_rgba(255,0,0,0.15)] w-80">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="font-black text-red-400 text-xs tracking-widest uppercase">Dev Console</h2>
                            <button onClick={() => setIsDevOverlayOpen(false)} className="text-(--text-muted) hover:text-white"><X size={14} /></button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex justify-between items-center bg-(--bg-dark) px-4 py-2 rounded-xl">
                                <span className="text-xs font-bold text-(--text-main)">Mock Users</span>
                                <div className="flex gap-2 items-center">
                                    <button onClick={() => setMockUsers(mockUsers.slice(0, Math.max(0, mockUsers.length - 1)))} className="w-6 h-6 rounded bg-(--border-color) flex items-center justify-center font-bold text-xs">-</button>
                                    <span className="text-xs font-mono">{mockUsers.length}</span>
                                    <button onClick={() => setMockUsers([...mockUsers, generateMockUser(combinedNetwork, Math.random().toString(36).substring(2, 6))])} className="w-6 h-6 rounded bg-(--border-color) flex items-center justify-center font-bold text-xs">+</button>
                                </div>
                            </div>
                            <button onClick={() => {
                                setMockUsers(mockUsers.map(u => generateMockUser(combinedNetwork.filter(m => m.id !== u.id), u.id.replace('mock-', ''))));
                            }} className="w-full py-2 bg-(--bg-dark) border border-(--border-color) rounded-xl text-xs font-bold hover:bg-(--border-color) transition-colors">
                                Randomize Mock Users
                            </button>

                            <div className="pt-4 border-t border-(--border-color) space-y-3">
                                <h3 className="text-[10px] font-black uppercase text-white/40 tracking-widest">Environment Controls</h3>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span>Size</span>
                                        <span className="font-mono text-red-400">{debrisSize.toFixed(1)}</span>
                                    </div>
                                    <input type="range" min="0.1" max="2" step="0.1" value={debrisSize} onChange={(e) => setDebris({ size: parseFloat(e.target.value) })} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-500" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span>Count</span>
                                        <span className="font-mono text-red-400">{debrisCount}</span>
                                    </div>
                                    <input type="range" min="1000" max="15000" step="1000" value={debrisCount} onChange={(e) => setDebris({ count: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-500" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span>Spread</span>
                                        <span className="font-mono text-red-400">{debrisSpread}</span>
                                    </div>
                                    <input type="range" min="100" max="1000" step="50" value={debrisSpread} onChange={(e) => setDebris({ spread: parseInt(e.target.value) })} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-red-500" />
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center text-[10px] font-bold">
                                        <span>Color</span>
                                        <input type="color" value={debrisColor} onChange={(e) => setDebris({ color: e.target.value })} className="w-6 h-6 bg-transparent border-none cursor-pointer" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {isHostModalOpen && (
                    <div className="fixed inset-0 z-1000 flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            onClick={() => setIsHostModalOpen(false)} className="absolute inset-0 bg-black/70 backdrop-blur-sm cursor-pointer" />
                        <motion.div initial={{ scale: 0.9, opacity: 0, y: 40 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.9, opacity: 0, y: 40 }}
                            className="bg-(--bg-card) border border-(--border-color) rounded-[40px] w-full max-w-4xl shadow-2xl relative z-10 overflow-hidden flex flex-col lg:flex-row h-auto max-h-[90vh]" onPointerDown={(e) => e.stopPropagation()}>

                            {/* LEFT SIDE: Identity */}
                            <div className="flex-1 p-8 lg:p-12 border-b lg:border-b-0 lg:border-r border-(--border-color) overflow-y-auto custom-scrollbar">
                                <div className="flex justify-between items-center mb-8">
                                    <h2 className="text-3xl font-black text-(--text-main) flex items-center gap-3">
                                        <Plus className="text-(--accent-teal)" size={28} /> Cast a Lantern
                                    </h2>
                                    <button onClick={() => setIsHostModalOpen(false)} className="lg:hidden text-(--text-muted) hover:text-(--text-main) p-2 hover:bg-(--bg-dark) rounded-xl transition-all"><X size={20} /></button>
                                </div>

                                <div className="space-y-8">
                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-(--text-muted) uppercase tracking-[0.2em] px-1">Room Blueprint Title</label>
                                        <input autoFocus type="text" placeholder="e.g., Deep Focus Chamber" value={roomSettings.title} onChange={e => setRoomSettings({ ...roomSettings, title: e.target.value })}
                                            className="w-full bg-(--bg-dark) border border-(--border-color) rounded-2xl px-6 py-5 text-sm font-bold text-(--text-main) outline-none focus:border-(--accent-teal) transition-all placeholder:text-(--text-muted)/30" />
                                    </div>

                                    <div className="space-y-3">
                                        <label className="text-[10px] font-black text-(--text-muted) uppercase tracking-[0.2em] px-1">Description (Optional)</label>
                                        <textarea placeholder="Tell the network what you're working on..." rows={4} maxLength={30} value={roomSettings.description} onChange={e => setRoomSettings({ ...roomSettings, description: e.target.value })}
                                            className="w-full bg-(--bg-dark) border border-(--border-color) rounded-2xl px-6 py-5 text-sm font-bold text-(--text-main) outline-none focus:border-(--accent-teal) transition-all resize-none custom-scrollbar placeholder:text-(--text-muted)/30" />
                                        <div className="flex justify-end px-1">
                                            <span className={`text-[10px] font-bold ${roomSettings.description.length >= 30 ? 'text-red-500' : 'text-(--text-muted)'}`}>
                                                {roomSettings.description.length}/30
                                            </span>
                                        </div>
                                    </div>


                                </div>
                            </div>

                            {/* RIGHT SIDE: Parameters & Premium */}
                            <div className="w-full lg:w-[420px] bg-(--bg-sidebar)/30 p-8 lg:p-12 flex flex-col justify-between overflow-y-auto custom-scrollbar">
                                <div className="space-y-10">
                                    <div className="hidden lg:flex justify-between items-center">
                                        <span className="text-[10px] font-black text-(--text-muted) uppercase tracking-widest">Architect Controls</span>
                                        <button onClick={() => setIsHostModalOpen(false)} className="text-(--text-muted) hover:text-(--text-main) p-2 hover:bg-(--bg-dark) rounded-xl transition-all"><X size={20} /></button>
                                    </div>

                                    {/* Capacity Slider */}
                                    <div className={`space-y-4 group transition-all ${!isPremiumUser ? 'cursor-not-allowed' : ''}`}>
                                        <div className="flex justify-between items-center px-1">
                                            <label className="text-[10px] font-black text-(--text-muted) uppercase tracking-widest flex items-center gap-2">
                                                Room Capacity {!isPremiumUser && <span className="text-[8px] bg-(--accent-teal)/10 text-(--accent-teal) px-1.5 py-0.5 rounded-full">PREMIUM</span>}
                                            </label>
                                            <span className="text-xl font-black text-(--accent-teal)">{roomSettings.capacity}</span>
                                        </div>
                                        <div className="relative px-1">
                                            <input 
                                                type="range" 
                                                min="2" 
                                                max={isPremiumUser ? 9 : 3} 
                                                step="1" 
                                                value={roomSettings.capacity > (isPremiumUser ? 9 : 3) ? (isPremiumUser ? 9 : 3) : roomSettings.capacity} 
                                                onChange={e => setRoomSettings({ ...roomSettings, capacity: parseInt(e.target.value) })}
                                                className="w-full h-1.5 bg-(--border-color) rounded-full appearance-none cursor-pointer accent-(--accent-teal)" 
                                            />
                                            <div className="flex justify-between mt-2 px-0.5">
                                                <span className="text-[9px] font-black text-(--text-muted)">MIN 2</span>
                                                <span className="text-[9px] font-black text-(--text-muted)">MAX {isPremiumUser ? 9 : 3}</span>
                                            </div>
                                        </div>
                                    </div>



                                    {/* Password Toggle & Input */}
                                    <div className={`space-y-4 p-6 rounded-3xl bg-(--bg-dark)/50 border border-(--border-color) transition-all ${!isPremiumUser ? 'opacity-50' : ''}`}>
                                        <div className="flex justify-between items-center">
                                            <div className="space-y-1">
                                                <span className="text-xs font-black text-(--text-main) flex items-center gap-2">
                                                    Private Room {!isPremiumUser && <span className="text-[8px] bg-(--accent-teal)/10 text-(--accent-teal) px-1.5 py-0.5 rounded-full">PREMIUM</span>}
                                                </span>
                                                <span className="block text-[9px] text-(--text-muted) font-medium">Require room password</span>
                                            </div>
                                            <div onClick={() => isPremiumUser && setRoomSettings({ ...roomSettings, isLocked: !roomSettings.isLocked })}
                                                className={`w-10 h-5 rounded-full p-1 flex items-center transition-all duration-300 ${roomSettings.isLocked ? 'bg-(--accent-teal)' : 'bg-(--bg-card) border border-(--border-color)'} ${!isPremiumUser ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                                <div className={`w-3 h-3 rounded-full transition-transform duration-300 ${roomSettings.isLocked ? 'translate-x-5 bg-white' : 'translate-x-0 bg-(--text-muted)'}`} />
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {roomSettings.isLocked && isPremiumUser && (
                                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="pt-2">
                                                    <input type="password" placeholder="Define room password" value={roomSettings.password} onChange={e => setRoomSettings({ ...roomSettings, password: e.target.value })}
                                                        className="w-full bg-(--bg-dark) border border-(--border-color) rounded-xl px-4 py-3 text-xs font-bold text-(--text-main) outline-none focus:border-(--accent-teal)" />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </div>

                                <div className="pt-8">
                                    <button onClick={handleBroadcast} disabled={isSubmitting || !roomSettings.title.trim() || (roomSettings.isLocked && !roomSettings.password)}
                                        className="w-full py-5 bg-(--accent-teal) text-white rounded-2xl font-black text-sm shadow-[0_10px_30px_-10px_rgba(20,184,166,0.5)] hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:grayscale">
                                        {isSubmitting ? "Initializing Blueprint..." : "Broadcast to Net"}
                                    </button>
                                    <p className="text-center text-[9px] text-(--text-muted) font-black uppercase tracking-widest mt-4">Safe connection established</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* MOBILE SIDEBAR TOGGLE */}
            <div className="lg:hidden fixed bottom-24 right-6 z-50">
                <button
                    onClick={() => setIsSidebarOpenMobile(!isSidebarOpenMobile)}
                    className="w-14 h-14 bg-(--accent-teal) text-black rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all"
                >
                    {isSidebarOpenMobile ? <X size={24} /> : <Trophy size={24} />}
                </button>
            </div>

            <AnimatePresence>
                {(isSidebarOpenMobile || !isMaximized) && (
                    <motion.div
                        initial={isSidebarOpenMobile ? { x: '100%' } : { x: 0 }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        className={`fixed lg:relative inset-0 lg:inset-auto z-40 lg:z-10 ${isSidebarOpenMobile
                            ? 'bg-(--bg-dark)/95 backdrop-blur-xl p-6 pt-12'
                            : 'hidden lg:flex'
                            } w-full lg:w-[340px] flex-col gap-6 h-full shrink-0 min-h-0`}
                    >
                        {/* MOBILE CLOSE */}
                        {isSidebarOpenMobile && (
                            <button onClick={() => setIsSidebarOpenMobile(false)} className="absolute top-6 right-6 text-(--text-muted)">
                                <X size={28} />
                            </button>
                        )}

                        {/* HEADER & SEARCH SECTION */}
                        <div className="bg-(--bg-card) border border-(--border-color) p-6 rounded-[32px] shadow-sm flex flex-col gap-5 shrink-0">
                            <h1 className="text-2xl font-black text-(--text-main) flex items-center gap-2">
                                <Radio size={24} className="text-(--accent-teal)" /> Lantern Net
                            </h1>
                            <div className="relative w-full">
                                <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-(--text-muted)" />
                                <input
                                    type="text"
                                    placeholder="Search void..."
                                    className="w-full bg-(--bg-dark) border border-(--border-color) rounded-2xl pl-12 pr-4 py-3.5 text-sm font-bold outline-none focus:border-(--accent-teal) transition-all"
                                />
                            </div>
                        </div>

                        {/* TABS CONTAINER (The Conflict Fix) */}
                        <div className="bg-(--bg-card) border border-(--border-color) rounded-[32px] p-6 flex-1 flex flex-col min-h-0 shadow-sm gap-6 overflow-hidden">

                            {/* SWITCHER */}
                            <div className="flex bg-(--bg-dark) p-1.5 rounded-2xl border border-(--border-color) shrink-0">
                                <button
                                    onClick={() => setActiveTab('chums')}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'chums' ? 'bg-(--accent-teal) text-white shadow-lg' : 'text-(--text-muted) hover:text-white'}`}
                                >
                                    Chums
                                </button>
                                <button
                                    onClick={() => setActiveTab('rooms')}
                                    className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${activeTab === 'rooms' ? 'bg-(--accent-teal) text-white shadow-lg' : 'text-(--text-muted) hover:text-white'}`}
                                >
                                    Sanctuaries
                                </button>
                            </div>

                            {/* TAB CONTENT (Scrollable) */}
                            <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'chums' ? (
                                        <motion.div
                                            key="chums"
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                            className="space-y-2"
                                        >
                                            <div className="flex flex-col min-h-0">
                                                <h3 className="text-sm font-black text-(--text-main) flex items-center gap-2 mb-4 pb-4 border-b border-(--border-color) uppercase tracking-wide">
                                                    <Trophy size={18} className="text-(--accent-yellow)" /> Hall of Focus
                                                </h3>
                                                <div className="space-y-2">
                                                    {isNetworkLoading ? (
                                                        Array.from({ length: 3 }).map((_, i) => (
                                                            <div key={i} className="flex items-center gap-3 p-3 rounded-2xl bg-(--bg-dark)/30 animate-pulse">
                                                                <div className="w-5 h-4 bg-(--border-color) rounded" />
                                                                <div className="flex-1 h-4 bg-(--border-color) rounded w-24" />
                                                            </div>
                                                        ))
                                                    ) : (
                                                        filteredNetwork.sort((a, b) => b.hours - a.hours).slice(0, 10).map((user, index) => (
                                                            <div
                                                                key={user.id}
                                                                className={`group/row flex items-center gap-3 p-3 rounded-2xl border transition-all ${user.id === 'me' ? 'bg-(--accent-teal)/10 border-(--accent-teal)/20' : 'bg-transparent border-transparent hover:border-(--border-color) hover:bg-(--bg-dark)'}`}
                                                            >
                                                                <span className={`text-xs font-black w-5 text-center ${index < 3 ? 'text-(--accent-yellow)' : 'text-(--text-muted)'}`}>
                                                                    {index + 1}
                                                                </span>
                                                                <div className="w-8 h-8 rounded-full border border-(--border-color) shrink-0 bg-(--bg-dark) overflow-hidden flex items-center justify-center p-0.5 relative">
                                                                    {user.avatarUrl ? (
                                                                        <img 
                                                                            src={user.avatarUrl} 
                                                                            alt="PFP" 
                                                                            className="w-full h-full object-cover z-20 relative rounded-full" 
                                                                            onError={(e) => {
                                                                                (e.target as HTMLImageElement).style.display = 'none';
                                                                                const fallback = (e.target as HTMLImageElement).parentElement?.querySelector('.fallback-chum');
                                                                                if (fallback) fallback.classList.remove('invisible');
                                                                            }}
                                                                        />
                                                                    ) : null}
                                                                    <div className={`absolute inset-0 flex items-center justify-center p-0.5 fallback-chum ${user.avatarUrl ? 'invisible' : ''}`}>
                                                                        <ChumRenderer 
                                                                            size="w-full h-full" 
                                                                            activeAccessoriesOverride={user.activeAccessories}
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="flex-1 flex flex-col overflow-hidden">
                                                                    <span className="text-sm font-black text-(--text-main) truncate">{user.name}</span>
                                                                </div>
                                                                <div className="flex items-center gap-2 shrink-0">
                                                                    <button
                                                                        onClick={() => { lanternRef.current?.warpToUser(user.id); setIsSidebarOpenMobile(false); }}
                                                                        className="lg:opacity-0 group-hover/row:opacity-100 transition-opacity p-1.5 rounded-lg hover:bg-(--accent-teal)/10 text-(--text-muted) hover:text-(--accent-teal)"
                                                                    >
                                                                        <Crosshair size={14} />
                                                                    </button>
                                                                    <span className="text-xs font-black text-(--text-muted) bg-(--bg-dark) px-2 py-1 rounded-lg">
                                                                        {user.hours}h
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="rooms"
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                                            className="space-y-3 flex flex-col h-full"
                                        >
                                            <button
                                                onClick={() => setIsHostModalOpen(true)}
                                                className="w-full py-3.5 bg-(--accent-teal)/10 border-2 border-dashed border-(--accent-teal)/30 rounded-2xl text-(--accent-teal) text-xs font-black uppercase tracking-widest hover:bg-(--accent-teal)/20 hover:border-(--accent-teal) transition-all flex items-center justify-center gap-2 mb-2"
                                            >
                                                <Plus size={16} /> Host Sanctuary
                                            </button>

                                            <div className="flex flex-col min-h-0 pb-8 flex-1 overflow-y-auto custom-scrollbar">
                                                <h3 className="text-sm font-black text-(--text-main) flex items-center gap-2 mb-4 pb-4 border-b border-(--border-color) uppercase tracking-wide">
                                                    <Radio size={18} className="text-(--accent-teal)" /> active Sanctuaries
                                                </h3>
                                                <div className="space-y-3">
                                                    {combinedNetwork.filter(u => (u.status === 'hosting' || u.status === 'joined' || u.status === 'cafe') && u.roomCode).map(user => (
                                                        <div key={user.roomCode} className="p-4 rounded-3xl bg-(--bg-dark)/50 border border-(--border-color) hover:border-(--accent-teal)/40 transition-all cursor-pointer group/room"
                                                            onClick={() => router.push(`/room/${user.roomCode}`)}>
                                                            <div className="flex justify-between items-start mb-2">
                                                                <h4 className="text-xs font-black text-white group-hover/room:text-(--accent-teal) transition-colors truncate pr-2">{user.roomTitle || 'Sanctuary'}</h4>
                                                                <span className="text-[10px] bg-(--accent-teal)/10 text-(--accent-teal) px-2 py-0.5 rounded-full font-black uppercase">{user.status}</span>
                                                            </div>
                                                            {user.roomDescription && <p className="text-[10px] text-(--text-muted) italic line-clamp-1 mb-3">"{user.roomDescription}"</p>}
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-5 h-5 rounded-full bg-(--bg-dark) flex items-center justify-center text-[10px]">{user.chumLabel.split(' ')[0]}</div>
                                                                <span className="text-[10px] font-bold text-(--text-muted)">Hosted by {user.name}</span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {combinedNetwork.filter(u => (u.status === 'hosting' || u.status === 'joined' || u.status === 'cafe') && u.roomCode).length === 0 && (
                                                        <div className="text-center p-8 opacity-30">
                                                            <Radio size={32} className="mx-auto mb-2" />
                                                            <p className="text-[10px] font-black uppercase tracking-widest">No active Sanctuaries</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex-1 h-full rounded-[40px] overflow-hidden border border-(--border-color) shadow-xl relative min-h-0">
                <ThreeLanternNet
                    ref={lanternRef}
                    users={combinedNetwork}
                    isInitialLoading={isNetworkLoading}
                    isMaximized={isMaximized}
                    onToggleMaximize={() => setIsMaximized(!isMaximized)}
                    debrisSize={debrisSize}
                    debrisColor={debrisColor}
                    debrisCount={debrisCount}
                    debrisSpread={debrisSpread}
                />
            </div>
        </div >
    );
}
