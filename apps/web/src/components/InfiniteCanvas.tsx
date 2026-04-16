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
} from '@studybuddy/canvas-engine';
import { useCanvasToolStore, executeErase } from '@studybuddy/api';
import { useStudyStore } from '@/store/useStudyStore';
import { CanvasToolbar } from './CanvasToolbar';
import { StickyNoteEditor } from './StickyNoteEditor';
import type { StickyNoteData } from '@studybuddy/canvas-engine';

interface InfiniteCanvasProps {
  roomId: string;
  userId: string;
  userName: string;
  // Supabase/Liveblocks connection (optional)
  realtimeProvider?: 'websocket' | 'supabase' | 'liveblocks';
}

export const InfiniteCanvas: React.FC<InfiniteCanvasProps> = ({
  roomId,
  userId,
  userName,
  realtimeProvider = 'supabase',
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<StudyBuddyCanvasEngine | null>(null);
  const ydocRef = useRef<Y.Doc | null>(null);
  const activeStrokeIndexRef = useRef<number | null>(null);
  const activePointerIdRef = useRef<number | null>(null);
  const eraseRafRef = useRef<number | null>(null);
  const pendingEraseRef = useRef<{ x: number; y: number } | null>(null);
  const lastOfflineToastRef = useRef(0);

  const store = useCanvasToolStore();
  const { triggerChumToast } = useStudyStore();

  // Sticky note editor state
  const [activeStickyNoteId, setActiveStickyNoteId] = useState<string | null>(null);
  const [activeStickyData, setActiveStickyData] = useState<StickyNoteData | null>(null);
  const [eraserCursor, setEraserCursor] = useState<{ x: number; y: number } | null>(null);
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
      setConnectionStatus('offline');
      if (eraseRafRef.current !== null) {
        cancelAnimationFrame(eraseRafRef.current);
        eraseRafRef.current = null;
      }
    };
  }, [roomId, realtimeProvider]);

  useEffect(() => {
    if (store.activeTool !== 'eraser') {
      setEraserCursor(null);
    }
  }, [store.activeTool]);

  // ─────────────────────────────────────────────────────────────
  // TOOL INTERACTIONS
  // ─────────────────────────────────────────────────────────────

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !engineRef.current || !ydocRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const schema = createCanvasSchema(ydocRef.current);

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
    [store, userId]
  );

  const handleCanvasPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !engineRef.current || !ydocRef.current) return;

      const rect = canvasRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (store.activeTool === 'pen' && activeStrokeIndexRef.current !== null) {
        if (!isSynced) {
          maybeToastOffline();
          return;
        }
        const schema = createCanvasSchema(ydocRef.current);
        const world = engineRef.current.canvasToWorld(x, y);
        appendPointToPenStroke(schema.ystrokes, activeStrokeIndexRef.current, [
          world.x,
          world.y,
          e.pressure || 1,
        ]);
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
    [store.activeTool, store.eraser, isSynced]
  );

  const handleCanvasPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !engineRef.current || !ydocRef.current) return;
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
          const schema = createCanvasSchema(ydocRef.current);

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

      const schema = createCanvasSchema(ydocRef.current);
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
    [store.activeTool, store.brush, userId, isSynced, maybeToastOffline]
  );

  const handleCanvasPointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (!canvasRef.current || !ydocRef.current) return;
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
        const schema = createCanvasSchema(ydocRef.current);
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
      if (e.key === 'Escape') {
        setActiveStickyNoteId(null);
        store.clearSelection();
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

      {/* Floating Toolbar */}
      <CanvasToolbar connectionStatus={connectionStatus} />

      {/* Keyboard Shortcuts Legend (optional) */}
      <div className="fixed top-4 right-4 text-xs text-white/40 space-y-1">
        <div>V: Select | P: Pen | E: Eraser</div>
        <div>M: Mindmap | S: Sticky | Esc: Deselect</div>
      </div>
    </div>
  );
};

export default InfiniteCanvas;
