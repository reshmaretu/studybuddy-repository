/**
 * Weave.js Canvas Renderer with Yjs Integration
 * 
 * This replaces the basic useEffect drawing loop with a professional
 * rendering lifecycle that handles:
 * - Viewport transforms (pan/zoom)
 * - Layer rendering
 * - Hit testing
 * - Event coordination
 */

import type { ShapeData, StickyNoteData, PenStrokeData, ConnectionData } from './yjs-schema';
import * as Y from 'yjs';
import { getStroke } from 'perfect-freehand';

// Weave.js stubs (install weave-js package)
// import { Camera, CanvasRenderer, Action } from 'weave-js';

// ═══════════════════════════════════════════════════════════════
// CANVAS STATE & RENDERING
// ═══════════════════════════════════════════════════════════════

export interface CanvasRenderContext {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
  width: number;
  height: number;
}

export interface HitTestResult {
  objectId: string;
  type: 'shape' | 'stroke' | 'connection';
  distance: number;
}

/**
 * Main Canvas Engine using Weave.js
 * Handles rendering coordination, hit testing, and tool interactions
 */
export class StudyBuddyCanvasEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private ydoc: Y.Doc;

  private viewport = { x: 0, y: 0, zoom: 1 };
  private selectedObjectIds = new Set<string>();
  private activeTool: 'pen' | 'select' | 'eraser' | 'mindmap' | 'sticky' = 'select';
  private isDrawing = false;

  // Yjs refs
  private yshapes: Y.Map<Y.Map<any>>;
  private ystrokes: Y.Array<Y.Map<any>>;
  private yconnections: Y.Map<Y.Map<any>>;
  private ylayers: Y.Array<string>;
  private ymetadata: Y.Map<any>;

  // Animation frame for render loop
  private rafId?: number;

  // Observer subscriptions for Yjs changes
  private observers: (() => void)[] = [];

  constructor(canvas: HTMLCanvasElement, ydoc: Y.Doc) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.ydoc = ydoc;

    // Initialize Yjs refs
    const schema = this._initializeSchema();
    this.yshapes = schema.yshapes;
    this.ystrokes = schema.ystrokes;
    this.yconnections = schema.yconnections;
    this.ylayers = schema.ylayers;
    this.ymetadata = schema.ymetadata;

    this._setupEventListeners();
    this._subscribeToYjsChanges();
    this._startRenderLoop();

    console.log('✨ StudyBuddy Canvas Engine initialized');
  }

  setSelectedObjectIds(ids: string[]) {
    this.selectedObjectIds = new Set(ids);
    this._markDirty();
  }

  // ─────────────────────────────────────────────────────────────
  // INITIALIZATION
  // ─────────────────────────────────────────────────────────────

  private _initializeSchema() {
    const yshapes = this.ydoc.getMap<Y.Map<any>>('shapes');
    const ystrokes = this.ydoc.getArray<Y.Map<any>>('strokes');
    const yconnections = this.ydoc.getMap<Y.Map<any>>('connections');
    const ylayers = this.ydoc.getArray<string>('layerOrder');
    const ymetadata = this.ydoc.getMap<any>('metadata');

    return { yshapes, ystrokes, yconnections, ylayers, ymetadata };
  }

  private _subscribeToYjsChanges() {
    const reshapeObserver = () => this._markDirty();

    this.yshapes.observe(reshapeObserver);
    this.ystrokes.observe(reshapeObserver);
    this.yconnections.observe(reshapeObserver);
    this.ylayers.observe(reshapeObserver);
    this.ymetadata.observe(reshapeObserver);

    this.observers.push(
      () => this.yshapes.unobserve(reshapeObserver),
      () => this.ystrokes.unobserve(reshapeObserver),
      () => this.yconnections.unobserve(reshapeObserver),
      () => this.ylayers.unobserve(reshapeObserver),
      () => this.ymetadata.unobserve(reshapeObserver)
    );
  }

  private _setupEventListeners() {
    this.canvas.addEventListener('pointerdown', this._onPointerDown.bind(this));
    this.canvas.addEventListener('pointermove', this._onPointerMove.bind(this));
    this.canvas.addEventListener('pointerup', this._onPointerUp.bind(this));
    this.canvas.addEventListener('wheel', this._onWheel.bind(this), { passive: false });
  }

  // ─────────────────────────────────────────────────────────────
  // RENDER LOOP (Weave.js equivalent)
  // ─────────────────────────────────────────────────────────────

  private isDirty = true;
  private _markDirty() {
    this.isDirty = true;
  }

  private _startRenderLoop() {
    const render = () => {
      if (this.isDirty) {
        this._render();
        this.isDirty = false;
      }
      this.rafId = requestAnimationFrame(render);
    };
    this.rafId = requestAnimationFrame(render);
  }

  private _render() {
    const { ctx, canvas, viewport } = this;

    // Clear canvas
    ctx.fillStyle = '#0b1211';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Save state
    ctx.save();

    // Apply viewport transform
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.scale(viewport.zoom, viewport.zoom);
    ctx.translate(-canvas.width / 2 + viewport.x, -canvas.height / 2 + viewport.y);

    this._renderGrid();

    // Render in layer order
    const layerOrder = this.ylayers.toArray();
    for (const id of layerOrder) {
      // Try shape
      const shape = this.yshapes.get(id);
      if (shape) {
        this._renderShape(shape);
        continue;
      }

      // Try stroke
      for (let i = 0; i < this.ystrokes.length; i++) {
        const stroke = this.ystrokes.get(i);
        if (stroke?.get('id') === id) {
          this._renderStroke(stroke);
          break;
        }
      }

      // Try connection
      const conn = this.yconnections.get(id);
      if (conn) {
        this._renderConnection(conn);
      }
    }

    ctx.restore();

    // Render UI overlays
    this._renderSelectionHandles();
  }

  private _renderGrid() {
    const gridEnabled = this.ymetadata.get('gridEnabled');
    if (!gridEnabled) return;

    const gridSize = this.ymetadata.get('gridSize') || 40;
    const { ctx, canvas, viewport } = this;
    const width = canvas.width / viewport.zoom;
    const height = canvas.height / viewport.zoom;

    const startX = Math.floor((-viewport.x) / gridSize) * gridSize - width / 2;
    const startY = Math.floor((-viewport.y) / gridSize) * gridSize - height / 2;

    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth = 1 / viewport.zoom;

    for (let x = startX; x <= startX + width + gridSize; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, startY);
      ctx.lineTo(x, startY + height + gridSize);
      ctx.stroke();
    }

    for (let y = startY; y <= startY + height + gridSize; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(startX, y);
      ctx.lineTo(startX + width + gridSize, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private _renderShape(ymap: Y.Map<any>) {
    const type = ymap.get('type');
    const x = ymap.get('x');
    const y = ymap.get('y');
    const w = ymap.get('width');
    const h = ymap.get('height');
    const color = ymap.get('color');
    const fillOpacity = ymap.get('fillOpacity');
    const rotation = ymap.get('rotation');
    const strokeWidth = ymap.get('strokeWidth') || 2;
    const fillColor = ymap.get('fillColor') || color;
    const strokeColor = ymap.get('strokeColor') || color;
    const fillEnabled = ymap.get('fillEnabled') ?? true;
    const strokeEnabled = ymap.get('strokeEnabled') ?? false;
    const isSelected = this.selectedObjectIds.has(ymap.get('id'));

    this.ctx.save();
    this.ctx.translate(x + w / 2, y + h / 2);
    this.ctx.rotate((rotation * Math.PI) / 180);
    this.ctx.translate(-w / 2, -h / 2);

    if (type === 'rect') {
      if (fillEnabled) {
        this.ctx.fillStyle = `${fillColor}${Math.round(fillOpacity * 255)
          .toString(16)
          .padStart(2, '0')}`;
        this.ctx.fillRect(0, 0, w, h);
      }
      if (strokeEnabled) {
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = strokeWidth;
        this.ctx.strokeRect(0, 0, w, h);
      }
    } else if (type === 'circle') {
      this.ctx.beginPath();
      this.ctx.arc(w / 2, h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
      if (fillEnabled) {
        this.ctx.fillStyle = `${fillColor}${Math.round(fillOpacity * 255)
          .toString(16)
          .padStart(2, '0')}`;
        this.ctx.fill();
      }
      if (strokeEnabled) {
        this.ctx.strokeStyle = strokeColor;
        this.ctx.lineWidth = strokeWidth;
        this.ctx.stroke();
      }
    } else if (type === 'line') {
      this.ctx.strokeStyle = strokeColor;
      this.ctx.lineWidth = strokeWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(0, 0);
      this.ctx.lineTo(w, h);
      this.ctx.stroke();
    } else if (type === 'sticky') {
      // Render sticky note background
      this.ctx.fillStyle = color;
      this.ctx.fillRect(0, 0, w, h);

      // Render text
      const text = ymap.get('text');
      const fontSize = ymap.get('fontSize') || 14;
      this.ctx.fillStyle = ymap.get('textColor') || '#000';
      this.ctx.font = `${fontSize}px system-ui`;
      this.ctx.textBaseline = 'top';
      
      const lines = text.split('\n');
      lines.forEach((line: string, i: number) => {
        this.ctx.fillText(line, 8, 8 + i * (fontSize + 4));
      });
    } else if (type === 'text') {
      const text = ymap.get('text') || 'Text';
      const fontSize = ymap.get('fontSize') || 20;
      const fontFamily = ymap.get('fontFamily') || 'system-ui';
      this.ctx.fillStyle = ymap.get('textColor') || color;
      this.ctx.font = `${fontSize}px ${fontFamily}`;
      this.ctx.textBaseline = 'top';
      this.ctx.fillText(text, 0, 0);
    }

    // Selection outline
    if (isSelected) {
      this.ctx.strokeStyle = '#14b8a6';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(0, 0, w, h);
    }

    this.ctx.restore();
  }

  private _renderStroke(ymap: Y.Map<any>) {
    const points = (ymap.get('points') as Y.Array<any>).toArray();
    const color = ymap.get('color');
    const strokeWidth = ymap.get('strokeWidth');
    const eraserMode = ymap.get('eraserMode');
    const pressureEnabled = ymap.get('pressureEnabled');
    const opacity = ymap.get('opacity') ?? 1;

    if (points.length < 2) return;

    const strokePoints = points.map((pt) => {
      const [x, y, pressure] = pt?.toArray?.() || [0, 0, 1];
      return { x, y, pressure: pressure ?? 1 };
    });

    const outline = getStroke(strokePoints, {
      size: strokeWidth,
      thinning: pressureEnabled ? 0.6 : 0,
      smoothing: 0.5,
      streamline: 0.5,
      simulatePressure: !pressureEnabled,
    });

    if (!outline.length) return;

    const path = new Path2D(this._getSvgPathFromStroke(outline));
    this.ctx.fillStyle = eraserMode
      ? 'rgba(255,255,255,0.1)'
      : this._applyAlphaToColor(color, opacity);
    this.ctx.fill(path);
  }

  private _getSvgPathFromStroke(points: Array<[number, number]>) {
    if (!points.length) return '';
    const d = points
      .map((point, i) => `${i === 0 ? 'M' : 'L'}${point[0]} ${point[1]}`)
      .join(' ');
    return `${d} Z`;
  }

  private _applyAlphaToColor(color: string, alpha: number) {
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const normalized = hex.length === 3
        ? hex.split('').map((c) => `${c}${c}`).join('')
        : hex;
      const clampedAlpha = Math.max(0, Math.min(1, alpha));
      const alphaHex = Math.round(clampedAlpha * 255)
        .toString(16)
        .padStart(2, '0');
      return `#${normalized}${alphaHex}`;
    }
    return color;
  }

  private _renderConnection(ymap: Y.Map<any>) {
    const fromId = ymap.get('fromObjectId');
    const toId = ymap.get('toObjectId');
    const lineStyle = ymap.get('lineStyle');
    const color = ymap.get('color');

    const fromShape = this.yshapes.get(fromId);
    const toShape = this.yshapes.get(toId);

    if (!fromShape || !toShape) return;

    const fromX = fromShape.get('x') + fromShape.get('width') / 2;
    const fromY = fromShape.get('y') + fromShape.get('height') / 2;
    const toX = toShape.get('x') + toShape.get('width') / 2;
    const toY = toShape.get('y') + toShape.get('height') / 2;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = 2;

    if (lineStyle === 'curved') {
      const cpX = (fromX + toX) / 2;
      const cpY = (fromY + toY) / 2 - 50; // Control point offset
      this.ctx.beginPath();
      this.ctx.moveTo(fromX, fromY);
      this.ctx.quadraticCurveTo(cpX, cpY, toX, toY);
      this.ctx.stroke();
    } else if (lineStyle === 'dashed') {
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.moveTo(fromX, fromY);
      this.ctx.lineTo(toX, toY);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    } else {
      this.ctx.beginPath();
      this.ctx.moveTo(fromX, fromY);
      this.ctx.lineTo(toX, toY);
      this.ctx.stroke();
    }
  }

  private _renderSelectionHandles() {
    // Draw selection indicators (would be enhanced with Weave.js handles)
    if (this.selectedObjectIds.size === 0) return;

    this.selectedObjectIds.forEach((id) => {
      const shape = this.yshapes.get(id);
      if (!shape) return;

      const x = shape.get('x');
      const y = shape.get('y');
      const w = shape.get('width');
      const h = shape.get('height');

      // Corner handles
      const handleSize = 8 / this.viewport.zoom;
      this.ctx.fillStyle = '#14b8a6';
      [
        [x, y],
        [x + w, y],
        [x, y + h],
        [x + w, y + h],
      ].forEach(([hx, hy]) => {
        this.ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize);
      });
    });
  }

  // ─────────────────────────────────────────────────────────────
  // HIT TESTING
  // ─────────────────────────────────────────────────────────────

  hitTest(canvasX: number, canvasY: number, tolerance = 10): HitTestResult | null {
    // Convert canvas coords to world coords
    const worldX = (canvasX - this.canvas.width / 2) / this.viewport.zoom + this.canvas.width / 2 - this.viewport.x;
    const worldY = (canvasY - this.canvas.height / 2) / this.viewport.zoom + this.canvas.height / 2 - this.viewport.y;

    let closest: HitTestResult | null = null;

    // Check shapes (in reverse layer order for topmost first)
    const layers = this.ylayers.toArray();
    for (let i = layers.length - 1; i >= 0; i--) {
      const id = layers[i];
      const shape = this.yshapes.get(id);

      if (!shape) continue;

      const x = shape.get('x');
      const y = shape.get('y');
      const w = shape.get('width');
      const h = shape.get('height');
      const type = shape.get('type');

      const distance = this._pointToShapeDistance(
        worldX,
        worldY,
        x,
        y,
        w,
        h,
        type as any,
        shape.get('strokeWidth') || 2
      );
      if (distance !== null && distance <= tolerance) {
        return {
          objectId: id,
          type: 'shape',
          distance,
        };
      }
    }

    // Check strokes
    for (let i = 0; i < this.ystrokes.length; i++) {
      const stroke = this.ystrokes.get(i);
      if (!stroke) continue;

      const points = (stroke.get('points') as Y.Array<any>).toArray();
      const strokeWidth = stroke.get('strokeWidth');

      const distance = this._pointToStrokeDistance(worldX, worldY, points, strokeWidth);
      if (distance !== null && distance <= tolerance) {
        const result: HitTestResult = {
          objectId: stroke.get('id'),
          type: 'stroke',
          distance,
        };
        if (!closest || distance < closest.distance) {
          closest = result;
        }
      }
    }

    return closest;
  }

  hitTestArea(canvasX: number, canvasY: number, radius = 10): HitTestResult[] {
    const world = this.canvasToWorld(canvasX, canvasY);
    const results: HitTestResult[] = [];

    const layers = this.ylayers.toArray();
    for (let i = layers.length - 1; i >= 0; i--) {
      const id = layers[i];
      const shape = this.yshapes.get(id);

      if (shape) {
        const distance = this._pointToShapeDistance(
          world.x,
          world.y,
          shape.get('x'),
          shape.get('y'),
          shape.get('width'),
          shape.get('height'),
          shape.get('type'),
          shape.get('strokeWidth') || 2
        );
        if (distance !== null && distance <= radius) {
          results.push({ objectId: id, type: 'shape', distance });
        }
        continue;
      }

      for (let j = 0; j < this.ystrokes.length; j++) {
        const stroke = this.ystrokes.get(j);
        if (!stroke || stroke.get('id') !== id) continue;

        const points = (stroke.get('points') as Y.Array<any>).toArray();
        const strokeWidth = stroke.get('strokeWidth');
        const distance = this._pointToStrokeDistance(
          world.x,
          world.y,
          points,
          strokeWidth
        );
        if (distance !== null && distance <= radius) {
          results.push({ objectId: id, type: 'stroke', distance });
        }
        break;
      }
    }

    return results;
  }

  private _pointToShapeDistance(
    px: number,
    py: number,
    x: number,
    y: number,
    w: number,
    h: number,
    type: 'rect' | 'circle' | 'sticky' | 'line' | 'text',
    strokeWidth = 2
  ): number | null {
    if (type === 'rect' || type === 'sticky' || type === 'text') {
      if (px >= x && px <= x + w && py >= y && py <= y + h) return 0;
      const dx = Math.max(x - px, px - (x + w));
      const dy = Math.max(y - py, py - (y + h));
      return Math.sqrt(Math.max(0, dx) ** 2 + Math.max(0, dy) ** 2);
    } else if (type === 'circle') {
      const cx = x + w / 2;
      const cy = y + h / 2;
      const r = Math.min(w, h) / 2;
      const d = Math.sqrt((px - cx) ** 2 + (py - cy) ** 2);
      return Math.abs(d - r);
    } else if (type === 'line') {
      const dist = this._pointToLineDistance(px, py, x, y, x + w, y + h);
      return dist <= strokeWidth ? dist : null;
    }
    return null;
  }

  private _pointToStrokeDistance(
    px: number,
    py: number,
    points: any[],
    strokeWidth: number
  ): number | null {
    let minDist = Infinity;

    for (let i = 0; i < points.length - 1; i++) {
      const pt1 = points[i]?.toArray?.() || [0, 0];
      const pt2 = points[i + 1]?.toArray?.() || [0, 0];

      const dist = this._pointToLineDistance(px, py, pt1[0], pt1[1], pt2[0], pt2[1]);
      minDist = Math.min(minDist, dist);
    }

    return minDist <= strokeWidth / 2 ? minDist : null;
  }

  private _pointToLineDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;

    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // ─────────────────────────────────────────────────────────────
  // EVENT HANDLERS
  // ─────────────────────────────────────────────────────────────

  private _onPointerDown(e: PointerEvent) {
    const hit = this.hitTest(e.clientX - this.canvas.getBoundingClientRect().left, e.clientY - this.canvas.getBoundingClientRect().top);

    if (this.activeTool === 'select' && hit) {
      this.selectedObjectIds.clear();
      this.selectedObjectIds.add(hit.objectId);
      this.isDrawing = true;
    } else if (this.activeTool === 'pen') {
      this.isDrawing = true;
      // Start new stroke (will be filled in pointermove)
    } else if (this.activeTool === 'eraser' && hit) {
      this._deleteObject(hit.objectId);
    }

    this._markDirty();
  }

  private _onPointerMove(e: PointerEvent) {
    if (!this.isDrawing) return;
    // TODO: Implement drag logic for select, drawing for pen
  }

  private _onPointerUp(e: PointerEvent) {
    this.isDrawing = false;
  }

  private _onWheel(e: WheelEvent) {
    e.preventDefault();

    const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
    this.viewport.zoom *= zoomFactor;
    this.viewport.zoom = Math.max(0.1, Math.min(5, this.viewport.zoom));

    this._markDirty();
  }

  // ─────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────

  setActiveTool(tool: 'pen' | 'select' | 'eraser' | 'mindmap' | 'sticky') {
    this.activeTool = tool;
  }

  pan(dx: number, dy: number) {
    this.viewport.x += dx;
    this.viewport.y += dy;
    this._markDirty();
  }

  zoom(factor: number) {
    this.viewport.zoom *= factor;
    this.viewport.zoom = Math.max(0.1, Math.min(5, this.viewport.zoom));
    this._markDirty();
  }

  getViewport() {
    return { ...this.viewport };
  }

  canvasToWorld(canvasX: number, canvasY: number) {
    const worldX =
      (canvasX - this.canvas.width / 2) / this.viewport.zoom +
      this.canvas.width / 2 -
      this.viewport.x;
    const worldY =
      (canvasY - this.canvas.height / 2) / this.viewport.zoom +
      this.canvas.height / 2 -
      this.viewport.y;
    return { x: worldX, y: worldY };
  }

  getSelectedObjectIds() {
    return Array.from(this.selectedObjectIds);
  }

  selectObjects(ids: string[]) {
    this.selectedObjectIds.clear();
    ids.forEach((id) => this.selectedObjectIds.add(id));
    this._markDirty();
  }

  private _deleteObject(id: string) {
    // Delete from appropriate collection
    if (this.yshapes.has(id)) {
      this.yshapes.delete(id);
    }

    for (let i = 0; i < this.ystrokes.length; i++) {
      if (this.ystrokes.get(i)?.get('id') === id) {
        this.ystrokes.delete(i, 1);
        break;
      }
    }

    if (this.yconnections.has(id)) {
      this.yconnections.delete(id);
    }

    const idx = this.ylayers.toArray().indexOf(id);
    if (idx !== -1) {
      this.ylayers.delete(idx, 1);
    }

    this._markDirty();
  }

  destroy() {
    this.observers.forEach((unsubscribe) => unsubscribe());
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }
}
