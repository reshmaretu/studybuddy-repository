import { useState } from 'react';
import { motion } from 'framer-motion';
import { useStudyStore, Task } from '@/store/useStudyStore';
import { Check, X, Moon, Sunrise, Trash2 } from 'lucide-react';

export default function UnDoneModal({ onClose }: { onClose: () => void }) {
    const { tasks, completeTask, deleteTask, updateTask } = useStudyStore();
    const activeQuests = tasks.filter(t => !t.isCompleted);

    // Keep track of which tasks we have 'resolved' in this modal
    const [resolvedTaskIds, setResolvedTaskIds] = useState<string[]>([]);

    const handleMoveToTomorrow = (task: Task) => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(tomorrow.getHours() - tomorrow.getTimezoneOffset() / 60);
        
        updateTask(task.id, { 
            deadline: tomorrow.toISOString().slice(0, 16),
            // Reset daily tracking states if necessary
            isFrog: false,
            eisenhowerQuadrant: undefined,
            ivyRank: undefined
        });
        setResolvedTaskIds([...resolvedTaskIds, task.id]);
    };

    const handleDelete = (id: string) => {
        deleteTask(id);
        setResolvedTaskIds([...resolvedTaskIds, id]);
    };

    const unresolvedQuests = activeQuests.filter(t => !resolvedTaskIds.includes(t.id));

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-[#0b1211]/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.9, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-8 max-w-2xl w-full shadow-2xl flex flex-col max-h-[80vh]"
            >
                <div className="text-center mb-6">
                    <div className="flex justify-center mb-4">
                        <Moon size={40} className="text-[var(--accent-teal)]" />
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--text-main)] mb-2">Wrap Up the Day</h2>
                    <p className="text-[var(--text-muted)] text-sm">
                        {unresolvedQuests.length > 0 
                            ? `You have ${unresolvedQuests.length} unfinished quest${unresolvedQuests.length > 1 ? 's' : ''}. Let's clear the board for tomorrow.`
                            : "Your board is clear. Great job today!"}
                    </p>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-2 mb-6">
                    {unresolvedQuests.length === 0 ? (
                        <div className="h-32 flex items-center justify-center text-[var(--text-muted)] italic">
                            All caught up!
                        </div>
                    ) : (
                        unresolvedQuests.map((task) => (
                            <div key={task.id} className="bg-[var(--bg-dark)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                                <div>
                                    <h4 className="font-bold text-[var(--text-main)]">{task.title}</h4>
                                    {task.description && <p className="text-xs text-[var(--text-muted)] mt-1 line-clamp-1">{task.description}</p>}
                                </div>
                                <div className="flex items-center gap-2 w-full sm:w-auto">
                                    <button 
                                        onClick={() => handleMoveToTomorrow(task)}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-[var(--bg-sidebar)] hover:bg-[var(--accent-teal)]/20 border border-[var(--border-color)] hover:border-[var(--accent-teal)] rounded-lg text-xs font-bold text-[var(--text-main)] hover:text-[var(--accent-teal)] transition-colors"
                                    >
                                        <Sunrise size={14} /> Tomorrow
                                    </button>
                                    <button 
                                        onClick={() => handleDelete(task.id)}
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-[var(--bg-sidebar)] hover:bg-red-500/20 border border-[var(--border-color)] hover:border-red-500 rounded-lg text-xs font-bold text-[var(--text-main)] hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 size={14} /> Delete
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <button
                    onClick={onClose}
                    disabled={unresolvedQuests.length > 0}
                    className="w-full py-3 rounded-xl bg-[var(--accent-teal)] text-[#0b1211] font-bold disabled:opacity-50 transition-opacity hover:opacity-90"
                >
                    {unresolvedQuests.length > 0 ? "Resolve Remaining Quests" : "Rest Well"}
                </button>
            </motion.div>
        </div>
    );
}
