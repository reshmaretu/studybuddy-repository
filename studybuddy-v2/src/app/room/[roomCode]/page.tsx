"use client";

import React, { useEffect, useState, use, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { LogOut, Users, Play, Pause, RotateCcw, Sparkles, Shield, Lock, Activity, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useStudyStore } from "@/store/useStudyStore";

// --- RESOURCE DICTIONARIES ---
const THEMES = ['System Default Void', 'Midnight Sakura', 'Lofi Rain'];
const STATIC_BGS = ['Cozy Library', 'Rainy Window', 'Night City', 'Coffee Shop'];
const LIVE_BGS = ['Cyberpunk Alley (Pro)', 'Zen Waterfall (Pro)', 'Space Station (Pro)'];
const AUDIO_TRACKS = [
    { name: 'None', pro: false }, { name: 'White Noise', pro: false },
    { name: 'Brown Noise', pro: false }, { name: 'Lofi Beats 1', pro: false },
    { name: 'Deep Focus Ambient', pro: true }, { name: 'Binaural Alpha Waves', pro: true }
];

// --- CUSTOM DROPDOWN COMPONENT ---
const CustomSelect = ({ label, options, value, onChange, disabled = false, isPremiumUser = true }: any) => {
    const [isOpen, setIsOpen] = useState(false);
    return (
        <div className={`relative ${isOpen ? 'z-[100]' : 'z-10'}`}>
            <button
                disabled={disabled}
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-[#111111] border border-white/5 p-4 rounded-xl text-xs font-bold flex justify-between items-center transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-white/20'}`}
            >
                <span className={value.includes('(Pro)') && !isPremiumUser ? 'text-white/40' : 'text-[#84ccb9]'}>{value}</span>
                <ChevronDown size={14} className={`text-white/40 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden max-h-48 overflow-y-auto custom-scrollbar"
                    >
                        {options.map((opt: any) => {
                            const optName = typeof opt === 'string' ? opt : opt.name;
                            const isProLocked = (typeof opt === 'string' && opt.includes('(Pro)') && !isPremiumUser) || (opt.pro && !isPremiumUser);
                            return (
                                <button
                                    key={optName} disabled={isProLocked}
                                    onClick={() => { onChange(optName); setIsOpen(false); }}
                                    className={`w-full text-left px-4 py-3 text-xs font-bold flex items-center justify-between transition-colors ${value === optName ? 'bg-[#84ccb9]/10 text-[#84ccb9]' : 'text-white/60 hover:bg-white/5 hover:text-white'
                                        } ${isProLocked ? 'opacity-30 cursor-not-allowed' : ''}`}
                                >
                                    {optName}
                                    {isProLocked && <Lock size={12} />}
                                    {value === optName && <Check size={12} />}
                                </button>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default function StudyRoom({ params }: { params: Promise<{ roomCode: string }> }) {
    const channelRef = useRef<any>(null);
    const { roomCode } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { isPremiumUser } = useStudyStore();

    // --- STATES ---
    const [status, setStatus] = useState<'DRAFT' | 'LAUNCHING' | 'ACTIVE'>('DRAFT');
    const [isHost, setIsHost] = useState(false);
    const [hostId, setHostId] = useState<string | null>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [countdown, setCountdown] = useState(5);
    const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

    // --- BROADCAST SETTINGS ---
    const [settings, setSettings] = useState({
        name: searchParams.get('title') || "New Sanctuary",
        mode: 'pomodoro',
        workDuration: 25,
        breakDuration: 5,
        vibeCategory: 'Theme Default',
        vibeAsset: THEMES[0],
        audioTrack: 'None',
        showVisualizer: false,
        isGhostMode: false,
    });

    const [secondsLeft, setSecondsLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [isBreak, setIsBreak] = useState(false);

    // 1. PAGE PROTECTION (Before Unload)
    useEffect(() => {
        const handleBeforeUnload = (e: BeforeUnloadEvent) => {
            if (status === 'DRAFT' || status === 'ACTIVE') {
                e.preventDefault();
                e.returnValue = '';
            }
        };
        window.addEventListener('beforeunload', handleBeforeUnload);
        return () => window.removeEventListener('beforeunload', handleBeforeUnload);
    }, [status]);

    // 2. INIT REALTIME & AUTH
    useEffect(() => {
        const initRoom = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return router.push('/lantern');

            const { data: profile } = await supabase.from('profiles')
                .select('display_name, full_name')
                .eq('id', user.id)
                .single();

            const userName = profile?.display_name || profile?.full_name || user.email?.split('@')[0] || "Chum";

            const { data: room } = await supabase.from('rooms').select('*').eq('room_code', roomCode).single();
            if (room?.host_id === user.id) setIsHost(true);
            setHostId(room?.host_id);

            const channel = supabase.channel(`room:${roomCode}`, {
                config: { presence: { key: user.id } }
            });
            channelRef.current = channel;

            channel
            channel
                .on('presence', { event: 'sync' }, () => setParticipants(Object.values(channel.presenceState()).flat()))
                .on('broadcast', { event: 'room_closed' }, () => {
                    alert("The Architect has abandoned the sanctuary.");
                    // ⚡ CLEANUP BEFORE REDIRECT
                    supabase.removeChannel(channel);
                    router.push('/lantern');
                })
                .on('broadcast', { event: 'launch' }, () => setStatus('LAUNCHING'))
                // 👇 FIXED: Listen for the host destroying the room
                .on('broadcast', { event: 'room_closed' }, () => {
                    alert("The Architect has abandoned the sanctuary.");
                    router.push('/lantern');
                })
                .subscribe(async (s) => {
                    if (s === 'SUBSCRIBED') await channel.track({ id: user.id, name: userName });
                });
        };
        initRoom();
        return () => {
            // ⚡ AUTO-CLEANUP on unmount (e.g., clicking back button)
            if (channelRef.current) {
                supabase.removeChannel(channelRef.current);
            }
        };
    }, [roomCode, router]);

    const handleInitializeSanctuary = async () => {
        // 1. Update local UI to start countdown
        setStatus('LAUNCHING');

        // ⚡ 2. Persist to DB: This unlocks the room for the global Map
        const { error } = await supabase
            .from('rooms')
            .update({ status: 'ACTIVE' })
            .eq('room_code', roomCode);

        if (error) {
            console.error("Architect Sync Error:", error.message);
            // Fallback: stay in DRAFT if the DB fails to update
            setStatus('DRAFT');
            return;
        }

        // 3. Broadcast to Joiners: Use the existing channelRef
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'launch'
            });
        }
    };

    // 3. BROADCAST UPDATES
    const updateSettings = (updates: Partial<typeof settings>) => {
        if (!isHost) return;
        const newSettings = { ...settings, ...updates };
        setSettings(newSettings);

        if (status === 'DRAFT' && updates.workDuration) setSecondsLeft(updates.workDuration * 60);

        supabase.channel(`room:${roomCode}`).send({ type: 'broadcast', event: 'sync_settings', payload: newSettings });
    };

    // 👇 FIXED: Properly destroy the room and kick everyone
    const handleAbandon = async () => {
        const channel = supabase.channel(`room:${roomCode}`); // Use same name as subscription

        if (isHost) {
            // 1. Tell everyone else to leave via broadcast
            await channel.send({ type: 'broadcast', event: 'room_closed' });

            // 2. Delete the room from the database
            await supabase.from('rooms').delete().eq('room_code', roomCode);
        }

        // ⚡ THE FIX: Explicitly remove the channel to kill the Realtime subscription
        // This prevents joiners from getting "Ghost" notifications after they leave.
        await supabase.removeChannel(channel);

        router.push('/lantern');
    };

    // 4. LAUNCH SEQUENCE & ENGINE
    useEffect(() => {
        if (status === 'LAUNCHING') {
            if (countdown > 0) {
                const t = setTimeout(() => setCountdown(countdown - 1), 1000);
                return () => clearTimeout(t);
            } else {
                setStatus('ACTIVE');
                if (settings.mode === 'stopwatch' || settings.mode === 'free') setSecondsLeft(0);
                else setSecondsLeft(settings.workDuration * 60);

                // 👇 FIXED: Auto-start the timer!
                setIsActive(true);
            }
        }
    }, [status, countdown, settings]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (status === 'ACTIVE' && isActive) {
            interval = setInterval(() => {
                setSecondsLeft(prev => {
                    if (settings.mode === 'stopwatch' || settings.mode === 'free') return prev + 1;
                    if (prev <= 1) {
                        if (settings.mode === 'pomodoro') {
                            const nextBreak = !isBreak;
                            setIsBreak(nextBreak);
                            setIsActive(false);
                            return nextBreak ? settings.breakDuration * 60 : settings.workDuration * 60;
                        }
                        setIsActive(false);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [isActive, status, isBreak, settings]);

    return (
        <div className={`h-full w-full flex flex-row overflow-hidden transition-colors duration-1000 ${isBreak ? 'bg-[#0f2924]' : 'bg-[#05080c]'}`}>

            {/* ARCHITECT SIDEBAR */}
            <AnimatePresence>
                {status === 'DRAFT' && isHost && (
                    <motion.aside
                        initial={{ x: -350, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -350, opacity: 0 }}
                        className="w-[340px] flex-shrink-0 h-[calc(100vh-48px)] my-6 ml-6 rounded-[32px] bg-[#111111]/90 backdrop-blur-2xl border border-white/5 p-6 flex flex-col z-50 shadow-2xl"
                    >
                        <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar pb-6">
                            <h2 className="text-[#e8c366] font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                                <Sparkles size={14} /> Sanctuary Architect
                            </h2>

                            {/* Timer Protocol */}
                            <section className="space-y-4">
                                <label className="text-[10px] font-black text-white/30 uppercase">Protocol</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {['pomodoro', 'fixed', 'free', 'stopwatch'].map(m => (
                                        <button
                                            key={m} disabled={m === 'stopwatch' && !isPremiumUser}
                                            onClick={() => updateSettings({ mode: m })}
                                            className={`p-2.5 rounded-xl border text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 ${settings.mode === m ? 'border-[#84ccb9] bg-[#84ccb9]/10 text-[#84ccb9]' : 'border-white/5 text-white/40 hover:text-white'
                                                } ${m === 'stopwatch' && !isPremiumUser ? 'opacity-30 grayscale cursor-not-allowed' : ''}`}
                                        >
                                            {m} {m === 'stopwatch' && <Shield size={10} />}
                                        </button>
                                    ))}
                                </div>

                                {/* Sliders */}
                                {(settings.mode === 'pomodoro' || settings.mode === 'fixed') && (
                                    <div className="p-5 bg-white/5 rounded-2xl border border-white/5 space-y-5">
                                        <div>
                                            <div className="flex justify-between mb-3 text-[10px] font-bold text-white/40 uppercase">
                                                <span>Work Block</span>
                                                <span className="text-[#84ccb9]">{settings.workDuration}m</span>
                                            </div>
                                            <input type="range" min="1" max="120" value={settings.workDuration} onChange={(e) => updateSettings({ workDuration: Number(e.target.value) })} className="w-full accent-[#84ccb9]" />
                                        </div>
                                        {settings.mode === 'pomodoro' && (
                                            <div>
                                                <div className="flex justify-between mb-3 text-[10px] font-bold text-white/40 uppercase">
                                                    <span>Break Block</span>
                                                    <span className="text-[#84ccb9]">{settings.breakDuration}m</span>
                                                </div>
                                                <input type="range" min="1" max="60" value={settings.breakDuration} onChange={(e) => updateSettings({ breakDuration: Number(e.target.value) })} className="w-full accent-[#84ccb9]" />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </section>

                            {/* Custom Visual Dropdowns */}
                            <section className="space-y-3">
                                <label className="text-[10px] font-black text-white/30 uppercase">Visual Atmosphere</label>
                                <CustomSelect
                                    value={settings.vibeCategory}
                                    options={['Theme Default', 'Static Lo-Fi', 'Live Lo-Fi (Pro)']}
                                    onChange={(cat: string) => {
                                        const defaultAsset = cat === 'Theme Default' ? THEMES[0] : cat === 'Static Lo-Fi' ? STATIC_BGS[0] : LIVE_BGS[0];
                                        updateSettings({ vibeCategory: cat, vibeAsset: defaultAsset });
                                    }}
                                />
                                <CustomSelect
                                    value={settings.vibeAsset}
                                    options={settings.vibeCategory === 'Theme Default' ? THEMES : settings.vibeCategory === 'Static Lo-Fi' ? STATIC_BGS : LIVE_BGS}
                                    onChange={(asset: string) => updateSettings({ vibeAsset: asset })}
                                    isPremiumUser={isPremiumUser}
                                />
                            </section>

                            <section className="space-y-3">
                                <label className="text-[10px] font-black text-white/30 uppercase">Audio Track</label>
                                <CustomSelect
                                    value={settings.audioTrack}
                                    options={AUDIO_TRACKS}
                                    onChange={(track: string) => updateSettings({ audioTrack: track })}
                                    isPremiumUser={isPremiumUser}
                                />
                            </section>

                            {/* Ghost Mode & Pro Toggles */}
                            <section className="pt-4 border-t border-white/5 space-y-4">
                                <div className={`flex items-center justify-between ${!isPremiumUser && 'opacity-30'}`}>
                                    <span className="text-[10px] font-bold text-white/50 uppercase flex items-center gap-2">Visualizer {!isPremiumUser && <Lock size={10} />}</span>
                                    <button disabled={!isPremiumUser} onClick={() => updateSettings({ showVisualizer: !settings.showVisualizer })} className={`w-10 h-5 rounded-full relative transition-colors ${settings.showVisualizer ? 'bg-[#e8c366]' : 'bg-white/10'}`}>
                                        <motion.div layout className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full" style={{ x: settings.showVisualizer ? 20 : 0 }} />
                                    </button>
                                </div>
                                <div className={`flex items-center justify-between ${!isPremiumUser && 'opacity-30'}`}>
                                    <span className="text-[10px] font-bold text-white/50 uppercase flex items-center gap-2">Ghost Mode {!isPremiumUser && <Lock size={10} />}</span>
                                    <button disabled={!isPremiumUser} onClick={() => updateSettings({ isGhostMode: !settings.isGhostMode })} className={`w-10 h-5 rounded-full relative transition-colors ${settings.isGhostMode ? 'bg-[#84ccb9]' : 'bg-white/10'}`}>
                                        <motion.div layout className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full" style={{ x: settings.isGhostMode ? 20 : 0 }} />
                                    </button>
                                </div>
                            </section>
                        </div>

                        <div className="pt-6 border-t border-white/5 space-y-3">
                            <button
                                onClick={handleInitializeSanctuary}
                                className="w-full py-4 bg-[#84ccb9] text-black rounded-2xl font-black uppercase text-xs hover:bg-[#a1d9cc] transition-colors"
                            >
                                Initialize Sanctuary
                            </button>

                            <button
                                onClick={() => setShowAbandonConfirm(true)}
                                className="w-full py-3 text-white/30 text-[10px] font-bold uppercase hover:text-red-400 transition-colors"
                            >
                                Abandon Blueprint
                            </button>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* MAIN TIMER AREA */}
            <main className="flex-1 min-w-0 relative flex flex-col p-8 z-10">
                <header className="flex justify-between items-center z-20">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-white">{settings.name} <span className="text-white/20 font-mono text-sm ml-2">#{roomCode}</span></h1>
                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] mt-1 ${isBreak ? 'text-white/60' : 'text-[#84ccb9]'}`}>
                            {status === 'DRAFT' ? "Blueprint Phase" : isBreak ? "☕ Recovery Phase" : "⚡ Focus Protocol Active"}
                        </p>
                    </div>
                    <button onClick={() => setShowAbandonConfirm(true)} className="flex items-center gap-2 text-xs font-bold text-white/40 hover:text-red-400 transition-colors bg-white/5 px-4 py-2 rounded-xl">
                        <LogOut size={14} /> Leave
                    </button>
                </header>

                {/* VISUALIZER PLACEHOLDER */}
                {settings.showVisualizer && (
                    <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
                        <Activity size={400} className="text-[#e8c366]" />
                    </div>
                )}

                <div className="flex-1 flex flex-col items-center justify-center z-10">

                    {status === 'DRAFT' && !isHost && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-[32px] text-center max-w-md w-full shadow-2xl"
                        >
                            <div className="w-12 h-12 border-4 border-[#84ccb9]/20 border-t-[#84ccb9] rounded-full animate-spin mx-auto mb-6" />
                            <h3 className="text-[#84ccb9] font-black uppercase tracking-[0.2em] text-xs mb-2">Architect is Constructing</h3>

                            <div className="space-y-4 mt-6 text-left bg-white/5 p-5 rounded-2xl border border-white/5">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-white/40 uppercase flex-shrink-0">Protocol</span>
                                    <span className="text-xs font-bold text-white uppercase truncate text-right ml-4 max-w-[180px]">{settings.mode}</span>
                                </div>
                                {(settings.mode === 'pomodoro' || settings.mode === 'fixed') && (
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-white/40 uppercase flex-shrink-0">Duration</span>
                                        <span className="text-xs font-bold text-white truncate text-right ml-4 max-w-[180px]">{settings.workDuration}m</span>
                                    </div>
                                )}
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-white/40 uppercase flex-shrink-0">Atmosphere</span>
                                    {/* 👇 FIXED: max-w increased to 180px and text right-aligned to prevent awkward cutoffs */}
                                    <span className="text-xs font-bold text-white truncate text-right ml-4 max-w-[180px]">{settings.vibeAsset}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-white/40 uppercase flex-shrink-0">Audio</span>
                                    {/* 👇 FIXED: max-w increased to 180px */}
                                    <span className="text-xs font-bold text-white truncate text-right ml-4 max-w-[180px]">{settings.audioTrack}</span>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {status === 'ACTIVE' && (!settings.isGhostMode || isHost) && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-white/30 mb-2 block">
                                {settings.mode === 'stopwatch' || settings.mode === 'free' ? "Session Time" : "Session Progress"}
                            </span>
                            <div className="text-[14rem] md:text-[18rem] font-black tabular-nums leading-none tracking-tighter drop-shadow-2xl text-white">
                                {Math.floor(secondsLeft / 60).toString().padStart(2, '0')}:{(secondsLeft % 60).toString().padStart(2, '0')}
                            </div>
                            <div className="flex justify-center gap-4 mt-10">
                                <button onClick={() => setIsActive(!isActive)} className="px-12 py-5 bg-[#84ccb9] text-black rounded-[24px] font-black text-xl hover:scale-105 transition-all flex items-center gap-3 shadow-[0_0_30px_rgba(132,204,185,0.2)]">
                                    {isActive ? <><Pause fill="currentColor" /> Pause</> : <><Play fill="currentColor" /> Initiate</>}
                                </button>
                                <button onClick={() => { setIsActive(false); setSecondsLeft(settings.mode === 'stopwatch' || settings.mode === 'free' ? 0 : settings.workDuration * 60); }} className="p-5 bg-white/5 rounded-[24px] text-white/40 hover:text-white border border-white/5 transition-all hover:bg-white/10">
                                    <RotateCcw size={24} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </div>

                {/* 5S LAUNCH OVERLAY */}
                <AnimatePresence>
                    {status === 'LAUNCHING' && (
                        <motion.div exit={{ opacity: 0 }} className="absolute inset-0 z-[100] bg-[#05080c] flex flex-col items-center justify-center">
                            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-[18rem] font-black text-white">{countdown}</motion.div>
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[#84ccb9]">Deploying Protocol</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* RIGHT PRESENCE SIDEBAR */}
            <aside className="w-72 flex-shrink-0 border-l border-white/5 z-20 hidden lg:flex flex-col bg-black/20 p-8">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-white/30 mb-6 flex items-center gap-2">
                    <Users size={14} /> Presence ({participants.length})
                </h3>
                <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar">
                    {participants.map(p => {
                        const isThisUserTheHost = p.id === hostId;

                        return (
                            <div key={p.id} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${isThisUserTheHost ? 'bg-[#84ccb9]/10 border-[#84ccb9]/30' : 'bg-white/5 border-white/5'}`}>
                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-lg shadow-inner">
                                    {isThisUserTheHost ? '👑' : '👻'}
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-bold text-white truncate max-w-[100px]">{p.name}</span>
                                        {isThisUserTheHost && (
                                            <span className="text-[8px] bg-[#84ccb9] text-black px-1.5 py-0.5 rounded uppercase font-black tracking-wider flex-shrink-0">
                                                Host
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[#84ccb9] mt-0.5">Focusing</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </aside>

            {/* ABANDON CONFIRMATION MODAL */}
            <AnimatePresence>
                {showAbandonConfirm && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-sm p-6">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#111111] border border-white/10 p-10 rounded-[40px] max-w-sm text-center shadow-2xl">
                            <h3 className="text-xl font-black text-white mb-2">{isHost ? "Abandon Blueprint?" : "Sever Connection?"}</h3>
                            <p className="text-sm text-white/40 mb-8 font-medium">You will be returned to the Lantern Network map.</p>
                            <div className="flex flex-col gap-3">
                                {/* 👇 FIXED: Changed from router.push to handleAbandon to ensure room cleanup */}
                                <button onClick={handleAbandon} className="w-full py-4 bg-red-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 transition-colors">Confirm Exit</button>
                                <button onClick={() => setShowAbandonConfirm(false)} className="w-full py-4 bg-white/5 text-white/60 hover:text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-colors">Stay in Room</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div >
    );
}