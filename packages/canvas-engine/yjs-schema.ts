/**
 * Yjs Schema for StudyBuddy Canvas
 * 
 * Architecture:
 * - Y.Map for shapes/stickies (keyed by UUID)
 * - Y.Array for pen strokes (indexed, ordered by Z)
 * - Y.Map for connections (mindmap edges)
 * - Metadata layer for layer management + locking
 */

import * as Y from 'yjs';
import { v4 as uuid } from 'uuid';

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface ShapeData {
  id: string;
  type: 'rect' | 'circle' | 'line' | 'sticky';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  fillOpacity: number;
  strokeWidth: number;
  zIndex: number;
  locked: boolean;
  userId: string; // For permission/presence
  createdAt: number;
  updatedAt: number;
}

export interface StickyNoteData extends ShapeData {
  type: 'sticky';
  text: string;
  textColor: string;
  fontSize: number;
  fontFamily: string;
  isFocused: boolean;
  focusedBy?: string; // userId currently editing
}

export interface PenStrokeData {
  id: string;
  points: Array<[number, number, number]>; // [x, y, pressure]
  color: string;
  strokeWidth: number;
  eraserMode: boolean;
  pressureEnabled: boolean;
  zIndex: number;
  userId: string;
  createdAt: number;
}

export interface ConnectionData {
  id: string;
  fromObjectId: string;
  toObjectId: string;
  label?: string;
  color: string;
  lineStyle: 'solid' | 'dashed' | 'curved';
  zIndex: number;
  createdAt: number;
}

export interface CanvasMetadata {
  viewportX: number;
  viewportY: number;
  zoom: number;
  backgroundColor: string;
  gridEnabled: boolean;
  gridSize: number;
}

// ═══════════════════════════════════════════════════════════════
// SCHEMA FACTORY
// ═══════════════════════════════════════════════════════════════

export function createCanvasSchema(ydoc: Y.Doc) {
  // Root containers
  const yshapes = ydoc.getMap<Y.Map<any>>('shapes');
  const ystrokes = ydoc.getArray<Y.Map<any>>('strokes');
  const yconnections = ydoc.getMap<Y.Map<any>>('connections');
  const ymetadata = ydoc.getMap<any>('metadata');
  const ylayers = ydoc.getArray<string>('layerOrder'); // zIndex ordering
  const yuserPresence = ydoc.getMap<any>('userPresence');

  return {
    yshapes,
    ystrokes,
    yconnections,
    ymetadata,
    ylayers,
    yuserPresence,
  };
}

// ═══════════════════════════════════════════════════════════════
// SHAPE OPERATIONS
// ═══════════════════════════════════════════════════════════════

export function addShape(
  yshapes: Y.Map<Y.Map<any>>,
  ylayers: Y.Array<string>,
  shapeData: Omit<ShapeData, 'id' | 'createdAt' | 'updatedAt'>
): ShapeData {
  const id = uuid();
  const now = Date.now();

  const ymap = new Y.Map();
  const fullData: ShapeData = {
    id,
    ...shapeData,
    createdAt: now,
    updatedAt: now,
  };

  Object.entries(fullData).forEach(([key, value]) => {
    ymap.set(key, value);
  });

  yshapes.set(id, ymap);
  ylayers.push([id]); // Add to top of layer order

  return fullData;
}

export function updateShape(
  yshapes: Y.Map<Y.Map<any>>,
  id: string,
  updates: Partial<Omit<ShapeData, 'id' | 'createdAt'>>
) {
  const ymap = yshapes.get(id);
  if (!ymap) return;

  Object.entries(updates).forEach(([key, value]) => {
    ymap.set(key, value);
  });
  ymap.set('updatedAt', Date.now());
}

export function deleteShape(
  yshapes: Y.Map<Y.Map<any>>,
  ylayers: Y.Array<string>,
  yconnections: Y.Map<Y.Map<any>>,
  id: string
) {
  yshapes.delete(id);
  
  // Remove from layer order
  const idx = ylayers.toArray().indexOf(id);
  if (idx !== -1) ylayers.delete(idx, 1);

  // Delete all connections referencing this shape
  yconnections.forEach((_, connId) => {
    const conn = yconnections.get(connId);
    if (
      conn?.get('fromObjectId') === id ||
      conn?.get('toObjectId') === id
    ) {
      yconnections.delete(connId);
    }
  });
}

export function reorderLayers(
  yshapes: Y.Map<Y.Map<any>>,
  ylayers: Y.Array<string>,
  id: string,
  direction: 'up' | 'down' | 'front' | 'back'
) {
  const layers = ylayers.toArray();
  const idx = layers.indexOf(id);
  if (idx === -1) return;

  let newIdx = idx;
  switch (direction) {
    case 'up':
      newIdx = Math.min(idx + 1, layers.length - 1);
      break;
    case 'down':
      newIdx = Math.max(idx - 1, 0);
      break;
    case 'front':
      newIdx = layers.length - 1;
      break;
    case 'back':
      newIdx = 0;
      break;
  }

  if (newIdx !== idx) {
    ylayers.delete(idx, 1);
    ylayers.insert(newIdx, [id]);

    // Update zIndex values in shapes
    layers.forEach((layerId, i) => {
      const shape = yshapes.get(layerId);
      if (shape) shape.set('zIndex', i);
    });
  }
}

