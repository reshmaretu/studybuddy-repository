import React from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { supabase } from '@/lib/supabase';

// 1. Explicitly export the TaskLoad type
export type TaskLoad = 'light' | 'medium' | 'heavy';

export interface ChumToast {
    message: string | React.ReactNode;
    type?: 'info' | 'success' | 'warning' | 'error';
    action?: () => void;
}

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

export type PerformanceMode = 'auto' | 'high' | 'balanced' | 'low';

export interface AccessibilitySettings {
    highContrast: boolean;
    largeText: boolean;
    reducedMotion: boolean;
}

export interface PerformanceSettings {
    mode: PerformanceMode;
    showParticles: boolean;
    bloomEnabled: boolean;
    antialiasing: boolean;
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
    if (level >= 99) return "Guardian of the Garden";
    if (level >= 75) return "Spirit Sage";
    if (level >= 50) return "Master of Flow";
    if (level >= 25) return "Grounded Scholar";
    if (level >= 10) return "Leaf Listener";
    if (level >= 5) return "Seedling";
    return "New Sprout";
};

interface StudyState {
    displayName: string;
    fullName: string;
    userEmail: string;
    isVerified: boolean;
    avatarUrl: string | null;
    isProfileModalOpen: boolean;
    isBrainResetOpen: boolean;

    setDisplayName: (name: string) => void;
    setFullName: (name: string) => void;
    setUserEmail: (email: string) => void;
    setIsVerified: (val: boolean) => void;
    setAvatarUrl: (url: string | null) => void;
    setProfileModalOpen: (open: boolean) => void;
    setIsBrainResetOpen: (open: boolean) => void;
    lastResetHighlightAt: string | null;
    setLastLevelUp: (level: number | null) => void;

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
    sessionsSinceLastReset: number;
    totalSecondsTracked: number;
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
    selectedModel: string;
    setSelectedModel: (model: string) => void;
    ollamaUrl: string;

    xp: number;
    level: number;
    lastLevelUp: number | null;
    lastXpGain: number | null;
    modifyFocusScore: (amount: number) => Promise<void>;
    gainXp: (amount: number) => Promise<void>;
    completeStudySession: () => Promise<void>;

    activeCrystalTheme: string;
    activeAtmosphereFilter: 'default' | 'dark' | 'refreshing' | 'cool';
    setActiveCrystalTheme: (themeId: string) => void;
    setActiveAtmosphereFilter: (filter: 'default' | 'dark' | 'refreshing' | 'cool') => void;

    activeAccessories: { id: string; fileName: string; zIndex: number; name?: string }[];
    toggleAccessory: (acc: any) => void;
    setActiveAccessories: (accessories: { id: string; fileName: string; zIndex: number; name?: string }[]) => Promise<void>;
    syncWardrobe: () => Promise<void>;

    windSpeed: number;
    swayAmount: number;
    setWindSettings: (settings: Partial<{ windSpeed: number; swayAmount: number }>) => void;

    flowerCount: number;
    swayEnabled: boolean;
    setFlowerSettings: (settings: Partial<{ flowerCount: number; swayEnabled: boolean }>) => void;

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

    // 🎭 MOCK USERS & INVOICES (Dev Only)
    mockUsers: any[];
    mockInvoices: any[];
    setMockUsers: (val: any[] | ((prev: any[]) => any[])) => void;
    addMockInvoice: (invoice: any) => void;
    setPremiumStatus: (status: boolean) => void;

    chumToasts: ChumToast[];
    triggerChumToast: (message: string | React.ReactNode, type?: 'info' | 'success' | 'warning', action?: () => void) => void;

    // 🏆 PROTOCOL LIMITS
    protocolLimits: { heavy: number; medium: number; light: number };
    updateProtocolLimits: (limits: Partial<{ heavy: number; medium: number; light: number }>) => void;

    // ✏️ EDIT MODAL
    isEditModalOpen: boolean;
    editingTaskId: string | null;
    openEditModal: (taskId: string) => void;
    closeEditModal: () => void;

