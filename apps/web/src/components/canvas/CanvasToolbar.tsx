"use client";

import { useCanvasStore } from "@/store/useCanvasStore";
import { MousePointer2, PenTool, Brain, Undo2, Redo2, Save, Square, Circle, MoveUpRight, Type, StickyNote } from "lucide-react";

export default function CanvasToolbar({ onSave, isSaving }: { onSave?: () => void, isSaving?: boolean }) {
    const { activeTool, setActiveTool, undo, redo } = useCanvasStore();

    return (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-1 bg-(--bg-card)/80 backdrop-blur-2xl p-1.5 rounded-2xl border border-(--border-color) shadow-2xl">
            <button 
                onClick={() => setActiveTool('select')}
                className={`p-3 rounded-xl transition-all ${activeTool === 'select' ? 'bg-(--accent-teal) text-black font-bold' : 'text-(--text-muted) hover:bg-(--bg-sidebar)'}`}
                title="Selection Tool"
            >
                <MousePointer2 size={18} />
            </button>
            <button 
                onClick={() => setActiveTool('pen')}
                className={`p-3 rounded-xl transition-all ${activeTool === 'pen' ? 'bg-(--accent-teal) text-black font-bold' : 'text-(--text-muted) hover:bg-(--bg-sidebar)'}`}
                title="Neural Pen"
            >
                <PenTool size={18} />
            </button>
            <button 
                onClick={() => setActiveTool('node')}
                className={`p-3 rounded-xl transition-all ${activeTool === 'node' ? 'bg-(--accent-teal) text-black font-bold' : 'text-(--text-muted) hover:bg-(--bg-sidebar)'}`}
                title="Mindmap Shard"
            >
                <Brain size={18} />
            </button>
            <button 
                onClick={() => setActiveTool('rect')}
                className={`p-3 rounded-xl transition-all ${activeTool === 'rect' ? 'bg-(--accent-teal) text-black font-bold' : 'text-(--text-muted) hover:bg-(--bg-sidebar)'}`}
                title="Fragment Box"
            >
                <Square size={18} />
            </button>
            <button 
                onClick={() => setActiveTool('circle')}
                className={`p-3 rounded-xl transition-all ${activeTool === 'circle' ? 'bg-(--accent-teal) text-black font-bold' : 'text-(--text-muted) hover:bg-(--bg-sidebar)'}`}
                title="Essence Circle"
            >
                <Circle size={18} />
            </button>
            <button 
                onClick={() => setActiveTool('arrow')}
                className={`p-3 rounded-xl transition-all ${activeTool === 'arrow' ? 'bg-(--accent-teal) text-black font-bold' : 'text-(--text-muted) hover:bg-(--bg-sidebar)'}`}
                title="Flow Vector"
            >
                <MoveUpRight size={18} />
            </button>

            <div className="w-px h-6 bg-(--border-color) mx-1" />

            <button 
                onClick={() => setActiveTool('text')}
                className={`p-3 rounded-xl transition-all ${activeTool === 'text' ? 'bg-(--accent-teal) text-black font-bold' : 'text-(--text-muted) hover:bg-(--bg-sidebar)'}`}
                title="Transcribe Mode"
            >
                <Type size={18} />
            </button>
            <button 
                onClick={() => setActiveTool('sticky')}
                className={`p-3 rounded-xl transition-all ${activeTool === 'sticky' ? 'bg-(--accent-teal) text-black font-bold' : 'text-(--text-muted) hover:bg-(--bg-sidebar)'}`}
                title="Focus Note"
            >
                <StickyNote size={18} />
            </button>
            
            <div className="w-px h-6 bg-(--border-color) mx-1" />

            <button onClick={undo} className="p-3 rounded-xl text-(--text-muted) hover:bg-(--bg-sidebar)" title="Revert Shift">
                <Undo2 size={18} />
            </button>
            <button onClick={redo} className="p-3 rounded-xl text-(--text-muted) hover:bg-(--bg-sidebar)" title="Restore Shift">
                <Redo2 size={18} />
            </button>

            {onSave && (
                <>
                    <div className="w-px h-6 bg-(--border-color) mx-1" />
                        <button 
                        onClick={onSave}
                        disabled={isSaving}
                        className="p-3 rounded-xl bg-(--accent-yellow) text-black hover:scale-105 transition-all disabled:opacity-50"
                        title="Sync Blueprint"
                    >
                        <Save size={18} />
                    </button>
                </>
            )}
        </div>
    );
}
