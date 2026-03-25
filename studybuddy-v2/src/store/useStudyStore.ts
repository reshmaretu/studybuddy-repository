import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

// 1. Explicitly export the TaskLoad type
export type TaskLoad = 'light' | 'medium' | 'heavy';

export interface Task {
    id: string;
    title: string;
    description?: string;
    load: TaskLoad;
    deadline?: string;
    isCompleted: boolean;
    isPinned?: boolean;
    urgency?: boolean;
    importance?: boolean;
    isFrog?: boolean;
    eisenhowerQuadrant?: number;
    ivyRank?: number;
    completedAt?: string;
    estimatedPomos?: number;
    actualPomos?: number;
    stressLevel?: number;
}

export interface ChatMessage {
    role: 'user' | 'chum';
    text: string;
    node?: string;
}

export interface TutorSession {
    id: string;
    shardId: string;
    shardTitle: string;
    date: string;
    history: ChatMessage[];
    masteryGained: number;
}

export interface TutorSessionState {
    questionIndex: number;
    isSessionComplete: boolean;
    preferredType: "mixed" | "multiple choice" | "identification" | "true or false";
    totalMasteryGained: number; // 👈 Add this line
}

export interface Shard {
    id: string;
    title: string;
    content: string;
    files?: { name: string; type: string; content?: string }[];
    mastery: number;
    isMastered: boolean;
    createdAt: string;
}

export const calculateXpRequirement = (level: number) => {
    // Standard RPG curve: 100 * Level^1.5 (rounded to nearest 50)
    return Math.floor((100 * Math.pow(level, 1.5)) / 50) * 50;
};

export const getTitleForLevel = (level: number) => {
    if (level >= 99) return "Ascended Scholar";
    if (level >= 75) return "Grandmaster";
    if (level >= 50) return "Architect of Time";
    if (level >= 25) return "Flow State Adept";
    if (level >= 10) return "Scholar of the Shard";
    if (level >= 5) return "Focus Apprentice";
    return "The Initiate";
};

interface StudyState {
    // 🌐 CLOUD SYNC STATE
    isInitialized: boolean;
    initializeData: () => Promise<void>;

    isMindDumpOpen: boolean;
    toggleMindDump: () => void;

    tasks: Task[];
    focusScore: number;
    dailyFocusScores: Record<string, number>;
    flowBreaks: number;
    tabSwitches: number;
    incrementFlowBreak: () => void;
    incrementTabSwitch: () => void;
    resetFlowStats: () => void;
    dailyStreak: number;
    totalSessions: number;
    timeLeft: number;
    isRunning: boolean;
    activeMode: 'none' | 'focusModal' | 'flowState' | 'studyCafe';
    focusTaskId: string | null;
    activeTaskId: string | null;
    isFocusModalOpen: boolean;

    pomodoroFocus: number;
    pomodoroShortBreak: number;
    pomodoroLongBreak: number;
    pomodoroCycles: number;

    shards: Shard[];
    isTutorModeActive: boolean;
    activeShardId: string | null;

    normalChatHistory: ChatMessage[];
    tutorChatHistory: ChatMessage[];
    pastTutorSessions: TutorSession[];
    tutorSessionState: TutorSessionState;

    aiTier: 'cloud' | 'local' | 'offline';
    aiKeys: { groq: string; gemini: string; openrouter: string };
    ollamaUrl: string;

    xp: number;
    level: number;
    modifyFocusScore: (amount: number) => Promise<void>;
    gainXp: (amount: number) => Promise<void>;
    completeStudySession: () => Promise<void>;

    activeCrystalTheme: string;
    activeAtmosphereFilter: 'default' | 'dark' | 'refreshing' | 'cool';
    setActiveCrystalTheme: (themeId: string) => void;
    setActiveAtmosphereFilter: (filter: 'default' | 'dark' | 'refreshing' | 'cool') => void;

    windSpeed: number;
    swayAmount: number;
    setWindSettings: (settings: Partial<{ windSpeed: number; swayAmount: number }>) => void;

    flowerCount: number;
    swayEnabled: boolean;
    setFlowerSettings: (settings: Partial<{ flowerCount: number; swayEnabled: boolean }>) => void;

    displayName: string;
    setDisplayName: (name: string) => Promise<void>;

