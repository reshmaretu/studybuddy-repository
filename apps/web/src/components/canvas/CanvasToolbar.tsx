"use client";

import { useCanvasStore } from "@/store/useCanvasStore";
import { MousePointer2, PenTool, Brain, Undo2, Redo2, Cloud, CloudOff, Save } from "lucide-react";

export default function CanvasToolbar({ onSave, isSaving }: { onSave?: () => void, isSaving?: boolean }) {
    const { activeTool, setActiveTool, undo, redo } = useCanvasStore();

    return (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1 bg-(--bg-card)/80 backdrop-blur-2xl p-1.5 rounded-2xl border border-(--border-color) shadow-2xl">
            <button 
                onClick={() => setActiveTool('select')}
                className={`p-3 rounded-xl transition-all ${activeTool === 'select' ? 'bg-(--accent-teal) text-black' : 'text-(--text-muted) hover:bg-(--bg-sidebar)'}`}
                title="Selection Tool"
            >
                <MousePointer2 size={18} />
            </button>
            <button 
                onClick={() => setActiveTool('pen')}
                className={`p-3 rounded-xl transition-all ${activeTool === 'pen' ? 'bg-(--accent-teal) text-black' : 'text-(--text-muted) hover:bg-(--bg-sidebar)'}`}
                title="Pen Tool (Adobe-style)"
            >
                <PenTool size={18} />
            </button>
            <button 
                onClick={() => setActiveTool('node')}
                className={`p-3 rounded-xl transition-all ${activeTool === 'node' ? 'bg-(--accent-teal) text-black' : 'text-(--text-muted) hover:bg-(--bg-sidebar)'}`}
                title="Mindmap Node"
            >
                <Brain size={18} />
            </button>
            
            <div className="w-px h-6 bg-(--border-color) mx-1" />

            <button onClick={undo} className="p-3 rounded-xl text-(--text-muted) hover:bg-(--bg-sidebar)" title="Undo">
                <Undo2 size={18} />
            </button>
            <button onClick={redo} className="p-3 rounded-xl text-(--text-muted) hover:bg-(--bg-sidebar)" title="Redo">
                <Redo2 size={18} />
            </button>

            {onSave && (
                <>
                    <div className="w-px h-6 bg-(--border-color) mx-1" />
                    <button 
                        onClick={onSave}
                        disabled={isSaving}
                        className="p-3 rounded-xl bg-(--accent-yellow) text-black hover:scale-105 transition-all disabled:opacity-50"
                        title="Save to Cloud"
                    >
                        <Save size={18} />
                    </button>
                </>
            )}
        </div>
    );
}
