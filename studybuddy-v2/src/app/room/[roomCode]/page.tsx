"use client";

import React, { useEffect, useState, use, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Timer, Info, LogOut, Users, Play, Pause, RotateCcw, Sparkles, Shield, Lock, Activity, ChevronDown, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { useStudyStore } from "@/store/useStudyStore";

// --- RESOURCE DICTIONARIES ---
const ROOM_THEMES = [
    { id: 'deep-teal', name: 'Deep Teal', premium: false },
    { id: 'dark-forest', name: 'Dark Forest', premium: false },
    { id: 'light', name: 'Light Mode', premium: false },
    { id: 'sakura', name: 'Sakura Sanctuary', premium: true },
    { id: 'academia', name: 'Dark Academia', premium: true },
    { id: 'lofi', name: 'Lofi Sunset', premium: true },
    { id: 'nordic', name: 'Nordic Frost', premium: true },
    { id: 'e-ink', name: 'E-Ink (Obsidian)', premium: true },
];
const STATIC_BGS = ['Cozy Library', 'Rainy Window', 'Night City', 'Coffee Shop'];
const LIVE_BGS = ['Cyberpunk Alley (Pro)', 'Zen Waterfall (Pro)', 'Space Station (Pro)'];
const AUDIO_TRACKS = [
    { name: 'None', pro: false }, { name: 'White Noise', pro: false },
    { name: 'Brown Noise', pro: false }, { name: 'Lofi Beats 1', pro: false },
    { name: 'Relaxing Rain', pro: false },
    { name: 'Deep Focus Ambient', pro: true }, { name: 'Binaural Alpha Waves', pro: true }
];

const CustomSelect = ({ options, value, onChange, disabled = false, isPremiumUser = true, isOpen, onToggle }: any) => {
    return (
        <div className={`relative ${isOpen ? 'z-[100]' : 'z-10'}`}>
            <button
                type="button"
                disabled={disabled}
                onClick={onToggle} // ⚡ Controlled by parent
                className={`w-full bg-[var(--bg-card)] border border-[var(--border-color)] p-4 rounded-xl text-xs font-bold flex justify-between items-center transition-all ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-[var(--text-muted)]'}`}
            >
                <span className={(typeof value === 'string' && value.includes('(Pro)') && !isPremiumUser) ? 'text-[var(--text-muted)]' : 'text-[var(--accent-teal)]'}>{value}</span>
                <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-card)] border border-[var(--border-color)] rounded-xl shadow-2xl z-[110] overflow-hidden max-h-48 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    >
                        {options.map((opt: any) => {
                            const optName = typeof opt === 'string' ? opt : opt.name;
                            const isProLocked = (typeof opt === 'string' && opt.includes('(Pro)') && !isPremiumUser) || (opt.pro && !isPremiumUser);
                            return (
                                <button
                                    key={optName} disabled={isProLocked}
                                    onClick={() => { onChange(optName); onToggle(); }}
                                    className={`w-full text-left px-4 py-3 text-xs font-bold flex items-center justify-between transition-colors ${value === optName ? 'bg-[var(--accent-teal)]/10 text-[var(--accent-teal)]' : 'text-[var(--text-muted)] hover:bg-[var(--bg-sidebar)] hover:text-[var(--text-main)]'} ${isProLocked ? 'opacity-30 cursor-not-allowed' : ''}`}
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
    const [isRoomPremium, setIsRoomPremium] = useState(false);

    // --- STATES ---
    const [status, setStatus] = useState<'DRAFT' | 'LAUNCHING' | 'ACTIVE'>('DRAFT');
    const [isHost, setIsHost] = useState(false);
    const [hostId, setHostId] = useState<string | null>(null);
    const [participants, setParticipants] = useState<any[]>([]);
    const [countdown, setCountdown] = useState(5);
    const [showAbandonConfirm, setShowAbandonConfirm] = useState(false);

    // --- BROADCAST SETTINGS (Must come FIRST) ---
    const [settings, setSettings] = useState({
        name: searchParams.get('title') || "New Sanctuary",
        mode: 'pomodoro',
        workDuration: 25,
        breakDuration: 5,
        longBreakDuration: 15,
        cyclesBeforeLongBreak: 4,
        currentCycle: 1,
        vibeCategory: 'Theme Default',
        vibeAsset: 'deep-teal', // Default theme ID
        roomTheme: null as string | null, // null = host hasn't changed, use personal theme
        audioTrack: 'None',
        showVisualizer: false,
        isGhostMode: false,
    });

    // --- THEME RESOLUTION ---
    // Resolved theme: host's choice > personal localStorage theme > deep-teal
    const resolvedTheme = settings.roomTheme || (typeof window !== 'undefined' ? localStorage.getItem('appTheme') : null) || 'deep-teal';

    const [secondsLeft, setSecondsLeft] = useState(25 * 60);
    const [isActive, setIsActive] = useState(false);
    const [isBreak, setIsBreak] = useState(false);

    // --- NEW SYNC STATES & REF (Must come AFTER settings and secondsLeft) ---
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [isSyncing, setIsSyncing] = useState(false);
    const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

    // ⚡ Now this works because secondsLeft, isActive, etc. already exist!
    const timerStateRef = useRef({
        secondsLeft, isActive, status, isBreak, 
        currentCycle: settings.currentCycle, 
        vibeAsset: settings.vibeAsset,
        vibeCategory: settings.vibeCategory,
        audioTrack: settings.audioTrack,
        showVisualizer: settings.showVisualizer,
        isGhostMode: settings.isGhostMode,
        roomTheme: settings.roomTheme
    });

    useEffect(() => {
        timerStateRef.current = {
            secondsLeft,
            isActive,
            status,
            isBreak,
            currentCycle: settings.currentCycle,
            vibeAsset: settings.vibeAsset,
            vibeCategory: settings.vibeCategory,
            audioTrack: settings.audioTrack,
            showVisualizer: settings.showVisualizer,
            isGhostMode: settings.isGhostMode,
            roomTheme: settings.roomTheme
        };
    }, [secondsLeft, isActive, status, isBreak, settings]);

    // ⚡ Global Resonance Handler (Ensure AudioContext resumes on click)
    useEffect(() => {
        const resumeAudio = () => {
            const ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
            if (ctx && ctx.state === 'suspended') ctx.resume();
        };
        window.addEventListener('click', resumeAudio);
        return () => window.removeEventListener('click', resumeAudio);
    }, []);

// --- STABLE AUDIO ENGINE (Outside to prevent re-creation) ---
const MediaEngine = ({ settings, isActive, onAnalyserCreated }: { settings: any, isActive: boolean, onAnalyserCreated?: (analyser: AnalyserNode) => void }) => {
    const audioRef = useRef<HTMLAudioElement>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const analyzerRef = useRef<AnalyserNode | null>(null);

    // ⚡ Track changes to the audio source
    useEffect(() => {
        if (!audioRef.current) return;
        
        // Lower volume significantly when paused to keep it "atmosperic" without being loud
        audioRef.current.volume = isActive ? 0.6 : 0.2;

        if (isActive) {
            audioRef.current.play().catch(() => {});
        } else {
            // Keep looping in background if requested, or pause
            // For StudyBuddy, we keep it playing at low vol for "Atmosphere"
        }
    }, [isActive]);

    // ⚡ Robust WebAudio Graph
    useEffect(() => {
        if (!audioRef.current || !onAnalyserCreated || settings.audioTrack === 'None') return;

        try {
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }

            const ctx = audioContextRef.current;
            if (ctx.state === 'suspended') ctx.resume();

            // ⚡ createMediaElementSource can ONLY be called once per element
            if (!sourceRef.current) {
                sourceRef.current = ctx.createMediaElementSource(audioRef.current);
                analyzerRef.current = ctx.createAnalyser();
                analyzerRef.current.fftSize = 256;
                
                sourceRef.current.connect(analyzerRef.current);
                analyzerRef.current.connect(ctx.destination);
                
                onAnalyserCreated(analyzerRef.current);
            }
        } catch (e) {
            console.warn("WebAudio Node already connected or device error:", e);
        }
    }, [settings.audioTrack, onAnalyserCreated]);

    if (settings.audioTrack === 'None') return null;

    const fileName = settings.audioTrack.toLowerCase().replace(/ /g, '_');
    const audioPath = `/assets/audio/${fileName}.mp3`;

    return (
        <audio
            ref={audioRef}
            src={audioPath}
            crossOrigin="anonymous" 
            autoPlay
            loop
            className="hidden"
        />
    );
};

const Visualizer = ({ analyser, isActive }: { analyser: AnalyserNode | null, isActive: boolean }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        if (!analyser || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d')!;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let animationId: number;

        const draw = () => {
            animationId = requestAnimationFrame(draw);
            analyser.getByteFrequencyData(dataArray);

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            const barWidth = (canvas.width / bufferLength) * 2.5;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const barHeight = (dataArray[i] / 255) * (canvas.height / 2);
                const opacity = isActive ? 0.8 : 0.2;
                
                // Teal Pulse
                ctx.fillStyle = `rgba(45, 212, 191, ${opacity})`;

                // Symmetry Draw
                ctx.fillRect(x, canvas.height / 2 - barHeight, barWidth, barHeight);
                ctx.fillRect(x, canvas.height / 2, barWidth, barHeight);

                x += barWidth + 1;
            }
        };

        draw();
        return () => cancelAnimationFrame(animationId);
    }, [analyser, isActive]);

    return <canvas ref={canvasRef} width={600} height={150} className="w-full max-w-2xl opacity-40 mix-blend-screen pointer-events-none" />;
};

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
        let activeChannel: any = null;

        const initRoom = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return router.push('/lantern');
            setCurrentUserId(user.id); // ⚡ Track ID for the "You" effect

            // 1. Fetch Room Data first to establish Host context
            let roomData = null;
            for (let i = 0; i < 3; i++) {
                const { data } = await supabase.from('rooms').select('*').eq('room_code', roomCode).single();
                if (data) { roomData = data; break; }
                await new Promise(r => setTimeout(r, 800));
            }

            if (!roomData) return router.push('/lantern');

            const isActuallyHost = roomData.host_id === user.id;
            setIsHost(isActuallyHost);
            setHostId(roomData.host_id);

            // 2. ⚡ FETCH CURRENT USER DETAILS (For Presence)
            const { data: myData } = await supabase
                .from('profiles')
                .select(`
                    display_name, 
                    full_name, 
                    is_premium,
                    user_stats ( is_premium ),
                    chum_wardrobe ( base_emoji, hat_emoji )
                `)
                .eq('id', user.id)
                .single();

            const myProfile: any = myData;
            const resolvedName = myProfile?.display_name || myProfile?.full_name || user.email?.split('@')[0] || "Chum";
            
            const myWardrobe = Array.isArray(myProfile?.chum_wardrobe) ? myProfile.chum_wardrobe[0] : myProfile?.chum_wardrobe;
            const resolvedAvatar = myWardrobe ? `${myWardrobe.base_emoji || "👻"}${myWardrobe.hat_emoji || ""}` : "👻";

            // 3. ⚡ FETCH HOST PREMIUM STATUS (For Room Capabilities)
            if (isActuallyHost) {
                setIsRoomPremium(myProfile?.is_premium || myProfile?.user_stats?.[0]?.is_premium || false);
            } else {
                const { data: hostProfile } = await supabase
                    .from('profiles')
                    .select('is_premium, user_stats(is_premium)')
                    .eq('id', roomData.host_id)
                    .single();
                
                const hp: any = hostProfile;
                setIsRoomPremium(hp?.is_premium || hp?.user_stats?.[0]?.is_premium || false);
            }

            if (isActuallyHost && roomData.status === 'DRAFT') {
                setStatus('DRAFT');
            } else if (roomData.status === 'ACTIVE') {
                setStatus('ACTIVE');
                setIsActive(true);
            }

            // ⚡ MODE FIX: Map 'flowstate' or 'cafe' DB values back to 'pomodoro' to prevent UI breakage
            const safeMode = (roomData.mode === 'flowstate' || roomData.mode === 'cafe') ? 'pomodoro' : roomData.mode;

            // 🚀 PHASE SYNC
            if (roomData.status === 'ACTIVE') {
                setStatus('ACTIVE');
                setIsActive(true);
                setSettings(s => ({
                    ...s, name: roomData.name || s.name, mode: safeMode || s.mode,
                    workDuration: roomData.work_duration || s.workDuration, breakDuration: roomData.break_duration || s.breakDuration
                }));
                setSecondsLeft(roomData.work_duration * 60);
            } else {
                setSettings(s => ({
                    ...s, name: roomData.name || s.name, mode: safeMode || s.mode, workDuration: roomData.work_duration || s.workDuration
                }));
            }

            await supabase.from('profiles').update({
                status: isActuallyHost ? (roomData.status === 'ACTIVE' ? 'hosting' : 'drafting') : 'joined'
            }).eq('id', user.id);

            const channel = supabase.channel(`room:${roomCode}`, { config: { presence: { key: user.id } } });
            activeChannel = channel;
            channelRef.current = channel;

            channel
                .on('presence', { event: 'sync' }, () => {
                    const state = channel.presenceState();
                    setParticipants(Object.values(state).flat());
                })
                .on('broadcast', { event: 'launch' }, () => setStatus('LAUNCHING'))
                .on('broadcast', { event: 'sync_settings' }, ({ payload }) => {
                    // ⚡ INSTANT SETTINGS SYNC FOR JOINERS
                    setSettings(prev => ({ ...prev, ...payload }));
                    if (status === 'DRAFT') setSecondsLeft(payload.workDuration * 60);
                })
                .on('broadcast', { event: 'room_closed' }, () => router.push('/lantern'))
                // 🤝 THE HANDSHAKE: Joiner asks, Host answers
                .on('broadcast', { event: 'request_sync' }, () => {
                    if (isActuallyHost) { // Host broadcasts current time
                        channel.send({ type: 'broadcast', event: 'sync_response', payload: timerStateRef.current });
                    }
                })
                .on('broadcast', { event: 'sync_response' }, ({ payload }) => {
                    if (!isActuallyHost) { // Joiner receives time
                        setSecondsLeft(payload.secondsLeft);
                        setIsActive(payload.isActive);
                        setStatus(payload.status);
                        setIsBreak(payload.isBreak);
                        
                        // ⚡ SYNC ALL SETTINGS (Not just currentCycle)
                        setSettings(prev => ({ 
                            ...prev, 
                            currentCycle: payload.currentCycle,
                            vibeAsset: payload.vibeAsset,
                            vibeCategory: payload.vibeCategory,
                            audioTrack: payload.audioTrack,
                            showVisualizer: payload.showVisualizer,
                            isGhostMode: payload.isGhostMode,
                            roomTheme: payload.roomTheme
                        }));
                        setIsSyncing(false); // Remove loading modal!
                    }
                })
                .subscribe(async (s) => {
                    if (s === 'SUBSCRIBED') {
                        const finalRoomTitle = roomData?.name || searchParams.get('title') || "New Sanctuary";
                        await channel.track({
                            id: user.id, name: resolvedName, chumAvatar: resolvedAvatar, // 👈 Added Avatar
                            status: isActuallyHost ? (roomData?.status === 'ACTIVE' ? 'hosting' : 'drafting') : 'joined',
                            roomCode: roomCode, roomTitle: finalRoomTitle
                        });

                        // ⚡ LATE JOINER DETECTED: Ask host for the time!
                        if (!isActuallyHost && roomData?.status === 'ACTIVE') {
                            setIsSyncing(true);
                            channel.send({ type: 'broadcast', event: 'request_sync' });
                        }
                    }
                });
        };

        initRoom();
        return () => { if (activeChannel) supabase.removeChannel(activeChannel); };
    }, [roomCode]);

    useEffect(() => {
        const handleUnload = () => {
            if (isHost && roomCode) {
                // ⚡ Beacon API bypasses the normal async queue to ensure execution
                const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rooms?room_code=eq.${roomCode}`;
                const headers = {
                    'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
                };

                // Note: Standard Beacon only supports POST, so we use a DELETE proxy 
                // or a simple 'last_seen' update that your DB can use to auto-delete.
                navigator.sendBeacon(url, JSON.stringify({ _method: 'DELETE' }));
            }
        };

        window.addEventListener('beforeunload', handleUnload);
        return () => window.removeEventListener('beforeunload', handleUnload);
    }, [isHost, roomCode]);

    const handleInitializeSanctuary = async () => {
        if (!isHost) return;

        // 1. ⚡ OPTIMISTIC UI: Change local state instantly for zero lag
        setStatus('LAUNCHING');

        // 2. ⚡ INSTANT BROADCAST: Tell all joiners to start their countdowns immediately
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'launch'
            });
        }

        // 3. 🛡️ BACKGROUND DB SYNC: Fire and forget. Don't block the UI!
        const { error } = await supabase
            .from('rooms')
            .update({ status: 'ACTIVE' })
            .eq('room_code', roomCode);

        if (error) {
            console.error("Architect Sync Error:", error.message);
        }
    };

    const updateSettings = async (updates: Partial<typeof settings>) => {
        if (!isHost) return;

        const newSettings = { ...settings, ...updates };
        setSettings(newSettings);

        // Sync timer locally if we're still in setup
        if (status === 'DRAFT' && updates.workDuration) {
            setSecondsLeft(updates.workDuration * 60);
        }

        // ⚡ FIX: Update the DB so the Lantern Map isn't "Undefined"
        await supabase.from('rooms').update({
            name: newSettings.name,
            mode: newSettings.mode,
            work_duration: newSettings.workDuration,
            break_duration: newSettings.breakDuration
        }).eq('room_code', roomCode);

        // ⚡ FIX: Use the existing channelRef to broadcast to joiners
        if (channelRef.current) {
            channelRef.current.send({
                type: 'broadcast',
                event: 'sync_settings',
                payload: newSettings
            });
        }
    };

    const handleAbandon = async () => {
        if (isHost && channelRef.current) {
            // 1. Calculate Rewards (Example: 10 shards per cycle + 1 per minute)
            const focusMinutes = settings.workDuration * (settings.currentCycle - 1);
            const masteryGained = (focusMinutes * 1) + ((settings.currentCycle - 1) * 10);

            // 2. Save to Profile
            const { data: { user } } = await supabase.auth.getUser();
            if (user && masteryGained > 0) {
                await supabase.rpc('increment_mastery', {
                    user_id: user.id,
                    amount: masteryGained
                });
            }

            // 3. Signal Joiners & Destroy Room
            await channelRef.current.send({ type: 'broadcast', event: 'room_closed' });
            await supabase.from('rooms').delete().eq('room_code', roomCode);
            await supabase.from('profiles').update({ status: 'idle' }).eq('id', user?.id);
        }

        if (channelRef.current) await supabase.removeChannel(channelRef.current);
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

                // 👇 Auto-start the timer!
                setIsActive(true);
            }
        }
    }, [status, countdown, settings]);

    useEffect(() => {
        let interval: NodeJS.Timeout;
        // ⚡ Timestamp Anchor: Record exactly when the engine started or resumed
        let expectedTimestamp = Date.now();

        if (status === 'ACTIVE' && isActive) {
            // Run the interval fast (every 200ms) to catch lag instantly without trusting the browser's 1000ms heartbeat
            interval = setInterval(() => {
                const now = Date.now();
                const deltaTime = now - expectedTimestamp; // How much time ACTUALLY passed?

                // Only tick if at least 1 full second (1000ms) has passed
                if (deltaTime >= 1000) {
                    // If the tab was asleep for 5 seconds, secondsMissed will be 5
                    const secondsMissed = Math.floor(deltaTime / 1000);
                    expectedTimestamp += secondsMissed * 1000; // Move the anchor forward safely

                    setSecondsLeft(prev => {
                        // ⚡ Count UP mode (Stopwatch / Free)
                        if (settings.mode === 'free' || settings.mode === 'stopwatch') {
                            return prev + secondsMissed;
                        }

                        // ⚡ Count DOWN mode (Pomodoro / Fixed)
                        const next = prev - secondsMissed;

                        // Hit Zero!
                        if (next <= 0) {
                            if (settings.mode === 'pomodoro') {
                                const nextIsBreak = !isBreak;
                                setIsBreak(nextIsBreak);
                                setIsActive(false); // Pause so they can initiate the next phase

                                if (nextIsBreak) {
                                    // ADVANCED POMODORO: Check for Long Break every 4 cycles
                                    const isLongBreak = settings.currentCycle % settings.cyclesBeforeLongBreak === 0;
                                    return isLongBreak ? settings.longBreakDuration * 60 : settings.breakDuration * 60;
                                } else {
                                    // Back to work: Increment cycle count
                                    setSettings(s => ({ ...s, currentCycle: s.currentCycle + 1 }));
                                    return settings.workDuration * 60;
                                }
                            }
                            setIsActive(false);
                            return 0;
                        }
                        return next;
                    });
                }
            }, 200);
        }
        return () => clearInterval(interval);
    }, [isActive, status, isBreak, settings]);

    // ⚡ ADD THIS STATE TO YOUR COMPONENT TOP
    const [shakeTarget, setShakeTarget] = useState<string | null>(null);

    // ⚡ ADD THIS HELPER FOR PREMIUM TOGGLES
    const handlePremiumToggle = (key: string, currentVal: boolean) => {
        if (!isRoomPremium) {
            setShakeTarget(key);
            setTimeout(() => setShakeTarget(null), 400); // Reset after animation
            return;
        }
        updateSettings({ [key]: !currentVal });
    };

    const [openDropdown, setOpenDropdown] = useState<string | null>(null);

    // 1. The Hover Card Logic
    const InfoTooltip = ({ text }: { text: string }) => (
        <div className="group relative inline-flex items-center ml-2 align-middle">
            <Info size={12} className="text-[var(--text-muted)] hover:text-[var(--text-main)] cursor-help transition-colors" />
            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 w-48 p-3 bg-[var(--bg-card)]/95 backdrop-blur-md border border-[var(--border-color)] rounded-xl text-[10px] font-bold text-[var(--text-main)]/80 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-[999] shadow-2xl tracking-normal normal-case">
                {text}
            </div>
        </div>
    );

    // 2. The Combined Label Wrapper
    const SettingLabel = ({ text, tooltip }: { text: string; tooltip?: string }) => (
        <label className="text-[10px] font-black text-[var(--text-muted)] uppercase flex items-center">
            {text}
            {tooltip && <InfoTooltip text={tooltip} />}
        </label>
    );

    return (
        // ⚡ FIX: High z-index and fixed inset ensure the room fits the screen perfectly
        <div data-theme={resolvedTheme} className={`fixed inset-0 flex flex-row overflow-hidden transition-colors duration-1000 z-[9999] ${isBreak ? 'bg-[var(--bg-sidebar)]' : 'bg-[var(--bg-dark)]'}`}>

            {/* 🎥 ATMOSPHERE LAYER (Visual + Audio Sync) */}
            <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
                <AnimatePresence mode="wait">
                    {/* ⚡ THE BLUEPRINT GRID: Shows only during Draft phase when no custom theme is picked */}
                    {status === 'DRAFT' && settings.vibeCategory === 'Theme Default' ? (
                        <motion.div
                            key="blueprint"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            transition={{ duration: 1 }}
                            className="absolute inset-0 bg-blueprint"
                        />
                    ) : (
                        <motion.div
                            key="visual-theme"
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            transition={{ duration: 1 }}
                            className="absolute inset-0"
                        >
                            {settings.vibeCategory === 'Live Lo-Fi (Pro)' ? (
                                <video
                                    autoPlay loop muted playsInline
                                    className="w-full h-full object-cover opacity-30 transition-all duration-1000"
                                    src={`/assets/bgs/live/${settings.vibeAsset.replace(' (Pro)', '').toLowerCase().replace(/ /g, '_')}.mp4`}
                                />
                            ) : (
                                <div
                                    className="w-full h-full bg-cover bg-center opacity-30 transition-all duration-1000"
                                    style={{
                                        backgroundImage: settings.vibeAsset.includes('Void') 
                                            ? 'none' 
                                            : `url(/assets/bgs/${settings.vibeCategory === 'Static Lo-Fi' ? 'static/' : ''}${settings.vibeAsset.toLowerCase().replace(/ /g, '_')}.jpg)`
                                    }}
                                />
                            )}
                            <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px]" />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* 🔊 HIDDEN AUDIO PLAYER & VISUALIZER ENGINE */}
                <MediaEngine settings={settings} isActive={isActive} onAnalyserCreated={setAnalyser} />
            </div>

            {/* 1. ARCHITECT SIDEBAR */}
            <AnimatePresence>
                {status === 'DRAFT' && isHost && (
                    <motion.aside
                        initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                        // ⚡ FIX: Appended the scrollbar hiding classes to the end of the className string
                        className="w-80 flex-shrink-0 bg-[var(--bg-card)] border-r border-[var(--border-color)] z-20 flex flex-col overflow-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
                    >
                        <div className="p-6 border-b border-[var(--border-color)]">
                            <h2 className="text-[var(--accent-yellow)] font-black uppercase tracking-widest text-[10px] flex items-center gap-2">
                                <Sparkles size={14} /> Sanctuary Architect
                            </h2>
                        </div>

                        {/* ⚡ FIX: Added Tailwind scrollbar hiding classes */}
                        <div className="flex-1 overflow-y-auto p-6 space-y-8 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {/* Protocol Selection */}
                            <section className="space-y-4">
                                <SettingLabel
                                    text="Protocol"
                                    tooltip="Select the time management method for the sanctuary."
                                />
                                <div className="grid grid-cols-2 gap-2">
                                    {/* ⚡ FIX: Removed 'free' */}
                                    {['pomodoro', 'fixed', 'stopwatch'].map(m => (
                                        <button
                                            key={m}
                                            onClick={() => {
                                                if (m === 'stopwatch' && !isPremiumUser) {
                                                    setShakeTarget('stopwatch');
                                                    setTimeout(() => setShakeTarget(null), 400);
                                                    return;
                                                }
                                                updateSettings({ mode: m });
                                            }}
                                            className={`p-2.5 rounded-xl border text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-2 ${settings.mode === m ? 'border-[var(--accent-teal)] bg-[var(--accent-teal)]/10 text-[var(--accent-teal)]' : 'border-[var(--border-color)] text-[var(--text-muted)] hover:text-[var(--text-main)]'
                                                } ${m === 'stopwatch' && !isPremiumUser ? 'opacity-30 grayscale cursor-not-allowed' : ''} ${shakeTarget === 'stopwatch' && m === 'stopwatch' ? 'animate-shake' : ''}`}
                                        >
                                            {m} {m === 'stopwatch' && <Shield size={10} />}
                                        </button>
                                    ))}
                                </div>

                                {/* Pomodoro Sliders */}
                                {settings.mode === 'pomodoro' && (
                                    <div className="p-5 bg-[var(--bg-sidebar)]/50 rounded-2xl border border-[var(--border-color)] space-y-6">
                                        {/* Focus Block */}
                                        <div>
                                            <div className="flex justify-between mb-3 text-[10px] font-bold text-[var(--text-muted)] uppercase"><span>Focus</span> <span className="text-[var(--accent-teal)]">{settings.workDuration}m</span></div>
                                            <input type="range" min="15" max="90" value={settings.workDuration} onChange={(e) => updateSettings({ workDuration: Number(e.target.value) })} className="w-full accent-[var(--accent-teal)]" />
                                        </div>
                                        {/* Short Break */}
                                        <div>
                                            <div className="flex justify-between mb-3 text-[10px] font-bold text-[var(--text-muted)] uppercase"><span>Short Break</span> <span className="text-[var(--accent-teal)]">{settings.breakDuration}m</span></div>
                                            <input type="range" min="3" max="30" value={settings.breakDuration} onChange={(e) => updateSettings({ breakDuration: Number(e.target.value) })} className="w-full accent-[var(--accent-teal)]" />
                                        </div>
                                        {/* Long Break */}
                                        <div>
                                            <div className="flex justify-between mb-3 text-[10px] font-bold text-[var(--text-muted)] uppercase flex items-center">
                                                <span>Long Break <InfoTooltip text="Triggers automatically after your set number of focus cycles." /></span>
                                                <span className="text-[var(--accent-teal)]">{settings.longBreakDuration}m</span>
                                            </div>
                                            <input type="range" min="10" max="60" value={settings.longBreakDuration} onChange={(e) => updateSettings({ longBreakDuration: Number(e.target.value) })} className="w-full accent-[var(--accent-teal)]" />
                                        </div>
                                        {/* Cycles */}
                                        <div>
                                            <div className="flex justify-between mb-3 text-[10px] font-bold text-[var(--text-muted)] uppercase"><span>Cycles</span> <span className="text-[var(--accent-teal)]">{settings.cyclesBeforeLongBreak}</span></div>
                                            <input type="range" min="2" max="6" value={settings.cyclesBeforeLongBreak} onChange={(e) => updateSettings({ cyclesBeforeLongBreak: Number(e.target.value) })} className="w-full accent-[var(--accent-teal)]" />
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* VISUAL ATMOSPHERE */}
                            <section className="space-y-3">
                                <SettingLabel
                                    text="Atmosphere"
                                    tooltip="Live Lo-Fi animations require Architect Pro."
                                />
                                <CustomSelect
                                    value={settings.vibeCategory}
                                    options={['Theme Default', 'Static Lo-Fi', 'Live Lo-Fi (Pro)']}
                                    isOpen={openDropdown === 'cat'}
                                    onToggle={() => setOpenDropdown(openDropdown === 'cat' ? null : 'cat')}
                                    isPremiumUser={isRoomPremium}
                                    onChange={(cat: string) => {
                                        const defaultAsset = cat === 'Theme Default' ? 'deep-teal' : cat === 'Static Lo-Fi' ? STATIC_BGS[0] : LIVE_BGS[0];
                                        updateSettings({ vibeCategory: cat, vibeAsset: defaultAsset, roomTheme: cat === 'Theme Default' ? null : settings.roomTheme });
                                    }}
                                />
                                {settings.vibeCategory === 'Theme Default' ? (
                                    <CustomSelect
                                        value={ROOM_THEMES.find(t => t.id === resolvedTheme)?.name || 'Deep Teal'}
                                        options={ROOM_THEMES.map(t => ({ name: t.name, pro: t.premium }))}
                                        isOpen={openDropdown === 'asset'}
                                        onToggle={() => setOpenDropdown(openDropdown === 'asset' ? null : 'asset')}
                                        isPremiumUser={isRoomPremium}
                                        onChange={(themeName: string) => {
                                            const theme = ROOM_THEMES.find(t => t.name === themeName);
                                            if (theme) {
                                                if (theme.premium && !isRoomPremium) {
                                                    setShakeTarget('theme');
                                                    setTimeout(() => setShakeTarget(null), 400);
                                                    return;
                                                }
                                                updateSettings({ vibeAsset: theme.id, roomTheme: theme.id });
                                            }
                                        }}
                                    />
                                ) : (
                                    <CustomSelect
                                        value={settings.vibeAsset}
                                        options={settings.vibeCategory === 'Static Lo-Fi' ? STATIC_BGS : LIVE_BGS}
                                        isOpen={openDropdown === 'asset'}
                                        onToggle={() => setOpenDropdown(openDropdown === 'asset' ? null : 'asset')}
                                        isPremiumUser={isRoomPremium}
                                        onChange={(asset: string) => updateSettings({ vibeAsset: asset })}
                                    />
                                )}
                            </section>

                            {/* AUDIO TRACK */}
                            <section className="space-y-3">
                                <SettingLabel
                                    text="Audio Track"
                                    tooltip="High-fidelity ambient audio designed for deep work."
                                />
                                <CustomSelect
                                    value={settings.audioTrack}
                                    options={AUDIO_TRACKS}
                                    isOpen={openDropdown === 'audio'}
                                    onToggle={() => setOpenDropdown(openDropdown === 'audio' ? null : 'audio')}
                                    isPremiumUser={isRoomPremium}
                                    onChange={(track: string) => updateSettings({ audioTrack: track })}
                                />
                            </section>

                            {/* PREMIUM TOGGLES */}
                            <section className="pt-4 border-t border-[var(--border-color)] space-y-4">
                                {/* Visualizer Toggle */}
                                <div
                                    onClick={() => handlePremiumToggle('showVisualizer', settings.showVisualizer)}
                                    className={`flex items-center justify-between transition-opacity ${!isRoomPremium ? 'cursor-not-allowed opacity-50 hover:opacity-70' : 'cursor-pointer'} ${shakeTarget === 'showVisualizer' ? 'animate-shake' : ''}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Visualizer</span>
                                        {!isRoomPremium && <Lock size={10} className="text-[var(--accent-yellow)]" />}
                                        <InfoTooltip text="Enables an audio-reactive visualizer for the room." />
                                    </div>
                                    <div className={`w-10 h-5 rounded-full relative transition-colors pointer-events-none ${settings.showVisualizer ? 'bg-[var(--accent-yellow)]' : 'bg-[var(--text-muted)]/20'}`}>
                                        <motion.div layout className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full" animate={{ x: settings.showVisualizer ? 20 : 0 }} />
                                    </div>
                                </div>

                                {/* Ghost Mode Toggle */}
                                <div
                                    onClick={() => handlePremiumToggle('isGhostMode', settings.isGhostMode)}
                                    className={`flex items-center justify-between transition-opacity ${!isRoomPremium ? 'cursor-not-allowed opacity-50 hover:opacity-70' : 'cursor-pointer'} ${shakeTarget === 'isGhostMode' ? 'animate-shake' : ''}`}
                                >
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">Ghost Mode</span>
                                        {!isRoomPremium && <Lock size={10} className="text-[var(--accent-teal)]" />}
                                        <InfoTooltip text="Hides the timer UI to minimize distractions." />
                                    </div>
                                    <div className={`w-10 h-5 rounded-full relative transition-colors pointer-events-none ${settings.isGhostMode ? 'bg-[var(--accent-teal)]' : 'bg-[var(--text-muted)]/20'}`}>
                                        <motion.div layout className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full" animate={{ x: settings.isGhostMode ? 20 : 0 }} />
                                    </div>
                                </div>
                            </section>
                        </div>

                        <div className="p-6 border-t border-[var(--border-color)] bg-black/40 space-y-3">
                            <button onClick={handleInitializeSanctuary} className="w-full py-4 bg-[var(--accent-teal)] text-black rounded-2xl font-black uppercase text-xs hover:brightness-110 transition-all">Initialize Sanctuary</button>
                            <button onClick={() => setShowAbandonConfirm(true)} className="w-full py-3 text-[var(--text-muted)] text-[10px] font-bold uppercase hover:text-red-400 transition-colors">Abandon Blueprint</button>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>



            {/* 2. MAIN AREA */}
            <main className="flex-1 min-w-0 relative flex flex-col p-8 z-10">
                <header className="flex justify-between items-center z-20">
                    <div>
                        <h1 className="text-2xl font-black tracking-tight text-[var(--text-main)]">{settings.name} <span className="text-[var(--text-muted)] font-mono text-sm ml-2">#{roomCode}</span></h1>
                        <p className={`text-[10px] font-black uppercase tracking-[0.2em] mt-1 ${isBreak ? 'text-[var(--text-muted)]' : 'text-[var(--accent-teal)]'}`}>
                            {status === 'DRAFT' ? "Blueprint Phase" : isBreak ? "☕ Recovery Phase" : "⚡ Focus Protocol Active"}
                        </p>
                    </div>
                    <button onClick={() => setShowAbandonConfirm(true)} className="flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] hover:text-red-400 transition-colors bg-[var(--bg-sidebar)]/50 px-4 py-2 rounded-xl">
                        <LogOut size={14} /> Leave
                    </button>
                </header>

                <div className="flex-1 flex flex-col items-center justify-center z-10 gap-8">
                    {/* VISUALIZER (Centered in all phases) */}
                    {settings.showVisualizer && (
                        <div className="w-full flex justify-center mt-auto">
                            <Visualizer analyser={analyser} isActive={isActive} />
                        </div>
                    )}

                    {/* JOINER WAIT SCREEN (Shows real-time blueprint updates) */}
                    {status === 'DRAFT' && !isHost && (
                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-black/40 backdrop-blur-md border border-[var(--border-color)] p-8 rounded-[32px] text-center max-w-md w-full shadow-2xl">
                            <div className="w-12 h-12 border-4 border-[var(--accent-teal)]/20 border-t-[var(--accent-teal)] rounded-full animate-spin mx-auto mb-6" />
                            <h3 className="text-[var(--accent-teal)] font-black uppercase tracking-[0.2em] text-xs mb-2">Architect is Constructing</h3>

                            <div className="space-y-4 mt-6 text-left bg-[var(--bg-sidebar)]/50 p-5 rounded-2xl border border-[var(--border-color)]">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase">Protocol</span>
                                    <span className="text-xs font-bold text-[var(--text-main)] uppercase">{settings.mode}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase">Atmosphere</span>
                                    <span className={`text-xs font-bold truncate max-w-[150px] ${settings.vibeCategory.includes('Pro') ? 'text-[var(--accent-yellow)]' : 'text-[var(--text-main)]'}`}>{settings.vibeAsset}</span>
                                </div>
                                {/* LIVE PREVIEW FOR JOINERS */}
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase">Audio Track</span>
                                    <span className="text-xs font-bold text-[var(--text-main)] truncate max-w-[150px]">{settings.audioTrack}</span>
                                </div>
                                <div className="flex justify-between items-center pt-2 border-t border-[var(--border-color)]">
                                    <span className="text-[10px] font-black text-[var(--text-muted)] uppercase">Active Protocols</span>
                                    <div className="flex gap-3">
                                        <Activity size={14} className={settings.showVisualizer ? "text-[var(--accent-yellow)]" : "text-[var(--text-muted)]/30"} />
                                        <Shield size={14} className={settings.isGhostMode ? "text-[var(--accent-teal)]" : "text-[var(--text-muted)]/30"} />
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ACTIVE TIMER */}
                    {status === 'ACTIVE' && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
                            <span className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--text-muted)] mb-2 block">{isBreak ? "Break" : `Cycle ${settings.currentCycle}`}</span>
                            <div className="text-[14rem] md:text-[18rem] font-black tabular-nums leading-none tracking-tighter text-[var(--text-main)]">
                                {Math.floor(secondsLeft / 60).toString().padStart(2, '0')}:{(secondsLeft % 60).toString().padStart(2, '0')}
                            </div>
                            <button onClick={() => setIsActive(!isActive)} className="px-12 py-5 bg-[var(--accent-teal)] text-black rounded-[24px] font-black text-xl hover:scale-105 transition-all">
                                {isActive ? "Pause" : "Initiate"}
                            </button>
                        </motion.div>
                    )}
                </div>

                {/* 5S LAUNCH OVERLAY */}
                <AnimatePresence>
                    {status === 'LAUNCHING' && (
                        <motion.div exit={{ opacity: 0 }} className="absolute inset-0 z-[100] bg-[var(--bg-dark)] flex flex-col items-center justify-center">
                            <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-[18rem] font-black text-[var(--text-main)]">{countdown}</motion.div>
                            <p className="text-[10px] font-black uppercase tracking-[0.5em] text-[var(--accent-teal)]">Deploying Protocol</p>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            <AnimatePresence>
                {isSyncing && (
                    <motion.div
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="absolute inset-0 z-[200] bg-[var(--bg-dark)]/90 backdrop-blur-md flex items-center justify-center"
                    >
                        <div className="bg-[var(--bg-card)] p-10 rounded-[32px] border border-[var(--border-color)] text-center animate-pulse shadow-2xl">
                            <Timer className="w-12 h-12 text-[var(--accent-teal)] mx-auto mb-4" />
                            <h3 className="text-[var(--text-main)] font-black text-xl uppercase tracking-widest">Synchronizing Timeline</h3>
                            <p className="text-[var(--text-muted)] text-xs mt-2 font-bold uppercase">Fetching active cycle from Architect...</p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* 3. RIGHT PRESENCE SIDEBAR */}
            <aside className="w-72 flex-shrink-0 border-l border-[var(--border-color)] z-20 hidden lg:flex flex-col bg-black/20 p-8">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-6 flex items-center gap-2">
                    <Users size={14} /> Presence ({participants.length})
                </h3>
                <div className="flex-1 space-y-4 overflow-y-auto custom-scrollbar">
                    {participants.map(p => {
                        const isMe = p.id === currentUserId;
                        const isRoomHost = p.id === hostId;

                        // ⚡ Extract ONLY the emoji (e.g., "👻" from "👻 Ghost")
                        const avatarEmoji = p.chumAvatar ? p.chumAvatar.split(' ')[0] : '👻';

                        return (
                            <div key={p.id} className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${isMe ? 'bg-[var(--bg-sidebar)] border-[var(--text-muted)]/40 shadow-[0_0_15px_rgba(255,255,255,0.1)]'
                                : isRoomHost ? 'bg-[var(--accent-teal)]/10 border-[var(--accent-teal)]/30' : 'bg-[var(--bg-sidebar)]/50 border-[var(--border-color)]'
                                }`}
                            >
                                {/* ⚡ Avatar Circle: Forced 40x40px, no shrinking, no overflowing */}
                                <div className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg overflow-hidden ${isRoomHost ? 'bg-[var(--accent-teal)]/20' : 'bg-[var(--bg-sidebar)]'
                                    }`}>
                                    {isRoomHost ? '👑' : avatarEmoji}
                                </div>

                                {/* ⚡ Text Container: Flex-col, min-w-0 prevents breaking parent width */}
                                <div className="flex flex-col min-w-0 flex-1">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span className="text-sm font-bold text-[var(--text-main)] truncate">
                                            {p.name || "Anonymous"}
                                        </span>
                                        {isMe && (
                                            <span className="shrink-0 text-[8px] font-black uppercase tracking-widest text-[var(--text-main)]/70 bg-[var(--bg-sidebar)] px-1.5 py-0.5 rounded-md">
                                                You
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--accent-teal)] mt-0.5 truncate">
                                        {isBreak ? "Resting" : "Focusing"}
                                    </p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </aside>

            {/* 4. LEGACY LOG MODAL */}
            <AnimatePresence>
                {showAbandonConfirm && (
                    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/90 backdrop-blur-xl p-6">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[var(--bg-card)] border border-[var(--accent-teal)]/20 p-10 rounded-[40px] max-w-md w-full text-center shadow-2xl relative overflow-hidden">
                            <h3 className="text-2xl font-black text-[var(--text-main)] mb-2">Harvest Mastery?</h3>
                            <p className="text-xs text-[var(--text-muted)] mb-8 uppercase tracking-widest font-black">Legacy Log Summary</p>
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-[var(--bg-sidebar)]/50 p-4 rounded-3xl border border-[var(--border-color)]">
                                    <span className="text-[10px] font-black text-[var(--accent-teal)] uppercase block mb-1">Session</span>
                                    <span className="text-xl font-black text-[var(--text-main)]">{Math.floor((isActive ? secondsLeft : 0) / 60)}m</span>
                                </div>
                                <div className="bg-[var(--bg-sidebar)]/50 p-4 rounded-3xl border border-[var(--border-color)]">
                                    <span className="text-[10px] font-black text-[var(--accent-yellow)] uppercase block mb-1">Crystals</span>
                                    <span className="text-xl font-black text-[var(--text-main)]">{settings.currentCycle ? settings.currentCycle - 1 : 0}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-3">
                                <button onClick={handleAbandon} className="w-full py-5 bg-[var(--accent-teal)] text-black rounded-2xl font-black text-xs uppercase tracking-[0.2em] hover:brightness-110 transition-all">Forge Legacy & Exit</button>
                                <button onClick={() => setShowAbandonConfirm(false)} className="w-full py-4 text-[var(--text-muted)] text-[10px] font-black uppercase tracking-widest hover:text-[var(--text-main)] transition-colors">Continue Focusing</button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}