    fullName: string;

    isVerified: boolean;

    // ⚡ ASYNC ACTIONS (Cloud Synced)
    addTask: (task: Omit<Task, 'id' | 'isCompleted'>) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
    completeTask: (id: string, premiumStats?: { actualPomos?: number; stressLevel?: number }) => Promise<void>;
    forgeShard: (shard: Omit<Shard, "id" | "mastery" | "isMastered" | "createdAt">) => Promise<void>;
    deleteShard: (id: string) => Promise<void>;

    // 🔄 SYNC ACTIONS (Local Only)
    toggleTimer: () => void;
    resetTimer: () => void;
    decrementTimer: () => void;
    openFocusModal: (taskId?: string) => void;
    closeFocusModal: () => void;
    startMode: (mode: 'flowState' | 'studyCafe', taskId: string | null) => void;
    exitMode: () => void;
    updatePomodoroSettings: (settings: Partial<StudyState>) => void;
    startTutorMode: (shardId: string, type?: StudyState['tutorSessionState']['preferredType']) => void;
    exitTutorMode: () => void;
    completeTutorSession: (masteryGained: number) => Promise<void>;
    updateShardMastery: (id: string, amount: number) => Promise<void>;
    setNormalChatHistory: (history: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
    setTutorChatHistory: (history: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
    updateTutorSessionState: (state: Partial<StudyState['tutorSessionState']>) => void;
    setAITier: (tier: 'cloud' | 'local' | 'offline') => void;
    updateAIKeys: (keys: Partial<StudyState['aiKeys']>) => void;
    setOllamaUrl: (url: string) => void;
    showNodeBadge: boolean;
    setShowNodeBadge: (val: boolean) => void;

    // 💎 PREMIUM STATE
    isPremiumUser: boolean;
    checkPremiumStatus: () => Promise<void>;

    // 🗓️ PLANNING & PRIORITIZATION
    activeFramework: string | null;
    lastPlannedDate: string | null;
    setActiveFramework: (framework: string | null) => Promise<void>;
    setLastPlannedDate: (date: string | null) => Promise<void>;

    updateUserTheme: (themeId: string) => Promise<void>;
    isDev: boolean;
    setIsDev: (val: boolean) => Promise<void>;

    // 🛠️ DEV TOOLS (Global)
    debrisSize: number;
    debrisColor: string;
    debrisCount: number;
    debrisSpread: number;
    setDebris: (settings: Partial<{ size: number, color: string, count: number, spread: number }>) => void;
    devOverlayEnabled: boolean;
    setDevOverlayEnabled: (val: boolean) => void;

    reset: () => void;

    // 🎭 MOCK USERS (Dev Only)
    mockUsers: any[];
    setMockUsers: (val: any[] | ((prev: any[]) => any[])) => void;

    chumToast: { message: string | React.ReactNode, type: 'warning' | 'normal' } | null;
    triggerChumToast: (message: string | React.ReactNode, type?: 'warning' | 'normal') => void;
}

export const useStudyStore = create<StudyState>()(
    persist(
        (set, get) => ({
            isInitialized: false,
            isPremiumUser: false,
            checkPremiumStatus: async () => {
                try {
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) return;

                    const { data, error } = await supabase
                        .from('profiles')
                        .select('is_premium')
                        .eq('id', session.user.id)
                        .single();

                    if (data && !error) {
                        // This flips the global switch to TRUE
                        set({ isPremiumUser: data.is_premium });
                    }
                } catch (error) {
                    console.error("Premium Sync Error:", error);
                }
            },

            // ─── IDENTITY STATE ───
            displayName: "Architect",
            fullName: "",
            isVerified: false,

            setDisplayName: async (name: string) => {
                set({ displayName: name });
                const { data: { user } } = await supabase.auth.getUser();
                if (user) {
                    await supabase.from('profiles')
                        .update({ display_name: name, last_display_name_change: new Date().toISOString() })
                        .eq('id', user.id);
                }
            },

            isMindDumpOpen: false,
            toggleMindDump: () => set((state) => ({ isMindDumpOpen: !state.isMindDumpOpen })),
            tasks: [],
            focusScore: 100,
            dailyFocusScores: {},
            flowBreaks: 0,
            tabSwitches: 0,

            incrementFlowBreak: () => set((state) => ({ flowBreaks: state.flowBreaks + 1 })),
            incrementTabSwitch: () => set((state) => ({ tabSwitches: state.tabSwitches + 1 })),
            resetFlowStats: () => set({ flowBreaks: 0, tabSwitches: 0 }),
            dailyStreak: 3,
            totalSessions: 0,
            timeLeft: 1500,
            isRunning: false,
            activeMode: 'none',
            focusTaskId: null,
            activeTaskId: null,
            isFocusModalOpen: false,

            pomodoroFocus: 25,
            pomodoroShortBreak: 5,
            pomodoroLongBreak: 15,
            pomodoroCycles: 4,

            shards: [],
            isTutorModeActive: false,
            activeShardId: null,

            normalChatHistory: [{ role: 'chum', text: "Ready to study." }],
            tutorChatHistory: [],
            pastTutorSessions: [],
            tutorSessionState: {
                questionIndex: 0,
                isSessionComplete: false,
                preferredType: 'mixed',
                totalMasteryGained: 0,
            },

            aiTier: 'cloud',
            aiKeys: { groq: '', gemini: '', openrouter: '' },
            ollamaUrl: 'http://localhost:11434',
            showNodeBadge: true,
            setShowNodeBadge: (showNodeBadge) => set({ showNodeBadge }),

            activeFramework: null,
            lastPlannedDate: null,
            isDev: false,
            devOverlayEnabled: true,

            chumToast: null,
            triggerChumToast: (message, type = 'normal') => {
                set({ chumToast: { message, type } });
                // Auto-clear the bubble after 6 seconds
                setTimeout(() => {
                    set((state) => state.chumToast?.message === message ? { chumToast: null } : state);
                }, 6000);
            },

            setActiveFramework: async (framework) => {
                set({ activeFramework: framework });
                const { data: { user } } = await supabase.auth.getUser();
                if (user) await supabase.from('profiles').update({ active_framework: framework }).eq('id', user.id);
            },

            setLastPlannedDate: async (date) => {
                set({ lastPlannedDate: date });
                const { data: { user } } = await supabase.auth.getUser();
                if (user) await supabase.from('profiles').update({ last_planned_date: date }).eq('id', user.id);
            },

            setIsDev: async (val) => {
                set({ isDev: val });
                const { data: { user } } = await supabase.auth.getUser();
                if (user) await supabase.from('profiles').update({ is_dev: val }).eq('id', user.id);
            },

            debrisSize: 0.4,
            debrisColor: "#2dd4bf",
            debrisCount: 3000,
            debrisSpread: 400,
            setDebris: (settings) => set((state) => ({
                debrisSize: settings.size ?? state.debrisSize,
                debrisColor: settings.color ?? state.debrisColor,
                debrisCount: settings.count ?? state.debrisCount,
                debrisSpread: settings.spread ?? state.debrisSpread
            })),

            setDevOverlayEnabled: (val) => set({ devOverlayEnabled: val }),

            mockUsers: [],
            setMockUsers: (val) => set((state) => ({
                mockUsers: typeof val === 'function' ? val(state.mockUsers) : val
            })),

            xp: 0,
            level: 1,

            // ─── NEW STAT ACTIONS ───
            modifyFocusScore: async (amount) => {
                const { data: { user } } = await supabase.auth.getUser();
                set((state) => {
                    const newScore = Math.max(0, Math.min(100, state.focusScore + amount));

                    // 🔥 Take a daily snapshot!
                    const today = new Date().toISOString().split('T')[0];
                    const updatedDailyScores = { ...state.dailyFocusScores, [today]: newScore };

                    if (user) supabase.from('user_stats').update({ focus_score: newScore }).eq('user_id', user.id).then();

                    return { focusScore: newScore, dailyFocusScores: updatedDailyScores };
                });
            },

            gainXp: async (amount) => {
                const { data: { user } } = await supabase.auth.getUser();
                set((state) => {
                    // 20% boost if they are premium
                    const finalAmount = state.isPremiumUser ? Math.floor(amount * 1.2) : amount;
                    let currentXp = state.xp + finalAmount;
                    let currentLevel = state.level;
                    let xpNeeded = calculateXpRequirement(currentLevel);
                    let didLevelUp = false;

                    // Handles massive XP drops that might level you up twice
                    while (currentXp >= xpNeeded) {
                        currentXp -= xpNeeded;
                        currentLevel += 1;
                        xpNeeded = calculateXpRequirement(currentLevel);
                        didLevelUp = true;
                    }

                    if (didLevelUp && state.triggerChumToast) {
                        state.triggerChumToast(`Level Up! You earned the title: ${getTitleForLevel(currentLevel)}.`, 'normal');
                    }

                    if (user) {
                        supabase.from('user_stats').update({ xp: currentXp, level: currentLevel }).eq('user_id', user.id).then();
                    }

                    return { xp: currentXp, level: currentLevel };
                });
            },

            completeStudySession: async () => {
                const { data: { user } } = await supabase.auth.getUser();

                // +5 Focus Score for surviving the timer
                get().modifyFocusScore(5);

                // Time-based XP (e.g. 50 XP for finishing a full timer block)
                get().gainXp(50);

                set((state) => ({ totalSessions: state.totalSessions + 1 }));

                if (user) {
                    supabase.from('user_stats').update({ total_sessions: get().totalSessions }).eq('user_id', user.id).then();
                }
            },

            // ─── UPDATED EXISTING ACTIONS ───

            decrementTimer: () => {
                const state = get();
                // Intercept the timer exactly when it hits 0
                if (state.timeLeft === 1) {
                    state.completeStudySession();
                    set({ timeLeft: 0, isRunning: false });
                } else {
                    set({ timeLeft: Math.max(0, state.timeLeft - 1) });
                }
            },

            completeTask: async (id, premiumStats) => {
                const { data: { user } } = await supabase.auth.getUser();
                const task = get().tasks.find(t => t.id === id);
                const now = new Date().toISOString();

                set((state) => ({
                    tasks: state.tasks.map((t) => t.id === id ? {
                        ...t,
                        isCompleted: true,
                        completedAt: now,
                        ...premiumStats // Inject the modal stats!
                    } : t),
                }));

                get().modifyFocusScore(5);

                if (task) {
                    const xpReward = task.load === 'heavy' ? 20 : task.load === 'medium' ? 10 : 5;
                    get().gainXp(xpReward);
                }

                if (!id.startsWith('temp-') && user) {
                    const dbUpdate: any = { is_completed: true, completed_at: now };
                    if (premiumStats?.actualPomos !== undefined) dbUpdate.actual_pomodoros = premiumStats.actualPomos;
                    if (premiumStats?.stressLevel !== undefined) dbUpdate.stress_level = premiumStats.stressLevel;

                    supabase.from('tasks').update(dbUpdate).eq('id', id).then();
                }
            },

            activeCrystalTheme: 'quartz',
            activeAtmosphereFilter: 'default',
            setActiveCrystalTheme: (themeId) => set({ activeCrystalTheme: themeId }),
            setActiveAtmosphereFilter: (filter) => set({ activeAtmosphereFilter: filter }),

            windSpeed: 2.0,
            swayAmount: 0.15,
            setWindSettings: (settings: Partial<{ windSpeed: number; swayAmount: number }>) => set((state) => ({ ...state, ...settings })),

            flowerCount: 2400,
            swayEnabled: true,
            setFlowerSettings: (settings: Partial<{ flowerCount: number; swayEnabled: boolean }>) => set((state) => ({ ...state, ...settings })),

            // ==========================================
            // 🌐 CLOUD FETCHING
            // ==========================================
            initializeData: async () => {
                const { data: { user } } = await supabase.auth.getUser();

                if (!user) {
                    set({ isInitialized: true, isVerified: false });
                    return;
                }

                try {
                    const [tasksResponse, shardsResponse, profileResponse, statsResponse, wardrobeResponse, sessionsResponse] = await Promise.all([
                        supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
                        supabase.from('shards').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
                        supabase.from('profiles').select('display_name, full_name, is_premium, is_dev, active_framework, last_planned_date').eq('id', user.id).maybeSingle(),
                        supabase.from('user_stats').select('focus_score, total_sessions, total_seconds_tracked').eq('user_id', user.id).maybeSingle(),
                        supabase.from('chum_wardrobe').select('active_theme').eq('user_id', user.id).maybeSingle(),
                        supabase.from('ai_sessions').select('*, shards(title)').eq('user_id', user.id).order('created_at', { ascending: false })
                    ]);

                    if (tasksResponse.data) {
                        set({
                            tasks: tasksResponse.data.map(t => ({
                                id: t.id, title: t.title, description: t.description,
                                load: t.load, deadline: t.deadline, isCompleted: t.is_completed, isPinned: t.is_pinned,
                                urgency: t.urgency, importance: t.importance, isFrog: t.is_frog,
                                eisenhowerQuadrant: t.eisenhower_quadrant, ivyRank: t.ivy_rank
                            }))
                        });
                    }

                    if (shardsResponse.data) {
                        set({
                            shards: shardsResponse.data.map(s => ({
                                id: s.id, title: s.title, content: s.content,
                                mastery: s.mastery, isMastered: s.is_mastered, createdAt: s.created_at
                            }))
                        });
                    }

                    if (sessionsResponse.data) {
                        set({
                            pastTutorSessions: sessionsResponse.data.map((s: any) => ({
                                id: s.id,
                                shardId: s.shard_id,
                                shardTitle: s.shards?.title || "Unknown Shard",
                                date: s.created_at,
                                history: s.chat_history,
                                masteryGained: s.mastery_gained
                            }))
                        });
                    }

                    set({
                        focusScore: statsResponse.data?.focus_score ?? 100,
                        totalSessions: statsResponse.data?.total_sessions ?? 0,
                        isPremiumUser: profileResponse.data?.is_premium || false,
                        isDev: profileResponse.data?.is_dev || false,
                        activeFramework: profileResponse.data?.active_framework || null,
                        lastPlannedDate: profileResponse.data?.last_planned_date || null,
                        displayName: profileResponse.data?.display_name || "Architect",
                        isVerified: !!user.email_confirmed_at
                    });

                    const activeTheme = wardrobeResponse.data?.active_theme || 'default';
                    document.documentElement.setAttribute("data-theme", activeTheme);
                    localStorage.setItem("appTheme", activeTheme);

                } catch (error) {
                    console.error("Initialization failed:", error);
                } finally {
                    set({ isInitialized: true });
                }
            },

            // ==========================================
            // ⚔️ ASYNC TASK ACTIONS
            // ==========================================
            addTask: async (task) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const tempId = `temp-${Date.now()}`;
                set((state) => ({ tasks: [{ ...task, id: tempId, isCompleted: false }, ...state.tasks] }));

                const { data } = await supabase.from('tasks').insert([{
                    user_id: user.id,
                    title: task.title,
                    description: task.description,
                    load: task.load,
                    deadline: task.deadline,
                    // 👇 Map the new column
                    estimated_pomodoros: task.estimatedPomos
                }]).select().single();

                if (data) {
                    set((state) => ({ tasks: state.tasks.map(t => t.id === tempId ? { ...t, id: data.id } : t) }));
                }
            },

            updateTask: async (id, updates) => {
                set((state) => ({ tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t) }));
                if (!id.startsWith('temp-')) {
                    // Convert frontend camelCase to database snake_case before saving
                    const dbUpdates: any = { ...updates };
                    if (updates.isCompleted !== undefined) { dbUpdates.is_completed = updates.isCompleted; delete dbUpdates.isCompleted; }
                    if (updates.isPinned !== undefined) { dbUpdates.is_pinned = updates.isPinned; delete dbUpdates.isPinned; }
                    if (updates.isFrog !== undefined) { dbUpdates.is_frog = updates.isFrog; delete dbUpdates.isFrog; }
                    if (updates.eisenhowerQuadrant !== undefined) { dbUpdates.eisenhower_quadrant = updates.eisenhowerQuadrant; delete dbUpdates.eisenhowerQuadrant; }
                    if (updates.ivyRank !== undefined) { dbUpdates.ivy_rank = updates.ivyRank; delete dbUpdates.ivyRank; }
                    await supabase.from('tasks').update(dbUpdates).eq('id', id);
                }
            },

            deleteTask: async (id) => {
                set((state) => ({ tasks: state.tasks.filter((t) => t.id !== id) }));
                if (!id.startsWith('temp-')) {
                    await supabase.from('tasks').delete().eq('id', id);
                }
            },

            // ==========================================
            // 💎 ASYNC SHARD ACTIONS (pgvector triggers)
            // ==========================================
            forgeShard: async (shard) => {
                try {
                    // Grab the session to get the access token!
                    const { data: { session } } = await supabase.auth.getSession();
                    if (!session) return;

                    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
                    const res = await fetch(`${baseUrl}/api/forge`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${session.access_token}`
                        },
                        // 👇 We added 'files: shard.files' right here!
                        body: JSON.stringify({
                            user_id: session.user.id,
                            title: shard.title,
                            content: shard.content,
                            files: shard.files
                        })
                    });
                    // SAFETY NET: If the server returns a 404 HTML page, catch it before it crashes!
                    if (!res.ok) {
                        const errorText = await res.text();
                        console.error("Server Error HTML:", errorText.substring(0, 200));
                        throw new Error(`API returned status: ${res.status}. Check your terminal!`);
                    }

                    const data = await res.json();

                    if (data.success && data.shard) {
                        set((state) => ({
                            shards: [{
                                id: data.shard.id, title: data.shard.title, content: data.shard.content,
                                mastery: 0, isMastered: false, createdAt: data.shard.created_at
                            }, ...state.shards]
                        }));
                    }
                } catch (error) {
                    console.error("Failed to forge shard:", error);
                    // Optional: You could add a UI toast notification here instead of an alert
                    alert("Failed to save shard. Did you add your Gemini API Key?");
                }
            },

            deleteShard: async (id) => {
                set((state) => ({
                    shards: state.shards.filter(s => s.id !== id),
                    isTutorModeActive: state.activeShardId === id ? false : state.isTutorModeActive,
                    activeShardId: state.activeShardId === id ? null : state.activeShardId
                }));
                await supabase.from('shards').delete().eq('id', id);
            },

            // --- 🕒 LOCAL UI ACTIONS ---
            toggleTimer: () => set((state) => ({ isRunning: !state.isRunning })),
            resetTimer: () => set((state) => ({ timeLeft: state.pomodoroFocus * 60, isRunning: false })),

            openFocusModal: (taskId) => set({ isFocusModalOpen: true, focusTaskId: taskId || null }),
            closeFocusModal: () => set({ isFocusModalOpen: false, focusTaskId: null }),

            startMode: (mode, taskId) => set((state) => ({
                activeMode: mode, activeTaskId: taskId, isFocusModalOpen: false,
                timeLeft: state.pomodoroFocus * 60, isRunning: true
            })),

            exitMode: () => set({ activeMode: 'none', activeTaskId: null, isRunning: false }),

            updatePomodoroSettings: (settings) => set((state) => ({ ...state, ...settings })),

            // --- 🤖 TUTOR ACTIONS ---
            startTutorMode: (shardId, type) => set((state) => ({
                isTutorModeActive: true, activeShardId: shardId, tutorChatHistory: [],
                tutorSessionState: {
                    questionIndex: 0,
                    isSessionComplete: false,
                    preferredType: type || state.tutorSessionState.preferredType || 'mixed',
                    totalMasteryGained: 0
                }
            })),

            exitTutorMode: () => set({ isTutorModeActive: false, activeShardId: null, tutorChatHistory: [] }),

            completeTutorSession: async (masteryGained) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const activeShard = get().shards.find(s => s.id === get().activeShardId);
                if (!activeShard) return;

                const newSession: TutorSession = {
                    id: Date.now().toString(),
                    shardId: activeShard.id,
                    shardTitle: activeShard.title,
                    date: new Date().toISOString(),
                    history: get().tutorChatHistory,
                    masteryGained
                };

                set((state) => ({
                    pastTutorSessions: [newSession, ...state.pastTutorSessions],
                    tutorSessionState: {
                        ...state.tutorSessionState,
                        isSessionComplete: true,
                        totalMasteryGained: 0
                    }
                }));

                await supabase.from('ai_sessions').insert([{
                    user_id: user.id,
                    shard_id: activeShard.id,
                    chat_history: get().tutorChatHistory,
                    mastery_gained: masteryGained
                }]);
            },

            updateShardMastery: async (id, amount) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                let masteredShardRef: Shard | null = null;
                let updatedShardRef: Shard | null = null;

                set((state) => {
                    const newShards = state.shards.map(shard => {
                        if (shard.id !== id) return shard;
                        const newMastery = Math.min(100, shard.mastery + amount);
                        const isNowMastered = newMastery >= 100;
                        const updatedShard = { ...shard, mastery: newMastery, isMastered: isNowMastered };
                        updatedShardRef = updatedShard;

                        // Captures the exact moment it crosses the 100% threshold
                        if (isNowMastered && !shard.isMastered) masteredShardRef = updatedShard;

                        return updatedShard;
                    });

                    if (masteredShardRef) {
                        return { shards: newShards }; // Just return the shards, no fake tasks!
                    }
                    return { shards: newShards };
                });

                // Update the database for the shard progress
                if (updatedShardRef) {
                    await supabase.from('shards').update({
                        mastery: (updatedShardRef as Shard).mastery,
                        is_mastered: (updatedShardRef as Shard).isMastered,
                        last_mastered_date: new Date().toISOString()
                    }).eq('id', id);
                }

                // 🚨 THE 250 XP MASTERY BOUNTY 🚨
                if (masteredShardRef) {
                    get().gainXp(250); // The balanced XP payout!
                    get().modifyFocusScore(15); // A nice Focus Score bump

                    if (get().triggerChumToast) {
                        get().triggerChumToast(`Neural Link Ascended! +250 XP for mastering ${(masteredShardRef as Shard).title}!`);
                    }

                    await supabase.from('tasks').insert([{
                        user_id: user.id,
                        title: `Mastered: ${(masteredShardRef as Shard).title}`,
                        description: "Forged and mastered in the Hall of Mastery.",
                        load: 'heavy',
                        is_completed: true,
                        is_pinned: true
                    }]);
                }
            },

            // --- ⚙️ SETTINGS & AI ---
            setNormalChatHistory: (history) => set((state) => ({ normalChatHistory: typeof history === 'function' ? history(state.normalChatHistory) : history })),
            setTutorChatHistory: (history) => set((state) => ({ tutorChatHistory: typeof history === 'function' ? history(state.tutorChatHistory) : history })),
            updateTutorSessionState: (update) => set((state) => ({ tutorSessionState: { ...state.tutorSessionState, ...update } })),
            setAITier: (tier) => set({ aiTier: tier }),
            updateAIKeys: (keys) => set((state) => ({ aiKeys: { ...state.aiKeys, ...keys } })),
            setOllamaUrl: (url) => set({ ollamaUrl: url }),

            // --- 🧥 COSMETICS ---
            updateUserTheme: async (themeId: string) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;
                const isPremiumTheme = ["sakura", "academia", "lofi", "nordic", "e-ink"].includes(themeId);
                if (isPremiumTheme && !get().isPremiumUser) return;

                await supabase.from('chum_wardrobe').update({ active_theme: themeId }).eq('user_id', user.id);
                document.documentElement.setAttribute("data-theme", themeId);
                localStorage.setItem("appTheme", themeId);
            },

            reset: () => set({
                isInitialized: false,
                tasks: [],
                shards: [],
                focusScore: 100,
                totalSessions: 0,
                activeMode: 'none',
                activeTaskId: null,
                focusTaskId: null,
                isPremiumUser: false,
                normalChatHistory: [{ role: 'chum', text: "Ready to study." }],
                tutorChatHistory: [],
                pastTutorSessions: []
            })
        }),
        {
            name: 'studybuddy-storage',
            partialize: (state) => ({
                aiKeys: state.aiKeys,
                aiTier: state.aiTier,
                ollamaUrl: state.ollamaUrl,
                pomodoroFocus: state.pomodoroFocus,
                pomodoroShortBreak: state.pomodoroShortBreak,
                pomodoroLongBreak: state.pomodoroLongBreak,
                pomodoroCycles: state.pomodoroCycles,
                devOverlayEnabled: state.devOverlayEnabled,
                activeCrystalTheme: state.activeCrystalTheme,
                windSpeed: state.windSpeed,
                swayAmount: state.swayAmount,
                flowerCount: state.flowerCount,
                swayEnabled: state.swayEnabled,
                dailyFocusScores: state.dailyFocusScores,
                flowBreaks: state.flowBreaks,
                tabSwitches: state.tabSwitches,
            })
        }
    )
);