"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { BarChart3, TrendingUp, Clock, CheckCircle2, Lock, BrainCircuit, Sparkles, Filter } from "lucide-react";
import {
    LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, ScatterChart, Scatter,
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ZAxis
} from 'recharts';

// --- MOCK DATA ---
const weeklyData = [
    { name: 'Mon', focus: 2.5, score: 85, expected: 3 },
    { name: 'Tue', focus: 3.8, score: 92, expected: 3.5 },
    { name: 'Wed', focus: 1.2, score: 65, expected: 2 },
    { name: 'Thu', focus: 4.5, score: 98, expected: 4 },
    { name: 'Fri', focus: 3.0, score: 88, expected: 3.5 },
    { name: 'Sat', focus: 5.2, score: 100, expected: 4 },
    { name: 'Sun', focus: 1.5, score: 75, expected: 2 },
];

const loadDistribution = [
    { name: 'Heavy Load', value: 45, color: '#ef4444' }, // red-500
    { name: 'Medium Load', value: 35, color: '#facc15' }, // yellow-400
    { name: 'Light Load', value: 20, color: '#14b8a6' }, // teal-500
];

const burnoutMatrixData = [
    { hours: 8, stress: 90, z: 200, name: 'Midterm Cram' },
    { hours: 2, stress: 30, z: 100, name: 'Daily Review' },
    { hours: 5, stress: 60, z: 150, name: 'Project Work' },
    { hours: 9, stress: 95, z: 250, name: 'Finals Prep' },
    { hours: 1, stress: 10, z: 80, name: 'Quick Read' },
];

