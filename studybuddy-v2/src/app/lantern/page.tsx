"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Trophy, Radio, Users, Plus, X, Lock, Sparkles, Coffee, Waves, Settings, Shield } from "lucide-react";

// --- MOCK DATA GENERATOR ---
type Status = 'flowstate' | 'cafe' | 'idle';
interface LanternUser {
    id: string;
    name: string;
    chumLabel: string;
    status: Status;
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
    const names = ["Alex", "Jordan", "Taylor", "Casey", "Riley", "Sam", "Morgan", "Quinn", "Avery", "Blake"];
    const chums = ["👻 Ghost", "🦉 Owl", "🦊 Fox", "🐼 Panda", "🐸 Frog", "🤖 Bot"];
    const users: LanternUser[] = [];

    // Create a 12x12 invisible grid to ensure dots NEVER touch
    const gridCols = 12;
    const gridRows = 12;
    const occupied = new Set<string>();

    for (let i = 0; i < 45; i++) {
        let cx, cy;
        do {
            cx = Math.floor(Math.random() * gridCols);
            cy = Math.floor(Math.random() * gridRows);
        } while (occupied.has(`${cx},${cy}`));
        occupied.add(`${cx},${cy}`);

        const isHosting = Math.random() > 0.8;
        const statusVal = Math.random();

        users.push({
            id: `user-${i}`,
            name: names[Math.floor(Math.random() * names.length)] + (Math.floor(Math.random() * 99)),
            chumLabel: chums[Math.floor(Math.random() * chums.length)],
            status: statusVal > 0.6 ? 'flowstate' : (statusVal > 0.3 ? 'cafe' : 'idle'),
            hours: Math.floor(Math.random() * 500) + 10,
            isHosting,
            roomCode: isHosting ? Math.random().toString(36).substring(2, 6).toUpperCase() : undefined,
            isPremium: Math.random() > 0.7,
            gridX: cx,
            gridY: cy,
            // Jitter constraints keep them firmly inside their grid cell
            jitterX: (Math.random() - 0.5) * 60,
            jitterY: (Math.random() - 0.5) * 60,
        });
    }
    return users.sort((a, b) => b.hours - a.hours);
};