    // 👁️ VIEW MODAL
    isViewModalOpen: boolean;
    viewingTaskId: string | null;
    openViewModal: (taskId: string) => void;
    closeViewModal: () => void;

    // ⚙️ SETTINGS
    doubleClickToComplete: boolean;
    dndEnabled: boolean;
    isSidebarHidden: boolean;
    performanceSettings: PerformanceSettings;
    accessibilitySettings: AccessibilitySettings;
    setSettings: (settings: Partial<{ doubleClickToComplete: boolean; dndEnabled: boolean; isSidebarHidden: boolean; performanceSettings: Partial<PerformanceSettings>; accessibilitySettings: Partial<AccessibilitySettings> }>) => void;
    handleLogout: () => Promise<void>;
}

export const useStudyStore = create<StudyState>()(
    persist(
        (set, get) => ({
            isInitialized: false,
            isPremiumUser: false,
            isVerified: false,
            displayName: "",
            fullName: "",
            userEmail: "",
            avatarUrl: null,
            isProfileModalOpen: false,
            isBrainResetOpen: false,
            lastResetHighlightAt: null,
            lastLevelUp: null,
            lastXpGain: null,
            mockInvoices: [],

            setDisplayName: (name) => set({ displayName: name }),
            setFullName: (name) => set({ fullName: name }),
            setUserEmail: (email) => set({ userEmail: email }),
            setIsVerified: (val) => set({ isVerified: val }),
            setAvatarUrl: (url) => set({ avatarUrl: url }),
            setProfileModalOpen: (open) => set({ isProfileModalOpen: open }),
            setIsBrainResetOpen: (open) => set({ isBrainResetOpen: open }),
            setLastLevelUp: (val) => set({ lastLevelUp: val }),

            addMockInvoice: (invoice) => set((state) => ({
                mockInvoices: [invoice, ...state.mockInvoices]
            })),
            setPremiumStatus: (status) => set({ isPremiumUser: status }),
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
            sessionsSinceLastReset: 0,
            totalSecondsTracked: 0,
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
            selectedModel: 'mistralai/mistral-7b-instruct:free',
            setSelectedModel: (model) => set({ selectedModel: model }),
            ollamaUrl: 'http://localhost:11434',
            showNodeBadge: true,
            setShowNodeBadge: (showNodeBadge) => set({ showNodeBadge }),

            activeFramework: null,
            lastPlannedDate: null,
            isDev: false,
            devOverlayEnabled: true,
            protocolLimits: { heavy: 1, medium: 3, light: 5 },
            isEditModalOpen: false,
            editingTaskId: null,
            isViewModalOpen: false,
            viewingTaskId: null,

            // ⚙️ SETTINGS
            doubleClickToComplete: true,
            dndEnabled: true,
            isSidebarHidden: false,
            performanceSettings: {
                mode: 'auto',
                showParticles: true,
                bloomEnabled: true,
                antialiasing: true
            },
            accessibilitySettings: {
                highContrast: false,
                largeText: false,
                reducedMotion: false
            },
            setSettings: (settings) => set((state) => ({
                ...state,
                ...settings,
                performanceSettings: settings.performanceSettings
                    ? { ...state.performanceSettings, ...settings.performanceSettings }
                    : state.performanceSettings,
                accessibilitySettings: settings.accessibilitySettings
                    ? { ...state.accessibilitySettings, ...settings.accessibilitySettings }
                    : state.accessibilitySettings
            })),
            handleLogout: async () => {
                const { error } = await supabase.auth.signOut();
                if (!error) {
                    window.location.href = '/login';
                }
            },

            chumToasts: [],
            triggerChumToast: (message, type = 'info', action) => {
                const id = Math.random().toString(36).substring(7);
                const newToast = { message, type, action, id } as any;
                set((state) => ({ chumToasts: [...state.chumToasts, newToast] }));
                
                setTimeout(() => {
                    set((state) => ({
                        chumToasts: state.chumToasts.filter((t: any) => t.id !== id)
                    }));
                }, 8000);
            },

            updateProtocolLimits: (limits) => set((state) => ({ protocolLimits: { ...state.protocolLimits, ...limits } })),
            openEditModal: (taskId) => set({ isEditModalOpen: true, editingTaskId: taskId }),
            closeEditModal: () => set({ isEditModalOpen: false, editingTaskId: null }),
            openViewModal: (taskId) => set({ isViewModalOpen: true, viewingTaskId: taskId }),
            closeViewModal: () => set({ isViewModalOpen: false, viewingTaskId: null }),

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

                    if (didLevelUp) {
                        set({ lastLevelUp: currentLevel });
                        setTimeout(() => set({ lastLevelUp: null }), 5000);
                        if (state.triggerChumToast) {
                            state.triggerChumToast(
                                <span><strong className="text-(--accent-yellow)">🌟 ASCENSION REACHED!</strong><br />Level {currentLevel} achieved. You are now: <span className="text-(--accent-teal)">{getTitleForLevel(currentLevel)}</span></span>, 
                                'info'
                            );
                        }
                    }

                    if (finalAmount > 0) {
                        set({ lastXpGain: finalAmount });
                        setTimeout(() => set({ lastXpGain: null }), 3000);
                        if (state.triggerChumToast && !didLevelUp) {
                            state.triggerChumToast(
                                <span><strong className="text-(--accent-teal)">✨ Essence Absorbed!</strong><br />+{finalAmount} XP added to your neural network.</span>, 
                                'success'
                            );
                        }
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

                const newTotal = get().totalSessions + 1;
                const newSinceReset = get().sessionsSinceLastReset + 1;
                set({ totalSessions: newTotal, sessionsSinceLastReset: newSinceReset });

                if (newSinceReset >= 4) {
                    set({ lastResetHighlightAt: new Date().toISOString() });
                    get().triggerChumToast(
                        <span><strong className="text-(--accent-yellow)">🧠 Neural Fog Detected!</strong><br />You've completed {newSinceReset} flows without a break. Time for a Brain Reset?</span>, 
                        "info", 
                        () => get().setIsBrainResetOpen(true)
                    );
                }

                if (user) {
                    // 👇 Add total_seconds_tracked to the update payload
                    supabase.from('user_stats').update({
                        total_sessions: newTotal,
                        total_seconds_tracked: get().totalSecondsTracked
                    }).eq('user_id', user.id).then();
                }
            },

            // ─── UPDATED EXISTING ACTIONS ───

            decrementTimer: () => {
                const state = get();
                const newTracked = state.totalSecondsTracked + 1;

                // Intercept the timer exactly when it hits 0
                if (state.timeLeft === 1) {
                    set({ timeLeft: 0, isRunning: false });
                    get().completeStudySession();
                } else {
                    set({ timeLeft: Math.max(0, state.timeLeft - 1) });
                }
                if (newTracked % 60 === 0) {
                    supabase.auth.getUser().then(({ data: { user } }) => {
                        if (user) supabase.from('user_stats').update({ total_seconds_tracked: newTracked }).eq('user_id', user.id).then();
                    });
                }
            },

            completeTask: async (id, premiumStats) => {
                const { data: { user } } = await supabase.auth.getUser();
                const task = get().tasks.find(t => t.id === id);
                const now = new Date().toISOString();

                set((state) => {
                    // 🔥 IVY LEE SHIFTING LOGIC 🔥
                    let updatedTasks = state.tasks.map((t) => t.id === id ? {
                        ...t,
                        isCompleted: true,
                        completedAt: now,
                        ...premiumStats
                    } : t);

                    if (task?.ivyRank && state.activeFramework === 'ivy') {
                        const completedRank = task.ivyRank;
                        updatedTasks = updatedTasks.map(t => {
                            if (!t.isCompleted && t.ivyRank && t.ivyRank > completedRank) {
                                const newRank = t.ivyRank - 1;
                                // PERSIST TO DB
                                if (!t.id.startsWith('temp-')) {
                                    supabase.from('tasks').update({ ivy_rank: newRank }).eq('id', t.id).then();
                                }
                                return { ...t, ivyRank: newRank };
                            }
                            return t;
                        });
                    }

                    return { tasks: updatedTasks };
                });

                get().modifyFocusScore(5);

                if (task) {
                    const xpReward = task.load === 'heavy' ? 20 : task.load === 'medium' ? 10 : 5;
                    get().gainXp(xpReward);
                }

                if (!id.startsWith('temp-') && user) {
                    // Update session counts for ANY completion
                    const newTotal = get().totalSessions + 1;
                    const newSinceReset = get().sessionsSinceLastReset + 1;
                    set({ totalSessions: newTotal, sessionsSinceLastReset: newSinceReset });

                    if (newSinceReset >= 4) {
                        set({ lastResetHighlightAt: new Date().toISOString() });
                        get().triggerChumToast(
                            <span><strong className="text-[var(--accent-yellow)]">🧠 Neural Fog Detected!</strong><br />You've completed {newSinceReset} blooms without a break. Time for a Brain Reset?</span>, 
                            "info", 
                            () => get().setIsBrainResetOpen(true)
                        );
                    }

                    supabase.from('user_stats').update({ total_sessions: newTotal }).eq('user_id', user.id).then();

                    const dbUpdate: any = { is_completed: true, completed_at: now };
                    if (premiumStats?.actualPomos !== undefined) dbUpdate.actual_pomodoros = premiumStats.actualPomos;
                    if (premiumStats?.stressLevel !== undefined) dbUpdate.stress_level = premiumStats.stressLevel;

                    // Bulk update for Ivy shifts is harder, so we just do the task for now
                    // In a real app we'd trigger a cloud function or batch update
                    supabase.from('tasks').update(dbUpdate).eq('id', id).then();

                    // IF Ivy, we should ideally sync all ranks
                    if (task?.ivyRank && get().activeFramework === 'ivy') {
                        const activeIvy = get().tasks.filter(t => !t.isCompleted && t.ivyRank);
                        for (const it of activeIvy) {
                            supabase.from('tasks').update({ ivy_rank: it.ivyRank }).eq('id', it.id).then();
                        }
                    }
                }
            },

            activeCrystalTheme: 'quartz',
            activeAtmosphereFilter: 'default',

            activeAccessories: [],
            toggleAccessory: (acc) => set((state) => ({
                activeAccessories: state.activeAccessories.find(a => a.id === acc.id)
                    ? state.activeAccessories.filter(a => a.id !== acc.id) // Remove if already active
                    : [...state.activeAccessories, acc] // Add if not active
            })),

            setActiveAccessories: async (accessories) => {
                set({ activeAccessories: accessories });
                await get().syncWardrobe();
            },

            setActiveCrystalTheme: async (themeId) => {
                set({ activeCrystalTheme: themeId });
                await get().syncWardrobe();
            },

            setActiveAtmosphereFilter: async (filter) => {
                set({ activeAtmosphereFilter: filter });
                await get().syncWardrobe();
            },

            syncWardrobe: async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const state = get();
                const wardrobeData = {
                    active_accessories: state.activeAccessories,
                    active_crystal_theme: state.activeCrystalTheme,
                    active_atmosphere_filter: state.activeAtmosphereFilter,
                    active_app_theme: localStorage.getItem('appTheme') || 'default'
                };

                await supabase
                    .from('chum_wardrobe')
                    .upsert({ user_id: user.id, ...wardrobeData }, { onConflict: 'user_id' });
            },

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
                    set({ isInitialized: true });
                    return;
                }

                try {
                    console.log("[NEURAL] Tapping into database shards...");
                    const [tasksResponse, shardsResponse, profileResponse, statsResponse, wardrobeResponse, sessionsResponse] = await Promise.all([
                        supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
                        supabase.from('shards').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
                        supabase.from('profiles').select('display_name, full_name, is_premium, is_dev, active_framework, last_planned_date, is_verified, openrouter_key, gemini_key, groq_key, avatar_url').eq('id', user.id).maybeSingle(),
                        supabase.from('user_stats').select('focus_score, total_sessions, total_seconds_tracked, xp, level').eq('user_id', user.id).maybeSingle(),
                        supabase.from('chum_wardrobe').select('*').eq('user_id', user.id).maybeSingle(),
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
                        displayName: profileResponse.data?.display_name || "",
                        fullName: profileResponse.data?.full_name || "",
                        isVerified: profileResponse.data?.is_verified || false,
                        userEmail: user.email || "",
                        focusScore: statsResponse.data?.focus_score ?? 100,
                        totalSessions: statsResponse.data?.total_sessions ?? 0,
                        totalSecondsTracked: statsResponse.data?.total_seconds_tracked ?? 0,
                        xp: statsResponse.data?.xp ?? 0,
                        level: statsResponse.data?.level ?? 1,
                        avatarUrl: profileResponse.data?.avatar_url || null,
                        isPremiumUser: profileResponse.data?.is_premium || false,
                        isDev: profileResponse.data?.is_dev || false,
                        activeFramework: profileResponse.data?.active_framework || null,
                        lastPlannedDate: profileResponse.data?.last_planned_date || null,
                        aiKeys: {
                            openrouter: profileResponse.data?.openrouter_key || "",
                            gemini: profileResponse.data?.gemini_key || "",
                            groq: profileResponse.data?.groq_key || ""
                        }
                    });
                    console.log(`[NEURAL] Profile Loaded: ${profileResponse.data?.display_name || "Unknown"} (${user.email})`);

                    const wardrobe = wardrobeResponse.data;
                    if (wardrobe) {
                        set({
                            activeAccessories: wardrobe.active_accessories || [],
                            activeCrystalTheme: wardrobe.active_crystal_theme || 'quartz',
                            activeAtmosphereFilter: wardrobe.active_atmosphere_filter || 'default'
                        });
                        const appTheme = wardrobe.active_app_theme || 'default';
                        document.documentElement.setAttribute("data-theme", appTheme);
                        localStorage.setItem("appTheme", appTheme);
                    }

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

            exitMode: () => {
                const { totalSecondsTracked } = get();
                set({ activeMode: 'none', activeTaskId: null, isRunning: false });
                
                // 🔥 IMMEDIATE SAVE ON EXIT
                supabase.auth.getUser().then(({ data: { user } }) => {
                    if (user) supabase.from('user_stats').update({ total_seconds_tracked: totalSecondsTracked }).eq('user_id', user.id).then();
                });
            },

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
                        get().triggerChumToast(`Spirit Connection Blooms! +250 Spirit for nurturing ${(masteredShardRef as Shard).title}!`);
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
            updateAIKeys: async (keys) => {
                const { data: { user } } = await supabase.auth.getUser();
                set((state) => ({ aiKeys: { ...state.aiKeys, ...keys } }));
                if (user) {
                    const dbUpdates: any = {};
                    if (keys.openrouter !== undefined) dbUpdates.openrouter_key = keys.openrouter;
                    if (keys.gemini !== undefined) dbUpdates.gemini_key = keys.gemini;
                    if (keys.groq !== undefined) dbUpdates.groq_key = keys.groq;
                    await supabase.from('profiles').update(dbUpdates).eq('id', user.id);
                }
            },
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
                totalSecondsTracked: 0,
                activeMode: 'none',
                activeTaskId: null,
                focusTaskId: null,
                isPremiumUser: false,
                normalChatHistory: [{ role: 'chum', text: "Ready to study." }],
                tutorChatHistory: [],
                pastTutorSessions: [],
                sessionsSinceLastReset: 0,
                lastResetHighlightAt: null
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
                activeAccessories: state.activeAccessories,
                windSpeed: state.windSpeed,
                swayAmount: state.swayAmount,
                flowerCount: state.flowerCount,
                swayEnabled: state.swayEnabled,
                dailyFocusScores: state.dailyFocusScores,
                flowBreaks: state.flowBreaks,
                tabSwitches: state.tabSwitches,
                sessionsSinceLastReset: state.sessionsSinceLastReset,
                lastResetHighlightAt: state.lastResetHighlightAt,
            })
        }
    )
);

