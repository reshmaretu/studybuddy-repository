/**
 * Floating Canvas Toolbar
 * Radix UI + Tailwind + Framer Motion for a "kawaii" aesthetic
 * 
 * Features:
 * - Tool selection buttons
 * - Color picker (per tool)
 * - Brush size/opacity sliders
 * - Eraser mode toggle
 * - Undo/Redo
 * - Mindmap connector settings
 */

'use client';

import React, { useEffect, useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import * as Slider from '@radix-ui/react-slider';
import * as Tabs from '@radix-ui/react-tabs';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PenTool,
  Trash2,
  GitBranch,
  StickyNote,
  Pointer,
  Square,
  Circle,
  Type,
  Minus,
  Undo2,
  Redo2,
  Palette,
  Settings,
  ChevronDown,
  Layers,
} from 'lucide-react';
import { useCanvasToolStore, type ToolType, type PenMode } from '@studybuddy/api';

interface CanvasToolbarProps {
  onUndo?: () => void;
  onRedo?: () => void;
  connectionStatus?: 'connecting' | 'synced' | 'offline';
  onToggleLayers?: () => void;
  isLayersOpen?: boolean;
}

export const CanvasToolbar: React.FC<CanvasToolbarProps> = ({
  onUndo,
  onRedo,
  connectionStatus = 'offline',
  onToggleLayers,
  isLayersOpen = false,
}) => {
  const store = useCanvasToolStore();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const isOffline = connectionStatus === 'offline';

  const toolIcons: Record<ToolType, React.ReactNode> = {
    select: <Pointer size={18} />,
    pen: <PenTool size={18} />,
    eraser: <Trash2 size={18} />,
    mindmap: <GitBranch size={18} />,
    sticky: <StickyNote size={18} />,
    rect: <Square size={18} />,
    circle: <Circle size={18} />,
    line: <Minus size={18} />,
    text: <Type size={18} />,
  };

  const toolLabels: Record<ToolType, string> = {
    select: 'Select',
    pen: 'Pen',
    eraser: 'Eraser',
    mindmap: 'Mindmap',
    sticky: 'Sticky',
    rect: 'Rectangle',
    circle: 'Circle',
    line: 'Line',
    text: 'Text',
  };

  const toolColors: Record<ToolType, string> = {
    select: '#6b7280',
    pen: '#3b82f6',
    eraser: '#ef4444',
    mindmap: '#f59e0b',
    sticky: '#fbbf24',
    rect: '#22c55e',
    circle: '#38bdf8',
    line: '#f97316',
    text: '#a78bfa',
  };

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[500] pointer-events-auto">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="bg-[#0b1211] border-2 border-[#14b8a6]/20 rounded-3xl p-2 shadow-2xl backdrop-blur-xl"
      >
        {/* Main Toolbar */}
        <div className="flex items-center gap-1 flex-wrap">
          {/* Tool Buttons */}
          <div className="flex gap-1 bg-black/30 rounded-2xl p-1 border border-white/5">
            {([
              'select',
              'pen',
              'eraser',
              'mindmap',
              'sticky',
              'rect',
              'circle',
              'line',
              'text',
            ] as ToolType[]).map((tool) => (
              <Popover.Root key={tool}>
                <Popover.Trigger asChild>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => store.setActiveTool(tool)}
                    disabled={isOffline && tool !== 'select'}
                    className={`relative p-2.5 rounded-xl transition-all ${
                      store.activeTool === tool
                        ? 'bg-[#14b8a6] text-[#0b1211] shadow-[0_0_15px_rgba(20,184,166,0.4)]'
                        : 'text-[#999] hover:text-white hover:bg-white/5'
                    } ${
                      isOffline && tool !== 'select'
                        ? 'opacity-40 cursor-not-allowed'
                        : ''
                    }`}
                    title={toolLabels[tool]}
                  >
                    {toolIcons[tool]}
                  </motion.button>
                </Popover.Trigger>

                {/* Tool-Specific Popover Settings */}
                {store.activeTool === tool && (
                  <Popover.Content
                    side="top"
                    sideOffset={12}
                    className="bg-[#1a2423] border border-[#14b8a6]/30 rounded-2xl p-4 shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ToolSettings tool={tool} />
                  </Popover.Content>
                )}
              </Popover.Root>
            ))}
          </div>

          {/* Divider */}
          <div className="w-px h-8 bg-white/10 mx-1" />

          {/* Color Picker */}
          <Popover.Root>
            <Popover.Trigger asChild>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white transition-all border border-white/10"
                title="Pick Color"
              >
                <Palette size={18} />
              </motion.button>
            </Popover.Trigger>

            <Popover.Content
              side="top"
              sideOffset={12}
              className="bg-[#1a2423] border border-[#14b8a6]/30 rounded-2xl p-4 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <ColorPicker />
            </Popover.Content>
          </Popover.Root>

          {/* Divider */}
          <div className="w-px h-8 bg-white/10 mx-1" />

          {/* Undo/Redo */}
          <div className="flex gap-1 bg-black/30 rounded-2xl p-1 border border-white/5">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onUndo ?? store.undo}
              disabled={!store.canUndo}
              className="p-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all"
              title="Undo (Ctrl+Z)"
            >
              <Undo2 size={18} />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onRedo ?? store.redo}
              disabled={!store.canRedo}
              className="p-2.5 rounded-xl text-white/50 hover:text-white hover:bg-white/5 disabled:opacity-30 transition-all"
              title="Redo (Ctrl+Y)"
            >
              <Redo2 size={18} />
            </motion.button>
          </div>

          {/* Layers Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onToggleLayers}
            className={`p-2.5 rounded-xl transition-all border border-white/10 ${
              isLayersOpen
                ? 'bg-[#14b8a6] text-[#0b1211]'
                : 'bg-white/5 hover:bg-white/10 text-white/60 hover:text-white'
            }`}
            title="Layers"
          >
            <Layers size={18} />
          </motion.button>

          {/* Advanced Settings Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-all border border-white/10"
            title="Advanced Settings"
          >
            <Settings size={18} />
          </motion.button>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs text-white/70">
            <span
              className={`h-2 w-2 rounded-full ${
                connectionStatus === 'synced'
                  ? 'bg-[#14b8a6]'
                  : connectionStatus === 'connecting'
                  ? 'bg-[#fbbf24] animate-pulse'
                  : 'bg-[#ef4444]'
              }`}
            />
            <span className="uppercase tracking-wider">
              {connectionStatus === 'synced'
                ? 'Synced'
                : connectionStatus === 'connecting'
                ? 'Connecting'
                : 'Offline'}
            </span>
          </div>
        </div>

        {/* Advanced Settings Drawer */}
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 pt-3 border-t border-white/10"
            >
              <div className="text-xs font-bold text-white/50 mb-2 uppercase tracking-widest">
                Canvas Settings
              </div>
              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={store.gridEnabled}
                    onChange={(e) => store.setGridEnabled(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-white/60 group-hover:text-white transition-colors">
                    Show Grid
                  </span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={store.snapEnabled}
                    onChange={(e) => store.setSnapEnabled(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="text-sm text-white/60 group-hover:text-white transition-colors">
                    Snap to Grid
                  </span>
                </label>
                <div>
                  <label className="text-xs font-bold text-white/70 uppercase tracking-widest flex justify-between mb-2">
                    <span>Grid Size</span>
                    <span>{store.gridSize}px</span>
                  </label>
                  <Slider.Root
                    value={[store.gridSize]}
                    onValueChange={([v]) => store.setGridSize(v)}
                    min={16}
                    max={120}
                    step={4}
                    className="relative flex items-center select-none touch-none w-full h-5"
                  >
                    <Slider.Track className="relative flex-grow rounded-full h-2 bg-white/10">
                      <Slider.Range className="absolute h-full rounded-full bg-[#14b8a6]" />
                    </Slider.Track>
                    <Slider.Thumb className="block w-5 h-5 bg-[#14b8a6] rounded-full shadow-lg hover:bg-[#0d9488] transition-colors" />
                  </Slider.Root>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// TOOL-SPECIFIC SETTINGS
// ═══════════════════════════════════════════════════════════════

interface ToolSettingsProps {
  tool: ToolType;
}

const ToolSettings: React.FC<ToolSettingsProps> = ({ tool }) => {
  const store = useCanvasToolStore();

  if (tool === 'pen') {
    return (
      <div className="w-56 space-y-4">
        <div>
          <label className="text-xs font-bold text-white/70 uppercase tracking-widest block mb-2">
            Pen Mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['ballpoint', 'marker', 'highlighter', 'calligraphy'] as PenMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => store.setBrushSettings({ mode })}
                className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                  store.brush.mode === mode
                    ? 'bg-[#14b8a6] text-[#0b1211]'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-white/70 uppercase tracking-widest flex justify-between mb-2">
            <span>Size</span>
            <span>{store.brush.size.toFixed(1)}px</span>
          </label>
          <Slider.Root
            value={[store.brush.size]}
            onValueChange={([v]) => store.setBrushSettings({ size: v })}
            min={0.5}
            max={30}
            step={0.5}
            className="relative flex items-center select-none touch-none w-full h-5"
          >
            <Slider.Track className="relative flex-grow rounded-full h-2 bg-white/10">
              <Slider.Range className="absolute h-full rounded-full bg-[#14b8a6]" />
            </Slider.Track>
            <Slider.Thumb className="block w-5 h-5 bg-[#14b8a6] rounded-full shadow-lg hover:bg-[#0d9488] transition-colors" />
          </Slider.Root>
        </div>

        <div>
          <label className="text-xs font-bold text-white/70 uppercase tracking-widest flex justify-between mb-2">
            <span>Smoothing</span>
            <span>{(store.brush.smoothing * 100).toFixed(0)}%</span>
          </label>
          <Slider.Root
            value={[store.brush.smoothing]}
            onValueChange={([v]) => store.setBrushSettings({ smoothing: v })}
            min={0}
            max={1}
            step={0.05}
            className="relative flex items-center select-none touch-none w-full h-5"
          >
            <Slider.Track className="relative flex-grow rounded-full h-2 bg-white/10">
              <Slider.Range className="absolute h-full rounded-full bg-[#14b8a6]" />
            </Slider.Track>
            <Slider.Thumb className="block w-5 h-5 bg-[#14b8a6] rounded-full shadow-lg hover:bg-[#0d9488] transition-colors" />
          </Slider.Root>
        </div>

        <label className="flex items-center gap-2 cursor-pointer group">
          <input
            type="checkbox"
            checked={store.brush.pressure}
            onChange={(e) => store.setBrushSettings({ pressure: e.target.checked })}
            className="w-4 h-4 rounded accent-[#14b8a6]"
          />
          <span className="text-sm text-white/60 group-hover:text-white transition-colors">
            Pressure Sensitivity
          </span>
        </label>
      </div>
    );
  }

  if (tool === 'eraser') {
    return (
      <div className="w-56 space-y-4">
        <div>
          <label className="text-xs font-bold text-white/70 uppercase tracking-widest block mb-2">
            Eraser Mode
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['precise', 'area'] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => store.setEraserSettings({ mode })}
                className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                  store.eraser.mode === mode
                    ? 'bg-[#ef4444] text-white'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-white/70 uppercase tracking-widest flex justify-between mb-2">
            <span>Size</span>
            <span>{store.eraser.size.toFixed(0)}px</span>
          </label>
          <Slider.Root
            value={[store.eraser.size]}
            onValueChange={([v]) => store.setEraserSettings({ size: v })}
            min={10}
            max={100}
            step={5}
            className="relative flex items-center select-none touch-none w-full h-5"
          >
            <Slider.Track className="relative flex-grow rounded-full h-2 bg-white/10">
              <Slider.Range className="absolute h-full rounded-full bg-[#ef4444]" />
            </Slider.Track>
            <Slider.Thumb className="block w-5 h-5 bg-[#ef4444] rounded-full shadow-lg hover:bg-[#dc2626] transition-colors" />
          </Slider.Root>
        </div>
      </div>
    );
  }

  if (tool === 'mindmap') {
    return (
      <div className="w-56 space-y-4">
        <div>
          <label className="text-xs font-bold text-white/70 uppercase tracking-widest block mb-2">
            Line Style
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['solid', 'dashed', 'curved'] as const).map((style) => (
              <button
                key={style}
                onClick={() => store.setMindmapSettings({ lineStyle: style })}
                className={`px-3 py-2 rounded-lg text-xs font-bold uppercase transition-all ${
                  store.mindmap.lineStyle === style
                    ? 'bg-[#fbbf24] text-[#0b1211]'
                    : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (tool === 'sticky') {
    return (
      <div className="w-56 space-y-4">
        <div>
          <label className="text-xs font-bold text-white/70 uppercase tracking-widest flex justify-between mb-2">
            <span>Font Size</span>
            <span>{store.sticky.fontSize}px</span>
          </label>
          <Slider.Root
            value={[store.sticky.fontSize]}
            onValueChange={([v]) => store.setStickySettings({ fontSize: v })}
            min={10}
            max={32}
            step={1}
            className="relative flex items-center select-none touch-none w-full h-5"
          >
            <Slider.Track className="relative flex-grow rounded-full h-2 bg-white/10">
              <Slider.Range className="absolute h-full rounded-full bg-[#fbbf24]" />
            </Slider.Track>
            <Slider.Thumb className="block w-5 h-5 bg-[#fbbf24] rounded-full shadow-lg" />
          </Slider.Root>
        </div>
      </div>
    );
  }

  if (tool === 'rect' || tool === 'circle' || tool === 'line') {
    const isLine = tool === 'line';
    return (
      <div className="w-56 space-y-4">
        <div>
          <label className="text-xs font-bold text-white/70 uppercase tracking-widest flex justify-between mb-2">
            <span>Stroke</span>
            <span>{store.shape.strokeWidth.toFixed(1)}px</span>
          </label>
          <Slider.Root
            value={[store.shape.strokeWidth]}
            onValueChange={([v]) => store.setShapeSettings({ strokeWidth: v })}
            min={1}
            max={24}
            step={1}
            className="relative flex items-center select-none touch-none w-full h-5"
          >
            <Slider.Track className="relative flex-grow rounded-full h-2 bg-white/10">
              <Slider.Range className="absolute h-full rounded-full bg-[#22c55e]" />
            </Slider.Track>
            <Slider.Thumb className="block w-5 h-5 bg-[#22c55e] rounded-full shadow-lg" />
          </Slider.Root>
        </div>

        {!isLine && (
          <div>
          <label className="text-xs font-bold text-white/70 uppercase tracking-widest flex justify-between mb-2">
            <span>Fill</span>
            <span>{Math.round(store.shape.fillOpacity * 100)}%</span>
          </label>
          <Slider.Root
            value={[store.shape.fillOpacity]}
            onValueChange={([v]) => store.setShapeSettings({ fillOpacity: v })}
            min={0}
            max={1}
            step={0.05}
            className="relative flex items-center select-none touch-none w-full h-5"
          >
            <Slider.Track className="relative flex-grow rounded-full h-2 bg-white/10">
              <Slider.Range className="absolute h-full rounded-full bg-[#22c55e]" />
            </Slider.Track>
            <Slider.Thumb className="block w-5 h-5 bg-[#22c55e] rounded-full shadow-lg" />
          </Slider.Root>
          </div>
        )}

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer text-xs text-white/60">
            <input
              type="checkbox"
              checked={store.shape.strokeEnabled}
              onChange={(e) => store.setShapeSettings({ strokeEnabled: e.target.checked })}
              className="w-4 h-4 rounded accent-[#22c55e]"
            />
            Stroke
          </label>
          {!isLine && (
            <label className="flex items-center gap-2 cursor-pointer text-xs text-white/60">
              <input
                type="checkbox"
                checked={store.shape.fillEnabled}
                onChange={(e) => store.setShapeSettings({ fillEnabled: e.target.checked })}
                className="w-4 h-4 rounded accent-[#22c55e]"
              />
              Fill
            </label>
          )}
        </div>
      </div>
    );
  }

  if (tool === 'text') {
    return (
      <div className="w-56 space-y-4">
        <div>
          <label className="text-xs font-bold text-white/70 uppercase tracking-widest flex justify-between mb-2">
            <span>Font Size</span>
            <span>{store.text.fontSize}px</span>
          </label>
          <Slider.Root
            value={[store.text.fontSize]}
            onValueChange={([v]) => store.setTextSettings({ fontSize: v })}
            min={12}
            max={48}
            step={1}
            className="relative flex items-center select-none touch-none w-full h-5"
          >
            <Slider.Track className="relative flex-grow rounded-full h-2 bg-white/10">
              <Slider.Range className="absolute h-full rounded-full bg-[#a78bfa]" />
            </Slider.Track>
            <Slider.Thumb className="block w-5 h-5 bg-[#a78bfa] rounded-full shadow-lg" />
          </Slider.Root>
        </div>
      </div>
    );
  }

  return null;
};

// ═══════════════════════════════════════════════════════════════
// COLOR PICKER
// ═══════════════════════════════════════════════════════════════

const ColorPicker: React.FC = () => {
  const store = useCanvasToolStore();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const colors = [
    '#2dd4bf', // teal
    '#3b82f6', // blue
    '#8b5cf6', // purple
    '#ec4899', // pink
    '#f59e0b', // amber
    '#10b981', // emerald
    '#ef4444', // red
    '#000000', // black
    '#ffffff', // white
    '#fbbf24', // yellow
  ];

  const applyColor = (color: string) => {
    switch (store.selectedColorMode) {
      case 'shape-stroke':
        store.setShapeSettings({ strokeColor: color });
        break;
      case 'shape-fill':
        store.setShapeSettings({ fillColor: color });
        break;
      case 'mindmap-line':
        store.setMindmapSettings({ lineColor: color });
        break;
      case 'mindmap-label':
        store.setMindmapSettings({ labelColor: color });
        break;
      case 'sticky-bg':
        store.setStickySettings({ backgroundColor: color });
        break;
      case 'sticky-text':
        store.setStickySettings({ textColor: color });
        break;
      case 'text':
        store.setTextSettings({ color });
        break;
      case 'brush':
      default:
        store.setBrushSettings({ color });
        break;
    }
  };

  const colorTargets = (() => {
    if (store.activeTool === 'mindmap') {
      return [
        { id: 'mindmap-line', label: 'Line' },
        { id: 'mindmap-label', label: 'Label' },
      ];
    }
    if (['rect', 'circle', 'line'].includes(store.activeTool)) {
      return store.activeTool === 'line'
        ? [{ id: 'shape-stroke', label: 'Stroke' }]
        : [
            { id: 'shape-stroke', label: 'Stroke' },
            { id: 'shape-fill', label: 'Fill' },
          ];
    }
    if (store.activeTool === 'sticky') {
      return [
        { id: 'sticky-bg', label: 'Sticky' },
        { id: 'sticky-text', label: 'Text' },
      ];
    }
    if (store.activeTool === 'text') {
      return [{ id: 'text', label: 'Text' }];
    }
    return [{ id: 'brush', label: 'Stroke' }];
  })();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {colorTargets.map((target) => (
          <button
            key={target.id}
            onClick={() => store.setSelectedColorMode(target.id)}
            className={`px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider transition-all border ${
              store.selectedColorMode === target.id
                ? 'bg-[#14b8a6] text-[#0b1211] border-transparent'
                : 'text-white/60 border-white/10 hover:text-white'
            }`}
          >
            {target.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-2">
        {colors.map((color) => (
          <button
            key={color}
            onClick={() => applyColor(color)}
            className="w-8 h-8 rounded-lg border-2 border-white/20 hover:border-white transition-all hover:scale-110 shadow-lg"
            style={{ backgroundColor: color }}
            title={color}
          />
        ))}
      </div>

      <button
        onClick={() => setShowAdvanced((prev) => !prev)}
        className="w-full text-xs uppercase tracking-widest text-white/60 hover:text-white transition-colors"
      >
        {showAdvanced ? 'Hide' : 'Advanced'} Picker
      </button>

      {showAdvanced && (
        <AdvancedColorPicker
          color={getActiveColor(store)}
          onChange={applyColor}
        />
      )}
    </div>
  );
};

const getActiveColor = (store: ReturnType<typeof useCanvasToolStore>) => {
  switch (store.selectedColorMode) {
    case 'shape-stroke':
      return store.shape.strokeColor;
    case 'shape-fill':
      return store.shape.fillColor;
    case 'mindmap-line':
      return store.mindmap.lineColor;
    case 'mindmap-label':
      return store.mindmap.labelColor;
    case 'sticky-bg':
      return store.sticky.backgroundColor;
    case 'sticky-text':
      return store.sticky.textColor;
    case 'text':
      return store.text.color;
    case 'brush':
    default:
      return store.brush.color;
  }
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const hexToRgb = (hex: string) => {
  const cleaned = hex.replace('#', '');
  const full = cleaned.length === 3
    ? cleaned.split('').map((c) => c + c).join('')
    : cleaned;
  const num = parseInt(full, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
};

const rgbToHex = (r: number, g: number, b: number) =>
  `#${[r, g, b]
    .map((v) => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;

const rgbToHsv = (r: number, g: number, b: number) => {
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;
  const max = Math.max(rNorm, gNorm, bNorm);
  const min = Math.min(rNorm, gNorm, bNorm);
  const delta = max - min;

  let h = 0;
  if (delta !== 0) {
    if (max === rNorm) h = ((gNorm - bNorm) / delta) % 6;
    else if (max === gNorm) h = (bNorm - rNorm) / delta + 2;
    else h = (rNorm - gNorm) / delta + 4;
    h *= 60;
  }

  const s = max === 0 ? 0 : delta / max;
  const v = max;
  return { h: (h + 360) % 360, s, v };
};

const hsvToRgb = (h: number, s: number, v: number) => {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;

  if (h >= 0 && h < 60) [r, g, b] = [c, x, 0];
  else if (h >= 60 && h < 120) [r, g, b] = [x, c, 0];
  else if (h >= 120 && h < 180) [r, g, b] = [0, c, x];
  else if (h >= 180 && h < 240) [r, g, b] = [0, x, c];
  else if (h >= 240 && h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];

  return {
    r: (r + m) * 255,
    g: (g + m) * 255,
    b: (b + m) * 255,
  };
};

interface AdvancedColorPickerProps {
  color: string;
  onChange: (color: string) => void;
}

const AdvancedColorPicker: React.FC<AdvancedColorPickerProps> = ({
  color,
  onChange,
}) => {
  const [hsv, setHsv] = useState(() => {
    const { r, g, b } = hexToRgb(color);
    return rgbToHsv(r, g, b);
  });

  useEffect(() => {
    const { r, g, b } = hexToRgb(color);
    setHsv(rgbToHsv(r, g, b));
  }, [color]);

  const handleHueChange = (value: number) => {
    const next = { ...hsv, h: value };
    setHsv(next);
    const rgb = hsvToRgb(next.h, next.s, next.v);
    onChange(rgbToHex(rgb.r, rgb.g, rgb.b));
  };

  const handleSquarePointer = (
    e: React.PointerEvent<HTMLDivElement>,
    rect: DOMRect
  ) => {
    const s = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const v = clamp(1 - (e.clientY - rect.top) / rect.height, 0, 1);
    const next = { ...hsv, s, v };
    setHsv(next);
    const rgb = hsvToRgb(next.h, next.s, next.v);
    onChange(rgbToHex(rgb.r, rgb.g, rgb.b));
  };

  return (
    <div className="space-y-3">
      <div
        className="relative w-full h-40 rounded-xl overflow-hidden border border-white/10"
        style={{
          background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${hsv.h}, 100%, 50%))`,
        }}
        onPointerDown={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          handleSquarePointer(e, rect);
          (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
          handleSquarePointer(e, e.currentTarget.getBoundingClientRect());
        }}
        onPointerUp={(e) => e.currentTarget.releasePointerCapture(e.pointerId)}
      >
        <div
          className="absolute w-4 h-4 rounded-full border-2 border-white shadow-lg"
          style={{
            left: `${hsv.s * 100}%`,
            top: `${(1 - hsv.v) * 100}%`,
            transform: 'translate(-50%, -50%)',
          }}
        />
      </div>

      <div className="flex items-center gap-3">
        <input
          type="range"
          min={0}
          max={360}
          value={hsv.h}
          onChange={(e) => handleHueChange(Number(e.target.value))}
          className="w-full accent-[#14b8a6]"
        />
        <div
          className="w-8 h-8 rounded-lg border border-white/20"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
};
