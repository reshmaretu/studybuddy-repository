import React from 'react';

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

export interface AppNotification {
    id: string;
    category: 'activity' | 'system';
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: string;
    isRead: boolean;
    link?: string;
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
    totalMasteryGained: number;
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
