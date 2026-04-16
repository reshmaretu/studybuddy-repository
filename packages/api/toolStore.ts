/**
 * Canvas Tool State Management
 * Zustand store for managing active tool, settings, and brush properties
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { HitTestResult } from '@studybuddy/canvas-engine';

export type ToolType = 'select' | 'pen' | 'eraser' | 'mindmap' | 'sticky' | 'rect' | 'circle' | 'line' | 'text';
export type PenMode = 'ballpoint' | 'marker' | 'highlighter' | 'calligraphy';

export interface BrushSettings {
  color: string;
  size: number;
  opacity: number;
  mode: PenMode;
  smoothing: number; // 0-1, higher = smoother
  pressure: boolean;
}

export interface EraserSettings {
  size: number;
  mode: 'precise' | 'area'; // precise = point-based, area = selection box
  sensitivity: number;
}

export interface MindmapSettings {
  lineStyle: 'solid' | 'dashed' | 'curved';
  lineColor: string;
  labelColor: string;
}

export interface StickySettings {
  backgroundColor: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
}

export interface TextSettings {
  color: string;
  fontSize: number;
  fontFamily: string;
}

export interface ShapeSettings {
  strokeColor: string;
  fillColor: string;
  strokeWidth: number;
  fillOpacity: number;
  strokeEnabled: boolean;
  fillEnabled: boolean;
}

export interface CanvasToolStore {
  // Active Tool
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;

  // Tool Settings
  brush: BrushSettings;
  setBrushSettings: (settings: Partial<BrushSettings>) => void;

  eraser: EraserSettings;
  setEraserSettings: (settings: Partial<EraserSettings>) => void;

  mindmap: MindmapSettings;
  setMindmapSettings: (settings: Partial<MindmapSettings>) => void;

  sticky: StickySettings;
  setStickySettings: (settings: Partial<StickySettings>) => void;

  text: TextSettings;
  setTextSettings: (settings: Partial<TextSettings>) => void;

  shape: ShapeSettings;
  setShapeSettings: (settings: Partial<ShapeSettings>) => void;

  // UI State
  showToolbar: boolean;
  setShowToolbar: (show: boolean) => void;

  showColorPicker: boolean;
  setShowColorPicker: (show: boolean) => void;

  selectedColorMode:
    | 'brush'
    | 'mindmap-line'
    | 'mindmap-label'
    | 'sticky-bg'
    | 'sticky-text'
    | 'text'
    | 'shape-stroke'
    | 'shape-fill';
  setSelectedColorMode: (mode: string) => void;

  gridEnabled: boolean;
  setGridEnabled: (enabled: boolean) => void;
  snapEnabled: boolean;
  setSnapEnabled: (enabled: boolean) => void;
  gridSize: number;
  setGridSize: (size: number) => void;

  // Multi-select
  selectedObjectIds: string[];
  setSelectedObjectIds: (ids: string[]) => void;
  toggleObjectSelection: (id: string) => void;
  clearSelection: () => void;

  // Undo/Redo
  canUndo: boolean;
  canRedo: boolean;
  undo: () => void;
  redo: () => void;
}

const defaultBrushSettings: BrushSettings = {
  color: '#2dd4bf',
  size: 3,
  opacity: 1,
  mode: 'ballpoint',
  smoothing: 0.7,
  pressure: true,
};

const defaultEraserSettings: EraserSettings = {
  size: 20,
  mode: 'area',
  sensitivity: 0.8,
};

const defaultMindmapSettings: MindmapSettings = {
  lineStyle: 'curved',
  lineColor: '#fbbf24',
  labelColor: '#ffffff',
};

const defaultStickySettings: StickySettings = {
  backgroundColor: '#fef3c7',
  textColor: '#1f2937',
  fontSize: 14,
  fontFamily: 'system-ui',
};

const defaultTextSettings: TextSettings = {
  color: '#e2e8f0',
  fontSize: 20,
  fontFamily: 'system-ui',
};

const defaultShapeSettings: ShapeSettings = {
  strokeColor: '#2dd4bf',
  fillColor: '#0b1211',
  strokeWidth: 2,
  fillOpacity: 0.4,
  strokeEnabled: true,
  fillEnabled: true,
};

export const useCanvasToolStore = create<CanvasToolStore>()(
  devtools(
    (set) => ({
      // Active Tool
      activeTool: 'select',
      setActiveTool: (tool) => set({ activeTool: tool }),

      // Brush Settings
      brush: defaultBrushSettings,
      setBrushSettings: (settings) =>
        set((state) => ({
          brush: { ...state.brush, ...settings },
        })),

      // Eraser Settings
      eraser: defaultEraserSettings,
      setEraserSettings: (settings) =>
        set((state) => ({
          eraser: { ...state.eraser, ...settings },
        })),

      // Mindmap Settings
      mindmap: defaultMindmapSettings,
      setMindmapSettings: (settings) =>
        set((state) => ({
          mindmap: { ...state.mindmap, ...settings },
        })),

      // Sticky Settings
      sticky: defaultStickySettings,
      setStickySettings: (settings) =>
        set((state) => ({
          sticky: { ...state.sticky, ...settings },
        })),

      text: defaultTextSettings,
      setTextSettings: (settings) =>
        set((state) => ({
          text: { ...state.text, ...settings },
        })),

      shape: defaultShapeSettings,
      setShapeSettings: (settings) =>
        set((state) => ({
          shape: { ...state.shape, ...settings },
        })),

      // UI State
      showToolbar: true,
      setShowToolbar: (show) => set({ showToolbar: show }),

      showColorPicker: false,
      setShowColorPicker: (show) => set({ showColorPicker: show }),

      selectedColorMode: 'brush',
      setSelectedColorMode: (mode) => set({ selectedColorMode: mode as any }),

      gridEnabled: true,
      setGridEnabled: (enabled) => set({ gridEnabled: enabled }),
      snapEnabled: true,
      setSnapEnabled: (enabled) => set({ snapEnabled: enabled }),
      gridSize: 40,
      setGridSize: (size) => set({ gridSize: size }),

      // Multi-select
      selectedObjectIds: [],
      setSelectedObjectIds: (ids) => set({ selectedObjectIds: ids }),
      toggleObjectSelection: (id) =>
        set((state) => ({
          selectedObjectIds: state.selectedObjectIds.includes(id)
            ? state.selectedObjectIds.filter((i) => i !== id)
            : [...state.selectedObjectIds, id],
        })),
      clearSelection: () => set({ selectedObjectIds: [] }),

      // Undo/Redo (placeholder)
      canUndo: false,
      canRedo: false,
      undo: () => {}, // Wire to Y.UndoManager
      redo: () => {}, // Wire to Y.UndoManager
    }),
    { name: 'canvas-tool-store' }
  )
);

// ═══════════════════════════════════════════════════════════════
// ERASER LOGIC - Hit Testing & Deletion
// ═══════════════════════════════════════════════════════════════

/**
 * Execute eraser on all objects within a radius
 * Respects area vs precise mode
 */