export default function InsightsPage() {
    const [isMounted, setIsMounted] = useState(false);
    const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'all'>('week');
    const [isPremium, setIsPremium] = useState(false); // Toggle this to see the premium features unlock

    useEffect(() => setIsMounted(true), []);
    if (!isMounted) return null;

    // Custom Tooltip for Recharts to match the Glassmorphic Theme
    const CustomTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
            return (
                <div className="bg-[var(--bg-dark)]/90 backdrop-blur-md border border-[var(--border-color)] p-3 rounded-xl shadow-xl">
                    <p className="text-[var(--text-main)] font-bold text-sm mb-2">{label}</p>
                    {payload.map((entry: any, index: number) => (
                        <p key={index} className="text-xs font-bold" style={{ color: entry.color }}>
                            {entry.name}: {entry.value}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-12">

            {/* HEADER & FILTERS */}
            <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-[var(--text-main)] flex items-center gap-3">
                        <BarChart3 className="text-[var(--accent-teal)]" size={32} />
                        Insights
                    </h1>
                    <p className="text-[var(--text-muted)] mt-1">Data-driven deep work analysis.</p>
                </div>

                <div className="flex items-center gap-2 bg-[var(--bg-card)] border border-[var(--border-color)] p-1 rounded-xl">
                    <div className="px-3 text-[var(--text-muted)]"><Filter size={14} /></div>
                    {(['today', 'week', 'month', 'all'] as const).map(range => (
                        <button
                            key={range}
                            onClick={() => setTimeRange(range)}
                            className={`px-4 py-1.5 rounded-lg text-xs font-bold capitalize transition-colors ${timeRange === range ? 'bg-[var(--bg-dark)] text-[var(--text-main)] border border-[var(--border-color)]' : 'text-[var(--text-muted)] hover:text-[var(--text-main)]'}`}
                        >
                            {range}
                        </button>
                    ))}
                </div>
            </header>

            {/* CHUM AI DATA ANALYSIS (FREEMIUM) */}
            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl shadow-sm flex flex-col md:flex-row gap-6 items-center">
                <div className="w-16 h-16 rounded-full flex items-center justify-center border border-[var(--accent-teal)]/30 bg-[var(--accent-teal)]/10 shadow-[0_0_15px_rgba(20,184,166,0.2)] flex-shrink-0">
                    <BrainCircuit size={28} className="text-[var(--accent-teal)]" />
                </div>
                <div className="flex-1">
                    <h3 className="text-sm font-bold text-[var(--accent-teal)] uppercase tracking-widest mb-1">Chum AI Analysis</h3>
                    <p className="text-[var(--text-main)] text-sm leading-relaxed">
                        "Your flow momentum is peaking! You hit your highest focus score (100) on Saturday, effectively tackling your heavy load tasks. However, Wednesday showed a sharp dip in both hours and focus. Suggestion: Protect your mid-week energy by scheduling lighter reading tasks for Wednesdays."
                    </p>
                </div>
                {!isPremium && (
                    <button onClick={() => setIsPremium(true)} className="flex-shrink-0 bg-[var(--accent-yellow)]/10 border border-[var(--accent-yellow)]/30 text-[var(--accent-yellow)] px-4 py-2 rounded-xl text-xs font-bold hover:bg-[var(--accent-yellow)] hover:text-black transition-colors flex items-center gap-2">
                        <Sparkles size={14} /> Deep Dive (Pro)
                    </button>
                )}
            </div>

            {/* KPI ROW */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-[var(--accent-cyan)]/10 text-[var(--accent-cyan)] rounded-xl"><Clock size={24} /></div>
                    <div>
                        <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest">Total Hours</p>
                        <p className="text-2xl font-bold text-[var(--text-main)]">21.7h</p>
                    </div>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-[var(--accent-teal)]/10 text-[var(--accent-teal)] rounded-xl"><TrendingUp size={24} /></div>
                    <div>
                        <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest">Avg Focus Score</p>
                        <p className="text-2xl font-bold text-[var(--text-main)]">86/100</p>
                    </div>
                </div>
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-5 rounded-2xl flex items-center gap-4">
                    <div className="p-3 bg-[var(--accent-yellow)]/10 text-[var(--accent-yellow)] rounded-xl"><CheckCircle2 size={24} /></div>
                    <div>
                        <p className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-widest">Tasks Mastered</p>
                        <p className="text-2xl font-bold text-[var(--text-main)]">14</p>
                    </div>
                </div>
            </div>

            {/* FREEMIUM CHARTS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* Focus Score History (Line) */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl h-[350px] flex flex-col">
                    <h3 className="text-sm font-bold text-[var(--text-main)] mb-6">Focus Score Momentum</h3>
                    <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={weeklyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} domain={[0, 100]} />
                                <Tooltip content={<CustomTooltip />} />
                                <Line type="monotone" dataKey="score" stroke="var(--accent-teal)" strokeWidth={4} dot={{ r: 4, fill: "var(--bg-dark)", strokeWidth: 2 }} activeDot={{ r: 6, fill: "var(--accent-teal)" }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Load Distribution (Pie) & Avg Focus (Bar) Combo */}
                <div className="flex flex-col gap-6">
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl flex-1 flex items-center justify-between">
                        <div>
                            <h3 className="text-sm font-bold text-[var(--text-main)] mb-1">Load Distribution</h3>
                            <p className="text-xs text-[var(--text-muted)] max-w-[150px]">Breakdown of tasks completed by cognitive load.</p>
                        </div>
                        <div className="h-[120px] w-[120px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={loadDistribution} innerRadius={35} outerRadius={55} paddingAngle={5} dataKey="value" stroke="none">
                                        {loadDistribution.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl flex-1 flex flex-col">
                        <h3 className="text-sm font-bold text-[var(--text-main)] mb-2">Average Focus (Hours)</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData}>
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border-color)', opacity: 0.2 }} />
                                <Bar dataKey="focus" fill="var(--accent-cyan)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* PREMIUM ADVANCED STATS */}
            <div className="relative mt-8">
                <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-xl font-bold text-[var(--text-main)]">Advanced Analytics</h2>
                    <div className="h-px flex-1 bg-[var(--border-color)]"></div>
                </div>

                {!isPremium && (
                    <div className="absolute inset-0 z-20 backdrop-blur-[6px] bg-[var(--bg-dark)]/40 rounded-3xl flex flex-col items-center justify-center border border-[var(--border-color)] mt-12">
                        <Lock size={48} className="text-[var(--accent-yellow)] mb-4" />
                        <h3 className="text-2xl font-bold text-[var(--text-main)] mb-2">Unlock Pro Insights</h3>
                        <p className="text-[var(--text-muted)] text-sm mb-6 max-w-md text-center">Get access to the Burnout Matrix, Flow Integrity tracking, and your customized Cognitive Archetype.</p>
                        <button onClick={() => setIsPremium(true)} className="bg-[var(--accent-yellow)] text-black px-8 py-3 rounded-xl font-bold hover:bg-yellow-400 transition-colors">
                            Upgrade Now
                        </button>
                    </div>
                )}

                <div className={`grid grid-cols-1 lg:grid-cols-2 gap-6 transition-all duration-500 ${!isPremium ? 'opacity-30 pointer-events-none blur-[2px]' : ''}`}>

                    {/* Burnout Matrix (Scatter Plot) */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl h-[350px] flex flex-col relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none"><BrainCircuit size={100} /></div>
                        <h3 className="text-sm font-bold text-[var(--accent-yellow)] mb-1">The Burnout Matrix</h3>
                        <p className="text-xs text-[var(--text-muted)] mb-6">Task Length vs. Perceived Stress. Avoid the top right quadrant.</p>
                        <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                                <XAxis type="number" dataKey="hours" name="Hours" unit="h" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis type="number" dataKey="stress" name="Stress Level" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                <ZAxis type="number" dataKey="z" range={[50, 400]} name="Volume" />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} content={<CustomTooltip />} />
                                <Scatter name="Sessions" data={burnoutMatrixData} fill="var(--accent-yellow)" opacity={0.8} />
                            </ScatterChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Estimated vs Actual (Grouped Bar) */}
                    <div className="bg-[var(--bg-card)] border border-[var(--border-color)] p-6 rounded-3xl h-[350px] flex flex-col">
                        <h3 className="text-sm font-bold text-[var(--text-main)] mb-1">Time Estimation Accuracy</h3>
                        <p className="text-xs text-[var(--text-muted)] mb-6">Expected Focus Time vs Actual Focus Time.</p>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={weeklyData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
                                <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border-color)', opacity: 0.2 }} />
                                <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                                <Bar dataKey="expected" name="Expected" fill="var(--text-muted)" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="focus" name="Actual" fill="var(--accent-teal)" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Cognitive Archetype Badge */}
                    <div className="lg:col-span-2 bg-gradient-to-r from-[var(--bg-dark)] to-[var(--bg-card)] border border-[var(--border-color)] p-8 rounded-3xl flex flex-col md:flex-row items-center gap-8 shadow-sm">
                        <div className="w-32 h-32 rounded-full border-4 border-[var(--accent-teal)] bg-[var(--bg-dark)] flex items-center justify-center flex-shrink-0 relative">
                            <span className="text-5xl">🦉</span>
                            <div className="absolute -bottom-3 bg-[var(--accent-teal)] text-black text-[10px] font-bold px-3 py-1 rounded-full tracking-widest uppercase">The Night Owl</div>
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-[var(--text-main)] mb-2">Your Cognitive Archetype</h3>
                            <p className="text-[var(--text-muted)] text-sm leading-relaxed mb-4">
                                Based on your Flow Integrity and session logs, you are highly resistant to interruptions during late-night sessions. You excel at Deep Work when dealing with Heavy Loads, but struggle with task-switching during the day.
                            </p>
                            <div className="flex gap-2">
                                <span className="bg-[var(--bg-dark)] border border-[var(--border-color)] px-3 py-1 rounded-lg text-xs font-bold text-[var(--text-main)]">Flow Integrity: 94%</span>
                                <span className="bg-[var(--bg-dark)] border border-[var(--border-color)] px-3 py-1 rounded-lg text-xs font-bold text-[var(--text-main)]">Peak Time: 11:00 PM</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}