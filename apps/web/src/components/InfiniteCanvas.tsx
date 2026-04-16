/**
 * Main Infinite Canvas Component
 * 
 * Integrates:
 * - Yjs for collaborative state
 * - Weave.js engine for rendering
 * - Zustand for tool state
 * - Floating toolbar
 * - Sticky note editor
 */

'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { IndexeddbPersistence } from 'y-indexeddb';
import { UndoManager } from 'yjs';
import { StudyBuddyCanvasEngine } from '@studybuddy/canvas-engine';
import { SupabaseYjsProvider } from '@/lib/yjs-supabase-provider';
import {
  createCanvasSchema,
  addShape,
  addPenStroke,
  appendPointToPenStroke,
  finalizePenStroke,
  updateShape,
} from '@studybuddy/canvas-engine';
import { useCanvasToolStore, executeErase } from '@studybuddy/api';
import { useStudyStore } from '@/store/useStudyStore';
import { CanvasToolbar } from './CanvasToolbar';
import { StickyNoteEditor } from './StickyNoteEditor';
import { CanvasLayersPanel } from './CanvasLayersPanel';
import { TextShapeEditor } from './TextShapeEditor';
import type { StickyNoteData } from '@studybuddy/canvas-engine';

interface InfiniteCanvasProps {
  roomId: string;
  userId: string;
  userName: string;
  roomTitle?: string | null;
  roomDescription?: string | null;
  // Supabase/Liveblocks connection (optional)
  realtimeProvider?: 'websocket' | 'supabase' | 'liveblocks';
}

