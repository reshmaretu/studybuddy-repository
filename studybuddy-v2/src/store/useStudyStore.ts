import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// 1. ADD THIS LINE: Explicitly export the TaskLoad type
export type TaskLoad = 'light' | 'medium' | 'heavy';

export interface Task {
    id: string;
    title: string;
    description?: string;
    // 2. USE IT HERE
    load: TaskLoad;
    deadline?: string;
    isCompleted: boolean;
    isPinned?: boolean;
}

export interface Shard {
    id: string;
    title: string;
    content: string;
    files?: { name: string; type: string }[]; // Added file mock
    mastery: number;
    isMastered: boolean;
    createdAt: string;
}

interface StudyState {
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

    // AI TIER & KEYS
    aiTier: 'cloud' | 'local' | 'offline';
    aiKeys: { groq: string; gemini: string; openrouter: string };
    ollamaUrl: string;

    // Actions
    addTask: (task: Omit<Task, 'id' | 'isCompleted'>) => void;
    updateTask: (id: string, updates: Partial<Task>) => void;
    completeTask: (id: string) => void;
    toggleTimer: () => void;
    resetTimer: () => void;
    decrementTimer: () => void;
    openFocusModal: (taskId?: string) => void;
    closeFocusModal: () => void;
    startMode: (mode: 'flowState' | 'studyCafe', taskId: string | null) => void;
    exitMode: () => void;
    updatePomodoroSettings: (settings: Partial<StudyState>) => void;

    // Forge Actions
    forgeShard: (shard: Omit<Shard, "id" | "mastery" | "isMastered" | "createdAt">) => void;
    deleteShard: (id: string) => void; // Added Delete
    startTutorMode: (shardId: string) => void;
    exitTutorMode: () => void;
    updateShardMastery: (id: string, amount: number) => void;

    // AI Actions
    setAITier: (tier: 'cloud' | 'local' | 'offline') => void;
    updateAIKeys: (keys: Partial<StudyState['aiKeys']>) => void;
    setOllamaUrl: (url: string) => void;
}

export const useStudyStore = create<StudyState>()(
    persist(
        (set, get) => ({
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

            aiTier: 'cloud',
            aiKeys: { groq: '', gemini: '', openrouter: '' },
            ollamaUrl: 'http://localhost:11434',

            addTask: (task) => set((state) => ({
                tasks: [...state.tasks, { ...task, id: Date.now().toString(), isCompleted: false }]
            })),
            updateTask: (id, updates) => set((state) => ({
                tasks: state.tasks.map(t => t.id === id ? { ...t, ...updates } : t)
            })),
            completeTask: (id) => set((state) => ({
                tasks: state.tasks.map((t) => t.id === id ? { ...t, isCompleted: true } : t),
                focusScore: Math.min(100, state.focusScore + 10),
                totalSessions: state.totalSessions + 1
            })),

            toggleTimer: () => set((state) => ({ isRunning: !state.isRunning })),
            resetTimer: () => set((state) => ({ timeLeft: state.pomodoroFocus * 60, isRunning: false })),
            decrementTimer: () => set((state) => ({ timeLeft: Math.max(0, state.timeLeft - 1) })),
            openFocusModal: (taskId) => set({ isFocusModalOpen: true, focusTaskId: taskId || null }),
            closeFocusModal: () => set({ isFocusModalOpen: false, focusTaskId: null }),
            startMode: (mode, taskId) => set((state) => ({
                activeMode: mode,
                activeTaskId: taskId,
                isFocusModalOpen: false,
                timeLeft: state.pomodoroFocus * 60,
                isRunning: true
            })),
            exitMode: () => set({ activeMode: 'none', activeTaskId: null, isRunning: false }),
            updatePomodoroSettings: (settings) => set((state) => ({ ...state, ...settings })),

            forgeShard: (shard) => set((state) => ({
                shards: [{
                    ...shard,
                    id: Date.now().toString(),
                    mastery: 0,
                    isMastered: false,
                    createdAt: new Date().toISOString()
                }, ...state.shards]
            })),

            // DELETION LOGIC
            deleteShard: (id) => set((state) => ({
                shards: state.shards.filter(s => s.id !== id),
                // Safety check: if we delete the active tutor shard, exit tutor mode
                isTutorModeActive: state.activeShardId === id ? false : state.isTutorModeActive,
                activeShardId: state.activeShardId === id ? null : state.activeShardId
            })),

            startTutorMode: (shardId) => set({ isTutorModeActive: true, activeShardId: shardId }),
            exitTutorMode: () => set({ isTutorModeActive: false, activeShardId: null }),

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
                        load: 'heavy',
                        isCompleted: true,
                        isPinned: true
                    };
                    return { shards: newShards, tasks: [clonedTask, ...state.tasks] };
                }

                return { shards: newShards };
            }),

            setAITier: (tier) => set({ aiTier: tier }),
            updateAIKeys: (keys) => set((state) => ({ aiKeys: { ...state.aiKeys, ...keys } })),
            setOllamaUrl: (url) => set({ ollamaUrl: url })
        }),
        { name: 'studybuddy-storage' }
    )
);