export default function LanternNetwork() {
    const [isMounted, setIsMounted] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [hoveredUser, setHoveredUser] = useState<LanternUser | null>(null);
    const [isHostModalOpen, setIsHostModalOpen] = useState(false);
    const [network] = useState<LanternUser[]>(generateMockNetwork);

    // Host Settings State
    const [roomName, setRoomName] = useState("Deep Work Session");
    const [roomMode, setRoomMode] = useState<'flowstate' | 'cafe'>('flowstate');
    const [roomCapacity, setRoomCapacity] = useState(5);
    const [isPasswordProtected, setIsPasswordProtected] = useState(false);
    const [roomVibe, setRoomVibe] = useState<'default' | 'void' | 'synthwave'>('default');

    useEffect(() => setIsMounted(true), []);
    if (!isMounted) return null;

    // Search Logic
    const filteredNetwork = network.filter(u =>
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.roomCode && u.roomCode.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    const getStatusColor = (status: Status) => {
        if (status === 'flowstate') return 'var(--accent-teal)';
        if (status === 'cafe') return 'var(--accent-yellow)';
        return 'var(--text-muted)';
    };

    return (
        <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-4rem)] gap-6 pb-8">

            {/* LEFT PANEL: Controls & Leaderboard */}
            <div className="w-full lg:w-80 flex flex-col gap-6 h-[600px] lg:h-full z-10 flex-shrink-0">
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-3xl shadow-sm">
                    <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center gap-2 mb-1">
                        <Radio size={24} className="text-[var(--accent-cyan)]" /> Lantern Net
                    </h1>
                    <p className="text-[var(--text-muted)] text-xs mb-5">You are not studying alone.</p>

                    <div className="relative mb-4">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                            type="text"
                            placeholder="Search user or code..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl pl-9 pr-3 py-2.5 text-sm text-[var(--text-main)] focus:outline-none focus:border-[var(--accent-cyan)] transition-colors"
                        />
                    </div>

                    <button
                        onClick={() => setIsHostModalOpen(true)}
                        className="w-full py-2.5 bg-[var(--bg-sidebar)] border border-[var(--border-color)] text-[var(--text-main)] hover:border-[var(--accent-cyan)] hover:text-[var(--accent-cyan)] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all group shadow-sm"
                    >
                        <Plus size={16} className="group-hover:rotate-90 transition-transform" /> Host a Room
                    </button>
                </div>

                {/* Leaderboard */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-5 flex-1 flex flex-col min-h-0 shadow-sm">
                    <h3 className="text-sm font-bold text-[var(--text-main)] flex items-center gap-2 mb-4 pb-4 border-b border-[var(--border-color)]">
                        <Trophy size={16} className="text-[var(--accent-yellow)]" /> Hall of Focus
                    </h3>
                    <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-2">
                        {filteredNetwork.slice(0, 20).map((user, index) => (
                            <div key={user.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-[var(--bg-dark)] transition-colors group cursor-default">
                                <div className="flex items-center gap-3">
                                    <span className={`text-xs font-bold w-4 text-center ${index < 3 ? 'text-[var(--accent-yellow)]' : 'text-[var(--text-muted)]'}`}>
                                        {index + 1}
                                    </span>
                                    <div className="flex flex-col">
                                        <span className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1">
                                            {user.name} {user.isPremium && <Sparkles size={10} className="text-[var(--accent-yellow)]" />}
                                        </span>
                                        <span className="text-[9px] text-[var(--text-muted)] flex items-center gap-1 uppercase tracking-wider">
                                            <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getStatusColor(user.status) }} />
                                            {user.status}
                                        </span>
                                    </div>
                                </div>
                                <span className="text-xs font-mono text-[var(--text-muted)] font-bold">{user.hours}h</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* RIGHT PANEL: The Void Map */}
            <div className="flex-1 bg-[#05080c] rounded-3xl border border-[var(--border-color)] shadow-2xl relative overflow-hidden group min-h-[500px]">
                {/* Background Grid & Vignette */}
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#05080c_100%)] z-0 pointer-events-none" />
                <div className="absolute inset-0 opacity-[0.03] z-0 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                {/* The Lantern Dots */}
                <div className="absolute inset-8 z-10 relative h-[calc(100%-4rem)] w-[calc(100%-4rem)]">
                    {filteredNetwork.map((user) => {
                        const color = getStatusColor(user.status);
                        const isHovered = hoveredUser?.id === user.id;

                        // 12x12 Grid Math
                        const cellWidth = 100 / 12;
                        const cellHeight = 100 / 12;
                        const leftPos = `calc(${(user.gridX * cellWidth) + (cellWidth / 2)}% + ${user.jitterX}px)`;
                        const topPos = `calc(${(user.gridY * cellHeight) + (cellHeight / 2)}% + ${user.jitterY}px)`;

                        return (
                            <div
                                key={user.id}
                                onMouseEnter={() => setHoveredUser(user)}
                                onMouseLeave={() => setHoveredUser(null)}
                                className="absolute cursor-pointer transition-transform duration-300 z-10"
                                style={{
                                    left: leftPos, top: topPos,
                                    transform: `translate(-50%, -50%) scale(${isHovered ? 1.5 : 1})`,
                                }}
                            >
                                {/* The Dot */}
                                <motion.div
                                    animate={{ opacity: [0.6, 1, 0.6] }}
                                    transition={{ duration: 2 + Math.random() * 2, repeat: Infinity }}
                                    className="w-3 h-3 rounded-full"
                                    style={{
                                        backgroundColor: color,
                                        boxShadow: `0 0 ${isHovered ? '20px' : '10px'} ${color}`,
                                        border: user.isHosting ? `2px solid #fff` : 'none'
                                    }}
                                />
                                {user.isHosting && (
                                    <div className="absolute -inset-1.5 border border-white/30 rounded-full animate-ping opacity-50" />
                                )}
                            </div>
                        );
                    })}

                    {/* Hover Card (Tooltip) */}
                    <AnimatePresence>
                        {hoveredUser && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="absolute z-50 pointer-events-none"
                                style={{
                                    left: `calc(${(hoveredUser.gridX * (100 / 12)) + (100 / 24)}% + ${hoveredUser.jitterX}px)`,
                                    top: `calc(${(hoveredUser.gridY * (100 / 12)) + (100 / 24)}% + ${hoveredUser.jitterY - 20}px)`,
                                    transform: 'translate(-50%, -100%)'
                                }}
                            >
                                <div className="bg-[var(--bg-card)]/90 backdrop-blur-md border border-[var(--border-color)] p-4 rounded-2xl shadow-2xl w-56 flex flex-col gap-3 pointer-events-auto">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="text-white font-bold text-sm flex items-center gap-1">
                                                {hoveredUser.name} {hoveredUser.isPremium && <Sparkles size={12} className="text-[var(--accent-yellow)]" />}
                                            </h3>
                                            <p className="text-[10px] text-[var(--text-muted)] font-mono">{hoveredUser.chumLabel}</p>
                                        </div>
                                        <div className="w-8 h-8 rounded-full flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-dark)] shadow-inner">
                                            <span className="text-sm">{hoveredUser.chumLabel.split(' ')[0]}</span>
                                        </div>
                                    </div>

                                    <div className="flex justify-between items-center bg-[var(--bg-dark)] rounded-lg p-2 border border-[var(--border-color)]">
                                        <div className="flex flex-col">
                                            <span className="text-[8px] uppercase tracking-widest text-[var(--text-muted)] font-bold">Status</span>
                                            <span className="text-xs font-bold capitalize" style={{ color: getStatusColor(hoveredUser.status) }}>{hoveredUser.status}</span>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <span className="text-[8px] uppercase tracking-widest text-[var(--text-muted)] font-bold">Total Focus</span>
                                            <span className="text-xs font-mono font-bold text-white">{hoveredUser.hours}h</span>
                                        </div>
                                    </div>

                                    {hoveredUser.isHosting && (
                                        <button className="w-full py-2 bg-[var(--accent-cyan)]/10 hover:bg-[var(--accent-cyan)]/20 border border-[var(--accent-cyan)]/30 text-[var(--accent-cyan)] rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors">
                                            <Users size={12} /> Join Room [{hoveredUser.roomCode}]
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* HOST ROOM MODAL */}
            <AnimatePresence>
                {isHostModalOpen && (
                    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setIsHostModalOpen(false)} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

                        <motion.div initial={{ scale: 0.95, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.95, opacity: 0, y: 20 }} className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-3xl w-full max-w-xl overflow-hidden relative z-10 shadow-2xl p-0 flex flex-col md:flex-row h-auto max-h-[90vh]">

                            {/* Standard Settings */}
                            <div className="w-full md:w-1/2 p-6 flex flex-col">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-bold text-[var(--text-main)] flex items-center gap-2">
                                        <Radio className="text-[var(--accent-cyan)]" /> Host Room
                                    </h2>
                                    <button onClick={() => setIsHostModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] md:hidden"><X size={20} /></button>
                                </div>

                                <div className="space-y-4 flex-1">
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Room Title</label>
                                        <input
                                            type="text"
                                            value={roomName}
                                            onChange={(e) => setRoomName(e.target.value)}
                                            className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-main)] text-sm rounded-xl px-4 py-3 focus:outline-none focus:border-[var(--accent-cyan)] transition-colors font-bold"
                                        />
                                    </div>

                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-widest text-[var(--text-muted)] mb-2 block">Focus Mode</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <button
                                                onClick={() => setRoomMode('flowstate')}
                                                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all ${roomMode === 'flowstate' ? 'bg-[var(--accent-teal)]/10 border-[var(--accent-teal)] text-[var(--accent-teal)]' : 'bg-[var(--bg-dark)] border-[var(--border-color)] text-[var(--text-muted)]'}`}
                                            >
                                                <Waves size={16} /> FlowState
                                            </button>
                                            <button
                                                onClick={() => setRoomMode('cafe')}
                                                className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-sm font-bold transition-all ${roomMode === 'cafe' ? 'bg-[var(--accent-yellow)]/10 border-[var(--accent-yellow)] text-[var(--accent-yellow)]' : 'bg-[var(--bg-dark)] border-[var(--border-color)] text-[var(--text-muted)]'}`}
                                            >
                                                <Coffee size={16} /> Cafe
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <button className="mt-6 w-full py-3 bg-[var(--accent-cyan)] text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-cyan-400 transition-colors">
                                    <Radio size={18} /> Broadcast Room
                                </button>
                            </div>

                            {/* Premium Settings Panel */}
                            <div className="w-full md:w-1/2 bg-[var(--bg-dark)] border-t md:border-t-0 md:border-l border-[var(--border-color)] p-6 flex flex-col relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-yellow)]/5 rounded-full blur-[50px] pointer-events-none" />

                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="text-sm font-bold text-[var(--accent-yellow)] flex items-center gap-2">
                                        <Sparkles size={16} /> Premium Features
                                    </h3>
                                    <button onClick={() => setIsHostModalOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-main)] hidden md:block"><X size={20} /></button>
                                </div>

                                <div className="space-y-4 flex-1">
                                    <div className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-xl p-3 flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5"><Users size={14} className="text-[var(--text-muted)]" /> Capacity</span>
                                            <span className="text-[10px] text-[var(--text-muted)]">Up to 50 users (Default: 5)</span>
                                        </div>
                                        <select
                                            value={roomCapacity}
                                            onChange={(e) => setRoomCapacity(Number(e.target.value))}
                                            className="bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-main)] text-sm rounded-lg px-2 py-1 outline-none"
                                        >
                                            <option value={5}>5 Users</option>
                                            <option value={15}>15 Users</option>
                                            <option value={50}>50 Users 👑</option>
                                        </select>
                                    </div>

                                    <div className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-xl p-3 flex justify-between items-center">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5"><Shield size={14} className="text-[var(--text-muted)]" /> Lock Room</span>
                                            <span className="text-[10px] text-[var(--text-muted)]">Require a password to enter</span>
                                        </div>
                                        <div className={`w-10 h-5 rounded-full relative transition-colors cursor-pointer ${isPasswordProtected ? "bg-[var(--accent-yellow)]" : "bg-[var(--border-color)]"}`} onClick={() => setIsPasswordProtected(!isPasswordProtected)}>
                                            <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white transition-transform ${isPasswordProtected ? "translate-x-5" : ""}`} />
                                        </div>
                                    </div>

                                    <div className="bg-[var(--bg-sidebar)] border border-[var(--border-color)] rounded-xl p-3 flex flex-col gap-2">
                                        <div className="flex flex-col mb-1">
                                            <span className="text-sm font-bold text-[var(--text-main)] flex items-center gap-1.5"><Sparkles size={14} className="text-[var(--text-muted)]" /> Custom Vibe</span>
                                            <span className="text-[10px] text-[var(--text-muted)]">Force an aesthetic for all visitors</span>
                                        </div>
                                        <select
                                            value={roomVibe}
                                            onChange={(e) => setRoomVibe(e.target.value as any)}
                                            className="w-full bg-[var(--bg-dark)] border border-[var(--border-color)] text-[var(--text-main)] text-sm rounded-lg px-2 py-2 outline-none"
                                        >
                                            <option value="default">Default (User's Choice)</option>
                                            <option value="void">Monastic Void</option>
                                            <option value="synthwave">Retro Synthwave</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="mt-4 p-3 rounded-xl bg-[var(--accent-yellow)]/10 border border-[var(--accent-yellow)]/20 flex gap-3 items-center">
                                    <Lock size={20} className="text-[var(--accent-yellow)] flex-shrink-0" />
                                    <div>
                                        <p className="text-xs font-bold text-[var(--accent-yellow)]">Unlock Pro Features</p>
                                        <p className="text-[10px] text-[var(--accent-yellow)]/70">Upgrade your account to access these host settings.</p>
                                    </div>
                                </div>
                            </div>

                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}