export const InfiniteCanvas: React.FC<InfiniteCanvasProps> = ({
  roomId,
  userId,
  userName,
  roomTitle,
  roomDescription,
  realtimeProvider = 'supabase',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<StudyBuddyCanvasEngine | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const schemaRef = useRef<ReturnType<typeof createCanvasSchema> | null>(null);
  const activeStrokeIndexRef = useRef<number | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const activeShapeIdRef = useRef<string | null>(null);
  const shapeStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragStateRef = useRef<
    | {
        id: string;
        mode: 'move' | 'resize' | 'rotate';
        handle?: 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e' | 'rotate';
        startWorld: { x: number; y: number };
        startRect: { x: number; y: number; width: number; height: number; rotation: number };
        shapeCenter?: { x: number; y: number };
      }
    | null
  >(null);
  const penRafRef = useRef<number | null>(null);
  const pendingPenPointRef = useRef<[number, number, number] | null>(null);
  const lastPenAppendRef = useRef(0);
  const eraseRafRef = useRef<number | null>(null);
  const pendingEraseRef = useRef<{ x: number; y: number } | null>(null);
  const lastOfflineToastRef = useRef(0);

  const store = useCanvasToolStore();
  const { triggerChumToast } = useStudyStore();

  // Sticky note editor state
  const [activeStickyNoteId, setActiveStickyNoteId] = useState<string | null>(null);
  const [activeStickyData, setActiveStickyData] = useState<StickyNoteData | null>(null);
  const [activeTextId, setActiveTextId] = useState<string | null>(null);
  const [activeTextData, setActiveTextData] = useState<
    | {
        id: string;
        x: number;
        y: number;
        width: number;
        height: number;
        text: string;
        textColor: string;
        fontSize: number;
        fontFamily: string;
      }
    | null
  >(null);
  const [eraserCursor, setEraserCursor] = useState<{ x: number; y: number } | null>(null);
  const [showLayers, setShowLayers] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<
    'connecting' | 'synced' | 'offline'
  >('connecting');
  const isSynced = connectionStatus === 'synced';

  const maybeToastOffline = useCallback(() => {
    const now = Date.now();
    if (now - lastOfflineToastRef.current < 3000) return;
    lastOfflineToastRef.current = now;
    triggerChumToast?.('Offline - edits paused.', 'warning');
  }, [triggerChumToast]);

  // ─────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    // Create Yjs document
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Initialize schema
    const schema = createCanvasSchema(ydoc);
    schemaRef.current = schema;

    // Setup persistence & real-time sync
    new IndexeddbPersistence(roomId, ydoc);

    let realtimeCleanup: (() => void) | null = null;

    if (realtimeProvider === 'websocket') {
      const provider = new WebsocketProvider(
        process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:1234',
        roomId,
        ydoc
      );
      realtimeCleanup = () => provider.destroy();
      setConnectionStatus('connecting');
      provider.on('status', (event: { status: string }) => {
        if (event.status === 'connected') setConnectionStatus('synced');
        if (event.status === 'disconnected') setConnectionStatus('offline');
      });
    }

    if (realtimeProvider === 'supabase') {
      setConnectionStatus('connecting');
      const provider = new SupabaseYjsProvider(roomId, ydoc, (status) => {
        if (status === 'SUBSCRIBED') setConnectionStatus('synced');
        if (status === 'TIMED_OUT' || status === 'CHANNEL_ERROR' || status === 'CLOSED') {
          setConnectionStatus('offline');
        }
      });
      provider.connect();
      realtimeCleanup = () => provider.destroy();
    }

    // Initialize canvas engine
    const engine = new StudyBuddyCanvasEngine(canvasRef.current, ydoc);
    engineRef.current = engine;

    // Resize canvas to container
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);

    // Setup Undo/Redo
    const undoManager = new UndoManager([
      schema.yshapes,
      schema.ystrokes,
      schema.yconnections,
    ]);
    const updateUndoState = () => {
      useCanvasToolStore.setState({
        canUndo: undoManager.canUndo(),
        canRedo: undoManager.canRedo(),
      });
    };

    undoManager.on('stack-item-added', updateUndoState);
    undoManager.on('stack-item-updated', updateUndoState);
    undoManager.on('stack-item-popped', updateUndoState);
    undoManager.on('stack-cleared', updateUndoState);

    useCanvasToolStore.setState({
      undo: () => {
        undoManager.undo();
        updateUndoState();
      },
      redo: () => {
        undoManager.redo();
        updateUndoState();
      },
    });

    updateUndoState();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      undoManager.off('stack-item-added', updateUndoState);
      undoManager.off('stack-item-updated', updateUndoState);
      undoManager.off('stack-item-popped', updateUndoState);
      undoManager.off('stack-cleared', updateUndoState);
      useCanvasToolStore.setState({
        canUndo: false,
        canRedo: false,
        undo: () => {},
        redo: () => {},
      });
      engine.destroy();
      realtimeCleanup?.();
      ydoc.destroy();
      schemaRef.current = null;
      setConnectionStatus('offline');
      if (eraseRafRef.current !== null) {
        cancelAnimationFrame(eraseRafRef.current);
        eraseRafRef.current = null;
      }
      if (penRafRef.current !== null) {
        cancelAnimationFrame(penRafRef.current);
        penRafRef.current = null;
      }
    };
  }, [roomId, realtimeProvider]);

  useEffect(() => {
    if (store.activeTool !== 'eraser') {
      setEraserCursor(null);
    }
  }, [store.activeTool]);

  useEffect(() => {
    engineRef.current?.setSelectedObjectIds?.(store.selectedObjectIds);
  }, [store.selectedObjectIds]);

  useEffect(() => {
    const schema = schemaRef.current;
    if (!schema) return;
    schema.ymetadata.set('gridEnabled', store.gridEnabled);
    schema.ymetadata.set('gridSize', store.gridSize);
  }, [store.gridEnabled, store.gridSize]);

  const snapValue = useCallback(
    (value: number) => {
      if (!store.snapEnabled) return value;
      const size = store.gridSize || 1;
      return Math.round(value / size) * size;
    },
    [store.snapEnabled, store.gridSize]
  );

  const getResizeHandle = useCallback(
    (shape: Y.Map<any>, point: { x: number; y: number }) => {
      const viewport = engineRef.current?.getViewport() || { zoom: 1, x: 0, y: 0 };
      const handleSize = 10 / viewport.zoom;
      const x = shape.get('x');
      const y = shape.get('y');
      const w = shape.get('width');
      const h = shape.get('height');

      const handles = [
        { id: 'nw' as const, x, y },
        { id: 'ne' as const, x: x + w, y },
        { id: 'sw' as const, x, y: y + h },
        { id: 'se' as const, x: x + w, y: y + h },
        { id: 'n' as const, x: x + w / 2, y },
        { id: 's' as const, x: x + w / 2, y: y + h },
        { id: 'w' as const, x, y: y + h / 2 },
        { id: 'e' as const, x: x + w, y: y + h / 2 },
        { id: 'rotate' as const, x: x + w / 2, y: y - 25 / viewport.zoom },
      ];

      for (const handle of handles) {
        const dx = Math.abs(point.x - handle.x);
        const dy = Math.abs(point.y - handle.y);
        if (dx <= handleSize && dy <= handleSize) {
          return handle.id;
        }
      }
      return null;
    },
    []
  );

  const getHandleCursor = useCallback((handle: ReturnType<typeof getResizeHandle>) => {
    switch (handle) {
      case 'nw':
      case 'se':
        return 'nwse-resize';
      case 'ne':
      case 'sw':
        return 'nesw-resize';
      case 'n':
      case 's':
        return 'ns-resize';
      case 'w':
      case 'e':
        return 'ew-resize';
      case 'rotate':
        return 'grab';
      default:
        return 'default';
    }
  }, [getResizeHandle]);

  // ─────────────────────────────────────────────────────────────
  // TOOL INTERACTIONS
  // ─────────────────────────────────────────────────────────────

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !engineRef.current || !ydocRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);

      if (store.activeTool === 'sticky') {
        if (!isSynced) {
          maybeToastOffline();
          return;
        }
        // Create sticky note
        const stickyData = {
          type: 'sticky' as const,
          x,
          y,
          width: 200,
          height: 200,
          rotation: 0,
          zIndex: 0,
          color: store.sticky.backgroundColor,
          fillColor: store.sticky.backgroundColor,
          strokeColor: store.sticky.backgroundColor,
          fillEnabled: true,
          strokeEnabled: false,
          fillOpacity: 1,
          strokeWidth: 2,
          locked: false,
          userId,
          text: '',
          textColor: store.sticky.textColor,
          fontSize: store.sticky.fontSize,
          fontFamily: store.sticky.fontFamily,
          isFocused: true,
          focusedBy: userId,
        };

        const sticky = addShape(schema.yshapes, schema.ylayers, stickyData);
        setActiveStickyNoteId(sticky.id);
        setActiveStickyData(sticky as StickyNoteData);
      } else if (store.activeTool === 'select') {
        const hit = engineRef.current.hitTest(x, y);
        if (hit) {
          store.setSelectedObjectIds([hit.objectId]);

          // Open sticky editor if clicking on sticky
          if (hit.type === 'shape') {
            const yshapes = schema.yshapes;
            const shape = yshapes.get(hit.objectId);
            if (shape?.get('type') === 'sticky') {
              setActiveStickyNoteId(hit.objectId);
              setActiveStickyData({
                id: hit.objectId,
                type: 'sticky',
                x: shape.get('x'),
                y: shape.get('y'),
                width: shape.get('width'),
                height: shape.get('height'),
                rotation: shape.get('rotation'),
                color: shape.get('color'),
                fillOpacity: shape.get('fillOpacity'),
                strokeWidth: shape.get('strokeWidth'),
                locked: shape.get('locked'),
                userId: shape.get('userId'),
                text: shape.get('text'),
                textColor: shape.get('textColor'),
                fontSize: shape.get('fontSize'),
                fontFamily: shape.get('fontFamily'),
                isFocused: true,
                focusedBy: userId,
                createdAt: shape.get('createdAt'),
                updatedAt: shape.get('updatedAt'),
              } as StickyNoteData);
            }
          }
        } else {
          store.clearSelection();
        }
      }
    },
    [store, userId, isSynced, maybeToastOffline]
  );

  const handleCanvasDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !engineRef.current || !ydocRef.current) return;
      if (store.activeTool !== 'select') return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
      const hit = engineRef.current.hitTest(x, y);
      if (!hit || hit.type !== 'shape') return;

      const shape = schema.yshapes.get(hit.objectId);
      if (!shape || shape.get('type') !== 'text') return;

      setActiveTextId(hit.objectId);
      setActiveTextData({
        id: hit.objectId,
        x: shape.get('x'),
        y: shape.get('y'),
        width: shape.get('width'),
        height: shape.get('height'),
        text: shape.get('text') || 'Text',
        textColor: shape.get('textColor') || shape.get('color') || '#e2e8f0',
        fontSize: shape.get('fontSize') || 20,
        fontFamily: shape.get('fontFamily') || 'system-ui',
      });
    },
    [store.activeTool]
  );

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !engineRef.current || !ydocRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (store.activeTool === 'select') {
        const world = engineRef.current.canvasToWorld(x, y);
        if (dragStateRef.current) {
          if (!isSynced) {
            maybeToastOffline();
            return;
          }
          const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
          const drag = dragStateRef.current;
          const dx = world.x - drag.startWorld.x;
          const dy = world.y - drag.startWorld.y;

          if (drag.mode === 'move') {
            updateShape(schema.yshapes, drag.id, {
              x: snapValue(drag.startRect.x + dx),
              y: snapValue(drag.startRect.y + dy),
            });
          } else if (drag.mode === 'resize' && drag.handle) {
            const { x: startX, y: startY, width, height } = drag.startRect;
            const isCorner = ['nw', 'ne', 'sw', 'se'].includes(drag.handle);
            let newX = startX;
            let newY = startY;
            let newW = width;
            let newH = height;

            if (isCorner) {
              const ratio = width / height || 1;
              const deltaW = drag.handle.includes('e') ? dx : -dx;
              const deltaH = drag.handle.includes('s') ? dy : -dy;
              const useWidth = Math.abs(deltaW) >= Math.abs(deltaH);
              newW = width + deltaW;
              newH = height + deltaH;
              if (useWidth) {
                newH = newW / ratio;
              } else {
                newW = newH * ratio;
              }
              if (drag.handle.includes('w')) {
                newX = startX + (width - newW);
              }
              if (drag.handle.includes('n')) {
                newY = startY + (height - newH);
              }
            } else {
              if (drag.handle.includes('e')) {
                newW = width + dx;
              }
              if (drag.handle.includes('s')) {
                newH = height + dy;
              }
              if (drag.handle.includes('w')) {
                newW = width - dx;
                newX = startX + dx;
              }
              if (drag.handle.includes('n')) {
                newH = height - dy;
                newY = startY + dy;
              }
            }

            newW = Math.max(10, newW);
            newH = Math.max(10, newH);

            updateShape(schema.yshapes, drag.id, {
              x: snapValue(newX),
              y: snapValue(newY),
              width: snapValue(newW),
              height: snapValue(newH),
            });
          } else if (drag.mode === 'rotate' && drag.shapeCenter) {
            const startAngle = Math.atan2(
              drag.startWorld.y - drag.shapeCenter.y,
              drag.startWorld.x - drag.shapeCenter.x
            );
            const currentAngle = Math.atan2(
              world.y - drag.shapeCenter.y,
              world.x - drag.shapeCenter.x
            );
            const deltaDeg = ((currentAngle - startAngle) * 180) / Math.PI;
            updateShape(schema.yshapes, drag.id, {
              rotation: drag.startRect.rotation + deltaDeg,
            });
          }
          if (canvasRef.current) {
            canvasRef.current.style.cursor = drag.mode === 'move' ? 'grabbing' : getHandleCursor(drag.handle ?? null);
          }
          return;
        }

        const hit = engineRef.current.hitTest(x, y);
        if (hit && hit.type === 'shape') {
          const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
          const shape = schema.yshapes.get(hit.objectId);
          if (shape && canvasRef.current) {
            const handle = getResizeHandle(shape, world);
            canvasRef.current.style.cursor = handle ? getHandleCursor(handle) : 'grab';
          }
        } else if (canvasRef.current) {
          canvasRef.current.style.cursor = 'default';
        }
      }

      if (activeShapeIdRef.current && shapeStartRef.current) {
        if (!isSynced) {
          maybeToastOffline();
          return;
        }
        const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
        const world = engineRef.current.canvasToWorld(x, y);
        const start = shapeStartRef.current;
        const width = world.x - start.x;
        const height = world.y - start.y;
        const tool = store.activeTool;

        if (tool === 'line') {
          updateShape(schema.yshapes, activeShapeIdRef.current, {
            x: start.x,
            y: start.y,
            width,
            height,
          });
        } else {
          const nextX = Math.min(start.x, world.x);
          const nextY = Math.min(start.y, world.y);
          updateShape(schema.yshapes, activeShapeIdRef.current, {
            x: nextX,
            y: nextY,
            width: Math.abs(width),
            height: Math.abs(height),
          });
        }
        return;
      }

      if (store.activeTool === 'pen' && activeStrokeIndexRef.current !== null) {
        if (!isSynced) {
          maybeToastOffline();
          return;
        }
        const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
        const world = engineRef.current.canvasToWorld(x, y);
        const now = performance.now();
        const nextPoint: [number, number, number] = [world.x, world.y, e.pressure || 1];
        const shouldAppendNow = now - lastPenAppendRef.current >= 8;

        if (shouldAppendNow) {
          appendPointToPenStroke(schema.ystrokes, activeStrokeIndexRef.current, nextPoint);
          lastPenAppendRef.current = now;
          pendingPenPointRef.current = null;
        } else {
          pendingPenPointRef.current = nextPoint;
          if (penRafRef.current === null) {
            penRafRef.current = window.requestAnimationFrame(() => {
              penRafRef.current = null;
              if (!pendingPenPointRef.current || activeStrokeIndexRef.current === null) return;
              appendPointToPenStroke(
                schema.ystrokes,
                activeStrokeIndexRef.current,
                pendingPenPointRef.current
              );
              lastPenAppendRef.current = performance.now();
              pendingPenPointRef.current = null;
            });
          }
        }
        return;
      }

      if (store.activeTool === 'eraser') {
        setEraserCursor({ x, y });
      }

      if (store.activeTool === 'eraser' && e.isPrimary && e.buttons === 1) {
        if (!isSynced) {
          maybeToastOffline();
          return;
        }
        pendingEraseRef.current = { x, y };
        if (eraseRafRef.current === null) {
          eraseRafRef.current = window.requestAnimationFrame(() => {
            eraseRafRef.current = null;
            if (!pendingEraseRef.current) return;
            const { x: px, y: py } = pendingEraseRef.current;
            pendingEraseRef.current = null;
            const schema = createCanvasSchema(ydocRef.current!);
            executeErase(
              px,
              py,
              engineRef.current!,
              schema.yshapes,
              schema.ystrokes,
              schema.yconnections,
              schema.ylayers,
              store.eraser
            );
          });
        }
      }
    },
    [store.activeTool, store.eraser, isSynced, maybeToastOffline, snapValue]
  );

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !engineRef.current || !ydocRef.current) return;
      const shapeTools = ['rect', 'circle', 'line', 'text'] as const;

      if (store.activeTool === 'select') {
        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const hit = engineRef.current.hitTest(x, y);
        if (!hit) {
          store.clearSelection();
          return;
        }

        store.setSelectedObjectIds([hit.objectId]);
        if (hit.type !== 'shape') return;

        const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
        const shape = schema.yshapes.get(hit.objectId);
        if (!shape) return;

        const world = engineRef.current.canvasToWorld(x, y);
        const handle = getResizeHandle(shape, world);
        let mode: 'move' | 'resize' | 'rotate' = handle === 'rotate' ? 'rotate' : handle ? 'resize' : 'move';

        dragStateRef.current = {
          id: hit.objectId,
          mode,
          handle: handle ?? undefined,
          startWorld: world,
          startRect: {
            x: shape.get('x'),
            y: shape.get('y'),
            width: shape.get('width'),
            height: shape.get('height'),
            rotation: shape.get('rotation') || 0,
          },
          shapeCenter: mode === 'rotate' ? { x: shape.get('x') + shape.get('width') / 2, y: shape.get('y') + shape.get('height') / 2 } : undefined,
        };

        activePointerIdRef.current = e.pointerId;
        (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
        return;
      }

      if (shapeTools.includes(store.activeTool as (typeof shapeTools)[number])) {
        if (!isSynced) {
          maybeToastOffline();
          return;
        }
        activePointerIdRef.current = e.pointerId;
        (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);

        const rect = canvasRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const world = engineRef.current.canvasToWorld(x, y);
        const startX = snapValue(world.x);
        const startY = snapValue(world.y);

        const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
        const tool = store.activeTool;
        const baseShape = {
          x: startX,
          y: startY,
          width: tool === 'text' ? 240 : 1,
          height: tool === 'text' ? 64 : 1,
          rotation: 0,
          zIndex: 0,
          color: tool === 'text' ? store.text.color : store.shape.fillColor,
          fillOpacity: tool === 'line' || tool === 'text' ? 0 : store.shape.fillOpacity,
          strokeWidth: store.shape.strokeWidth,
          fillColor: store.shape.fillColor,
          strokeColor: store.shape.strokeColor,
          fillEnabled: tool === 'line' || tool === 'text' ? false : store.shape.fillEnabled,
          strokeEnabled: store.shape.strokeEnabled,
          locked: false,
          userId,
        };

        const shapeData =
          tool === 'text'
            ? {
                ...baseShape,
                type: 'text' as const,
                text: 'Text',
                textColor: store.text.color,
                fontSize: store.text.fontSize,
                fontFamily: store.text.fontFamily,
              }
            : {
                ...baseShape,
                type: tool as 'rect' | 'circle' | 'line',
              };

        const created = addShape(schema.yshapes, schema.ylayers, shapeData as any);
        activeShapeIdRef.current = created.id;
        shapeStartRef.current = { x: startX, y: startY };
        return;
      }

      if (store.activeTool !== 'pen') {
        if (store.activeTool === 'eraser') {
          if (!isSynced) {
            maybeToastOffline();
            return;
          }
          activePointerIdRef.current = e.pointerId;
          (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);

          const rect = canvasRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          setEraserCursor({ x, y });
          const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);

          executeErase(
            x,
            y,
            engineRef.current,
            schema.yshapes,
            schema.ystrokes,
            schema.yconnections,
            schema.ylayers,
            store.eraser
          );
        }
        return;
      }

      if (!isSynced) {
        maybeToastOffline();
        return;
      }
      activePointerIdRef.current = e.pointerId;
      (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const world = engineRef.current.canvasToWorld(x, y);

      const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
      const strokeIndex = schema.ystrokes.length;
      addPenStroke(schema.ystrokes, schema.ylayers, {
        points: [[world.x, world.y, e.pressure || 1]],
        color: store.brush.color,
        strokeWidth: store.brush.size,
        eraserMode: false,
        pressureEnabled: store.brush.pressure,
        zIndex: 0,
        userId,
      });

      activeStrokeIndexRef.current = strokeIndex;
    },
    [
      store.activeTool,
      store.brush,
      store.shape,
      store.text,
      userId,
      isSynced,
      maybeToastOffline,
      snapValue,
      getResizeHandle,
    ]
  );

  const handleCanvasPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !ydocRef.current) return;
      if (dragStateRef.current) {
        if (isSynced && engineRef.current && canvasRef.current) {
          const rect = canvasRef.current.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const world = engineRef.current.canvasToWorld(x, y);
          const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
          const drag = dragStateRef.current;
          const dx = world.x - drag.startWorld.x;
          const dy = world.y - drag.startWorld.y;

          if (drag.mode === 'move') {
            updateShape(schema.yshapes, drag.id, {
              x: snapValue(drag.startRect.x + dx),
              y: snapValue(drag.startRect.y + dy),
            });
          } else if (drag.mode === 'resize' && drag.handle) {
            const { x: startX, y: startY, width, height } = drag.startRect;
            const isCorner = ['nw', 'ne', 'sw', 'se'].includes(drag.handle);
            let newX = startX;
            let newY = startY;
            let newW = width;
            let newH = height;

            if (isCorner) {
              const ratio = width / height || 1;
              const deltaW = drag.handle.includes('e') ? dx : -dx;
              const deltaH = drag.handle.includes('s') ? dy : -dy;
              const useWidth = Math.abs(deltaW) >= Math.abs(deltaH);
              newW = width + deltaW;
              newH = height + deltaH;
              if (useWidth) {
                newH = newW / ratio;
              } else {
                newW = newH * ratio;
              }
              if (drag.handle.includes('w')) {
                newX = startX + (width - newW);
              }
              if (drag.handle.includes('n')) {
                newY = startY + (height - newH);
              }
            } else {
              if (drag.handle.includes('e')) {
                newW = width + dx;
              }
              if (drag.handle.includes('s')) {
                newH = height + dy;
              }
              if (drag.handle.includes('w')) {
                newW = width - dx;
                newX = startX + dx;
              }
              if (drag.handle.includes('n')) {
                newH = height - dy;
                newY = startY + dy;
              }
            }

            newW = Math.max(10, newW);
            newH = Math.max(10, newH);

            updateShape(schema.yshapes, drag.id, {
              x: snapValue(newX),
              y: snapValue(newY),
              width: snapValue(newW),
              height: snapValue(newH),
            });
          } else if (drag.mode === 'rotate' && drag.shapeCenter) {
            const startAngle = Math.atan2(
              drag.startWorld.y - drag.shapeCenter.y,
              drag.startWorld.x - drag.shapeCenter.x
            );
            const currentAngle = Math.atan2(
              world.y - drag.shapeCenter.y,
              world.x - drag.shapeCenter.x
            );
            const deltaDeg = ((currentAngle - startAngle) * 180) / Math.PI;
            updateShape(schema.yshapes, drag.id, {
              rotation: drag.startRect.rotation + deltaDeg,
            });
          }
        }
        if (activePointerIdRef.current !== null) {
          (e.currentTarget as HTMLCanvasElement).releasePointerCapture(
            activePointerIdRef.current
          );
        }
        if (canvasRef.current) {
          canvasRef.current.style.cursor = 'default';
        }
        dragStateRef.current = null;
        activePointerIdRef.current = null;
        return;
      }
      if (activeShapeIdRef.current) {
        if (activePointerIdRef.current !== null) {
          (e.currentTarget as HTMLCanvasElement).releasePointerCapture(
            activePointerIdRef.current
          );
        }
        activeShapeIdRef.current = null;
        shapeStartRef.current = null;
        activePointerIdRef.current = null;
        return;
      }
      if (store.activeTool !== 'pen') {
        if (activePointerIdRef.current !== null) {
          (e.currentTarget as HTMLCanvasElement).releasePointerCapture(
            activePointerIdRef.current
          );
          activePointerIdRef.current = null;
        }
        return;
      }

      if (activePointerIdRef.current !== null) {
        (e.currentTarget as HTMLCanvasElement).releasePointerCapture(
          activePointerIdRef.current
        );
      }

      if (activeStrokeIndexRef.current !== null) {
        const schema = schemaRef.current ?? createCanvasSchema(ydocRef.current);
        if (pendingPenPointRef.current) {
          appendPointToPenStroke(
            schema.ystrokes,
            activeStrokeIndexRef.current,
            pendingPenPointRef.current
          );
          lastPenAppendRef.current = performance.now();
          pendingPenPointRef.current = null;
        }
        finalizePenStroke(schema.ystrokes, activeStrokeIndexRef.current);
      }

      activeStrokeIndexRef.current = null;
      activePointerIdRef.current = null;
    },
    [store.activeTool]
  );

  // ─────────────────────────────────────────────────────────────
  // KEYBOARD SHORTCUTS
  // ─────────────────────────────────────────────────────────────

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z') {
          e.preventDefault();
          store.undo();
        } else if (e.key === 'y' || (e.shiftKey && e.key === 'z')) {
          e.preventDefault();
          store.redo();
        }
      }

      // Tool shortcuts
      if (e.key === 'v') store.setActiveTool('select');
      if (e.key === 'p') store.setActiveTool('pen');
      if (e.key === 'e') store.setActiveTool('eraser');
      if (e.key === 'm') store.setActiveTool('mindmap');
      if (e.key === 's') store.setActiveTool('sticky');
      if (e.key === 'r') store.setActiveTool('rect');
      if (e.key === 'c') store.setActiveTool('circle');
      if (e.key === 'l') store.setActiveTool('line');
      if (e.key === 't') store.setActiveTool('text');
      if (e.key === 'Escape') {
        setActiveStickyNoteId(null);
        store.clearSelection();
        setActiveTextId(null);
        setActiveTextData(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [store]);

  // ─────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────

  return (
    <div
      ref={containerRef}
      className="relative w-full h-screen bg-[#0b1211] overflow-hidden"
    >
      {/* Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onDoubleClick={handleCanvasDoubleClick}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleCanvasPointerMove}
        onPointerUp={handleCanvasPointerUp}
        onPointerLeave={() => setEraserCursor(null)}
        className="absolute inset-0 w-full h-full cursor-crosshair"
      />

      {store.activeTool === 'eraser' && eraserCursor && (
        <div
          className="pointer-events-none absolute rounded-full border border-[#ef4444] bg-[#ef4444]/10"
          style={{
            width: store.eraser.size,
            height: store.eraser.size,
            left: eraserCursor.x - store.eraser.size / 2,
            top: eraserCursor.y - store.eraser.size / 2,
          }}
        />
      )}

      {(roomTitle || roomDescription) && (
        <div className="absolute left-6 top-6 z-[200] max-w-sm rounded-3xl border border-white/10 bg-[#0b1211]/80 px-4 py-3 text-white/80 shadow-xl backdrop-blur">
          {roomTitle && (
            <div className="text-sm font-black text-white">{roomTitle}</div>
          )}
          {roomDescription && (
            <div className="text-[11px] text-white/50 mt-1 line-clamp-2">
              {roomDescription}
            </div>
          )}
          <button
            onClick={() => {
              const code = roomId.startsWith('canvas-') ? roomId.slice(7) : roomId;
              const link = `${window.location.origin}/canvas?room=${code}`;
              navigator.clipboard?.writeText(link).catch(() => undefined);
            }}
            className="mt-3 text-[10px] uppercase tracking-widest text-[#14b8a6] hover:text-white transition-colors"
          >
            Copy Link
          </button>
        </div>
      )}

      {/* Sticky Note Editor Overlay */}
      {activeStickyData && ydocRef.current && (
        <StickyNoteEditor
          sticky={activeStickyData}
          ymap={
            ydocRef.current
              .getMap('shapes')
              .get(activeStickyNoteId!) as Y.Map<any>
          }
          isActive={activeStickyNoteId !== null}
          canvasViewport={engineRef.current?.getViewport() || { x: 0, y: 0, zoom: 1 }}
          canvasRect={
            canvasRef.current?.getBoundingClientRect() || new DOMRect()
          }
          onBlur={() => {
            setActiveStickyNoteId(null);
            setActiveStickyData(null);
          }}
        />
      )}

      {ydocRef.current && (
        <CanvasLayersPanel
          isOpen={showLayers}
          ydoc={ydocRef.current}
          onClose={() => setShowLayers(false)}
        />
      )}

      {activeTextData && ydocRef.current && (
        <TextShapeEditor
          textShape={activeTextData}
          ymap={
            ydocRef.current
              .getMap('shapes')
              .get(activeTextId!) as Y.Map<any>
          }
          isActive={activeTextId !== null}
          canvasViewport={engineRef.current?.getViewport() || { x: 0, y: 0, zoom: 1 }}
          canvasRect={canvasRef.current?.getBoundingClientRect() || new DOMRect()}
          onBlur={() => {
            setActiveTextId(null);
            setActiveTextData(null);
          }}
        />
      )}

      {/* Floating Toolbar */}
      <CanvasToolbar
        connectionStatus={connectionStatus}
        onToggleLayers={() => setShowLayers((prev) => !prev)}
        isLayersOpen={showLayers}
      />

      {/* Keyboard Shortcuts Legend (optional) */}
      <div className="fixed top-4 right-4 text-xs text-white/40 space-y-1">
        <div>V: Select | P: Pen | E: Eraser</div>
        <div>M: Mindmap | S: Sticky | Esc: Deselect</div>
      </div>
    </div>
  );
};

export default InfiniteCanvas;
