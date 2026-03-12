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
}

export interface ChatMessage {
    role: 'user' | 'chum';
    text: string;
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

interface StudyState {
    // 🌐 CLOUD SYNC STATE
    isInitialized: boolean;
    initializeData: () => Promise<void>;

    isMindDumpOpen: boolean;
    toggleMindDump: () => void;

    tasks: Task[];
    focusScore: number;
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

    // ⚡ ASYNC ACTIONS (Cloud Synced)
    addTask: (task: Omit<Task, 'id' | 'isCompleted'>) => Promise<void>;
    deleteTask: (id: string) => Promise<void>;
    updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
    completeTask: (id: string) => Promise<void>;
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
    completeTutorSession: (masteryGained: number) => void;
    updateShardMastery: (id: string, amount: number) => void;
    setNormalChatHistory: (history: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
    setTutorChatHistory: (history: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
    updateTutorSessionState: (state: Partial<StudyState['tutorSessionState']>) => void;
    setAITier: (tier: 'cloud' | 'local' | 'offline') => void;
    updateAIKeys: (keys: Partial<StudyState['aiKeys']>) => void;
    setOllamaUrl: (url: string) => void;

    // 💎 PREMIUM STATE
    isPremiumUser: boolean;
    checkPremiumStatus: () => Promise<void>;

    updateUserTheme: (themeId: string) => Promise<void>;
}

export const useStudyStore = create<StudyState>()(
    persist(
        (set, get) => ({
            // 🌐 CLOUD SYNC STATE
            isInitialized: false,

            // 💎 PREMIUM STATE & CHECKER
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
            isMindDumpOpen: false,
            toggleMindDump: () => set((state) => ({ isMindDumpOpen: !state.isMindDumpOpen })),
            tasks: [],
            focusScore: 100,
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

            // ==========================================
            // 🌐 CLOUD FETCHING
            // ==========================================
            initializeData: async () => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                const [tasksResponse, shardsResponse, profileResponse] = await Promise.all([
                    supabase.from('tasks').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
                    supabase.from('shards').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
                    // ⚡ FETCH PREMIUM STATUS HERE TOO
                    supabase.from('profiles').select('focus_score, total_hours, is_premium').eq('id', user.id).single()
                ]);

                if (tasksResponse.data) {
                    set({
                        tasks: tasksResponse.data.map(t => ({
                            id: t.id, title: t.title, description: t.description,
                            load: t.load, deadline: t.deadline, isCompleted: t.is_completed, isPinned: t.is_pinned
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

                if (profileResponse.data) {
                    set({
                        focusScore: profileResponse.data.focus_score,
                        totalSessions: profileResponse.data.total_hours,
                        // 💎 This ensures the store is accurate immediately on load
                        isPremiumUser: profileResponse.data.is_premium
                    });
                }

                set({ isInitialized: true });
            },

            updateUserTheme: async (themeId: string) => {
                const { data: { user } } = await supabase.auth.getUser();
                if (!user) return;

                // Only allow update if it's a free theme OR user is premium
                const isPremiumTheme = ["sakura", "academia", "lofi", "nordic", "e-ink"].includes(themeId);

                if (isPremiumTheme && !get().isPremiumUser) {
                    console.error("Access Denied: Premium Theme restricted.");
                    return;
                }

                // Update DB
                await supabase.from('profiles').update({ preferred_theme: themeId }).eq('id', user.id);

                // Update UI
                document.documentElement.setAttribute("data-theme", themeId);
                localStorage.setItem("appTheme", themeId);
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
                    user_id: user.id, title: task.title, description: task.description, load: task.load, deadline: task.deadline
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
                    await supabase.from('tasks').update(dbUpdates).eq('id', id);
                }
            },

            completeTask: async (id) => {
                const { data: { user } } = await supabase.auth.getUser();

                set((state) => ({
                    tasks: state.tasks.map((t) => t.id === id ? { ...t, isCompleted: true } : t),
                    focusScore: Math.min(100, state.focusScore + 10),
                    totalSessions: state.totalSessions + 1
                }));

                if (!id.startsWith('temp-') && user) {
                    await Promise.all([
                        supabase.from('tasks').update({ is_completed: true }).eq('id', id),
                        supabase.from('profiles').update({
                            focus_score: Math.min(100, get().focusScore),
                            total_sessions: get().totalSessions
                        }).eq('id', user.id)
                    ]);
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

            // ==========================================
            // 🕒 LOCAL UI ACTIONS (Unchanged)
            // ==========================================
            toggleTimer: () => set((state) => ({ isRunning: !state.isRunning })),
            resetTimer: () => set((state) => ({ timeLeft: state.pomodoroFocus * 60, isRunning: false })),
            decrementTimer: () => set((state) => ({ timeLeft: Math.max(0, state.timeLeft - 1) })),
            openFocusModal: (taskId) => set({ isFocusModalOpen: true, focusTaskId: taskId || null }),
            closeFocusModal: () => set({ isFocusModalOpen: false, focusTaskId: null }),
            startMode: (mode, taskId) => set((state) => ({
                activeMode: mode, activeTaskId: taskId, isFocusModalOpen: false,
                timeLeft: state.pomodoroFocus * 60, isRunning: true
            })),
            exitMode: () => set({ activeMode: 'none', activeTaskId: null, isRunning: false }),
            updatePomodoroSettings: (settings) => set((state) => ({ ...state, ...settings })),

            startTutorMode: (shardId, type) => set((state) => ({
                isTutorModeActive: true, activeShardId: shardId, tutorChatHistory: [],
                tutorSessionState: { questionIndex: 0, isSessionComplete: false, preferredType: type || state.tutorSessionState.preferredType || 'mixed', totalMasteryGained: 0 }
            })),
            exitTutorMode: () => set({ isTutorModeActive: false, activeShardId: null, tutorChatHistory: [] }),

            completeTutorSession: (masteryGained) => set((state) => {
                const activeShard = state.shards.find(s => s.id === state.activeShardId);
                if (!activeShard) return state;

                const newSession: TutorSession = {
                    id: Date.now().toString(),
                    shardId: activeShard.id,
                    shardTitle: activeShard.title,
                    date: new Date().toISOString(),
                    history: state.tutorChatHistory,
                    masteryGained // This will now be the full +24 you pass in from ChumWidget
                };

                return {
                    pastTutorSessions: [newSession, ...state.pastTutorSessions],
                    tutorSessionState: {
                        ...state.tutorSessionState,
                        isSessionComplete: true,
                        totalMasteryGained: 0 // 👈 CRITICAL: Reset the counter for the next session!
                    }
                };
            }),

            updateShardMastery: (id, amount) => set((state) => {
                let masteredShard: Shard | null = null;
                const newShards = state.shards.map(shard => {
                    if (shard.id !== id) return shard;
                    const newMastery = Math.min(100, shard.mastery + amount);
                    const isNowMastered = newMastery >= 100;
                    const updatedShard = { ...shard, mastery: newMastery, isMastered: isNowMastered };
                    if (isNowMastered && !shard.isMastered) masteredShard = updatedShard;
                    return updatedShard;
                });

                if (masteredShard) {
                    const clonedTask: Task = {
                        id: `mastery-${Date.now()}`,
                        title: `Mastered: ${(masteredShard as Shard).title}`,
                        description: "Forged and mastered in the Hall of Mastery.",
                        load: 'heavy', isCompleted: true, isPinned: true
                    };
                    return { shards: newShards, tasks: [clonedTask, ...state.tasks] };
                }
                return { shards: newShards };
            }),

            setNormalChatHistory: (history) => set((state) => ({ normalChatHistory: typeof history === 'function' ? history(state.normalChatHistory) : history })),
            setTutorChatHistory: (history) => set((state) => ({ tutorChatHistory: typeof history === 'function' ? history(state.tutorChatHistory) : history })),
            updateTutorSessionState: (update) => set((state) => ({ tutorSessionState: { ...state.tutorSessionState, ...update } })),
            setAITier: (tier) => set({ aiTier: tier }),
            updateAIKeys: (keys) => set((state) => ({ aiKeys: { ...state.aiKeys, ...keys } })),
            setOllamaUrl: (url) => set({ ollamaUrl: url })
        }),
        {
            name: 'studybuddy-storage',
            // Only save these settings to local storage so they don't overwrite the cloud data on refresh!
            partialize: (state) => ({
                aiKeys: state.aiKeys,
                aiTier: state.aiTier,
                ollamaUrl: state.ollamaUrl,
                pomodoroFocus: state.pomodoroFocus,
                pomodoroShortBreak: state.pomodoroShortBreak,
                pomodoroLongBreak: state.pomodoroLongBreak,
                pomodoroCycles: state.pomodoroCycles
            })
        }
    )
);