// ═══════════════════════════════════════════════════════════════
// PEN STROKE OPERATIONS
// ═══════════════════════════════════════════════════════════════

export function addPenStroke(
  ystrokes: Y.Array<Y.Map<any>>,
  ylayers: Y.Array<string>,
  strokeData: Omit<PenStrokeData, 'id' | 'createdAt'>,
  zIndex?: number
): PenStrokeData {
  const id = uuid();
  const now = Date.now();
  const finalZIndex = zIndex ?? ylayers.length;

  const ymap = new Y.Map();
  const fullData: PenStrokeData = {
    id,
    ...strokeData,
    zIndex: finalZIndex,
    createdAt: now,
  };

  Object.entries(fullData).forEach(([key, value]) => {
    if (key === 'points') {
      // Store as Y.Array of arrays for better sync
      const ypoints = new Y.Array();
      value.forEach((pt: [number, number, number]) => {
        const ypoint = new Y.Array();
        ypoint.push([pt[0], pt[1], pt[2]]);
        ypoints.push([ypoint]);
      });
      ymap.set(key, ypoints);
    } else {
      ymap.set(key, value);
    }
  });

  ystrokes.push([ymap]);
  ylayers.push([id]);

  return fullData;
}

export function appendPointToPenStroke(
  ystrokes: Y.Array<Y.Map<any>>,
  strokeIndex: number,
  point: [number, number, number]
) {
  const strokeMap = ystrokes.get(strokeIndex);
  if (!strokeMap) return;

  const ypoints = strokeMap.get('points') as Y.Array<any>;
  if (!ypoints) return;

  const ypoint = new Y.Array();
  ypoint.push([point[0], point[1], point[2]]);
  ypoints.push([ypoint]);
}

export function finalizePenStroke(
  ystrokes: Y.Array<Y.Map<any>>,
  strokeIndex: number
) {
  // Optional: clean up or compress stroke data
  const strokeMap = ystrokes.get(strokeIndex);
  if (strokeMap) {
    strokeMap.set('finalized', true);
  }
}

// ═══════════════════════════════════════════════════════════════
// CONNECTION OPERATIONS (Mindmap)
// ═══════════════════════════════════════════════════════════════

export function addConnection(
  yconnections: Y.Map<Y.Map<any>>,
  ylayers: Y.Array<string>,
  connectionData: Omit<ConnectionData, 'id' | 'createdAt'>
): ConnectionData {
  const id = uuid();
  const now = Date.now();

  const ymap = new Y.Map();
  const fullData: ConnectionData = {
    id,
    ...connectionData,
    createdAt: now,
  };

  Object.entries(fullData).forEach(([key, value]) => {
    ymap.set(key, value);
  });

  yconnections.set(id, ymap);
  ylayers.push([id]);

  return fullData;
}

export function deleteConnection(
  yconnections: Y.Map<Y.Map<any>>,
  ylayers: Y.Array<string>,
  id: string
) {
  yconnections.delete(id);
  const idx = ylayers.toArray().indexOf(id);
  if (idx !== -1) ylayers.delete(idx, 1);
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Serialize Y.Doc to Plain JS
// ═══════════════════════════════════════════════════════════════

export function serializeCanvasState(
  yshapes: Y.Map<Y.Map<any>>,
  ystrokes: Y.Array<Y.Map<any>>,
  yconnections: Y.Map<Y.Map<any>>
) {
  const shapes: ShapeData[] = [];
  yshapes.forEach((ymap, id) => {
    shapes.push({
      id,
      ...Object.fromEntries(ymap),
    } as ShapeData);
  });

  const strokes: PenStrokeData[] = [];
  ystrokes.forEach((ymap) => {
    const points = (ymap.get('points') as any).toArray().map((yp: any) =>
      yp.toArray()
    );
    strokes.push({
      id: ymap.get('id'),
      points,
      color: ymap.get('color'),
      strokeWidth: ymap.get('strokeWidth'),
      eraserMode: ymap.get('eraserMode'),
      pressureEnabled: ymap.get('pressureEnabled'),
      zIndex: ymap.get('zIndex'),
      userId: ymap.get('userId'),
      createdAt: ymap.get('createdAt'),
    } as PenStrokeData);
  });

  const connections: ConnectionData[] = [];
  yconnections.forEach((ymap, id) => {
    connections.push({
      id,
      ...Object.fromEntries(ymap),
    } as ConnectionData);
  });

  return { shapes, strokes, connections };
}