export function executeErase(
  canvasX: number,
  canvasY: number,
  engine: any, // StudyBuddyCanvasEngine
  yshapes: any, // Y.Map
  ystrokes: any, // Y.Array
  yconnections: any, // Y.Map
  ylayers: any, // Y.Array
  settings: EraserSettings
) {
  const hit = engine.hitTest(canvasX, canvasY, settings.size);

  if (!hit) return;

  // In 'area' mode, delete all objects in radius
  // In 'precise' mode, only delete the topmost
  if (settings.mode === 'area') {
    const allHits = engine.hitTestArea(canvasX, canvasY, settings.size);
    allHits.forEach((result: HitTestResult) => {
      deleteObjectFromYjs(result.objectId, yshapes, ystrokes, yconnections, ylayers);
    });
  } else {
    deleteObjectFromYjs(hit.objectId, yshapes, ystrokes, yconnections, ylayers);
  }

  engine._markDirty?.();
}

function deleteObjectFromYjs(
  id: string,
  yshapes: any,
  ystrokes: any,
  yconnections: any,
  ylayers: any
) {
  if (yshapes.has(id)) {
    yshapes.delete(id);
  }

  for (let i = 0; i < ystrokes.length; i++) {
    if (ystrokes.get(i)?.get('id') === id) {
      ystrokes.delete(i, 1);
      break;
    }
  }

  if (yconnections.has(id)) {
    yconnections.delete(id);
  }

  const idx = ylayers.toArray().indexOf(id);
  if (idx !== -1) {
    ylayers.delete(idx, 1);
  }
}
