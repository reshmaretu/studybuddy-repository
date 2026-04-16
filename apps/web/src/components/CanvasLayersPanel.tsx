"use client";

import React, { useEffect, useMemo, useState } from "react";
import * as Y from "yjs";
import {
  ArrowDown,
  ArrowUp,
  ChevronsDown,
  ChevronsUp,
  StickyNote,
  PenTool,
  Link2,
  X,
  Square,
  Circle,
  Minus,
  Type,
} from "lucide-react";
import { createCanvasSchema } from "@studybuddy/canvas-engine";
import { useCanvasToolStore } from "@studybuddy/api";

interface CanvasLayersPanelProps {
  isOpen: boolean;
  ydoc: Y.Doc;
  onClose?: () => void;
}

interface LayerEntry {
  id: string;
  type: "shape" | "stroke" | "connection" | "unknown";
  label: string;
  shapeType?: string;
}

export const CanvasLayersPanel: React.FC<CanvasLayersPanelProps> = ({
  isOpen,
  ydoc,
  onClose,
}) => {
  const store = useCanvasToolStore();
  const [layers, setLayers] = useState<LayerEntry[]>([]);

  const schema = useMemo(() => createCanvasSchema(ydoc), [ydoc]);

  useEffect(() => {
    const buildLayers = () => {
      const ids = schema.ylayers.toArray();
      const strokeMap = new Map<string, Y.Map<any>>();
      schema.ystrokes.forEach((stroke) => {
        if (!stroke) return;
        strokeMap.set(stroke.get("id"), stroke);
      });

      const entries = ids
        .map((id) => {
          const shape = schema.yshapes.get(id);
          if (shape) {
            const shapeType = shape.get("type");
            return {
              id,
              type: "shape" as const,
              shapeType,
              label: shapeType === "sticky" ? "Sticky" : shapeType === "text" ? "Text" : shapeType,
            };
          }

          const stroke = strokeMap.get(id);
          if (stroke) {
            return { id, type: "stroke" as const, label: "Stroke" };
          }

          const conn = schema.yconnections.get(id);
          if (conn) {
            return { id, type: "connection" as const, label: "Connection" };
          }

          return { id, type: "unknown" as const, label: "Unknown" };
        })
        .reverse();

      setLayers(entries);
    };

    buildLayers();
    const observer = () => buildLayers();

    schema.ylayers.observe(observer);
    schema.yshapes.observe(observer);
    schema.ystrokes.observe(observer);
    schema.yconnections.observe(observer);

    return () => {
      schema.ylayers.unobserve(observer);
      schema.yshapes.unobserve(observer);
      schema.ystrokes.unobserve(observer);
      schema.yconnections.unobserve(observer);
    };
  }, [schema]);

  const reorderLayer = (id: string, direction: "up" | "down" | "front" | "back") => {
    const order = schema.ylayers.toArray();
    const idx = order.indexOf(id);
    if (idx === -1) return;

    let newIdx = idx;
    switch (direction) {
      case "up":
        newIdx = Math.min(idx + 1, order.length - 1);
        break;
      case "down":
        newIdx = Math.max(idx - 1, 0);
        break;
      case "front":
        newIdx = order.length - 1;
        break;
      case "back":
        newIdx = 0;
        break;
      default:
        break;
    }

    if (newIdx === idx) return;

    schema.ylayers.delete(idx, 1);
    schema.ylayers.insert(newIdx, [id]);

    const strokeMap = new Map<string, Y.Map<any>>();
    schema.ystrokes.forEach((stroke) => {
      if (!stroke) return;
      strokeMap.set(stroke.get("id"), stroke);
    });

    schema.ylayers.toArray().forEach((layerId, index) => {
      const shape = schema.yshapes.get(layerId);
      if (shape) shape.set("zIndex", index);
      const stroke = strokeMap.get(layerId);
      if (stroke) stroke.set("zIndex", index);
      const conn = schema.yconnections.get(layerId);
      if (conn) conn.set("zIndex", index);
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed right-6 top-24 z-[450] w-64 rounded-3xl border border-white/10 bg-[#0b1211]/95 p-4 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center justify-between mb-3">
        <div className="text-xs uppercase tracking-widest text-white/60">Layers</div>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-white/50 hover:text-white transition-colors"
          aria-label="Close layers panel"
        >
          <X size={14} />
        </button>
      </div>

      <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
        {layers.map((layer) => {
          const isSelected = store.selectedObjectIds.includes(layer.id);
          const icon =
            layer.type === "stroke"
              ? <PenTool size={14} />
              : layer.type === "connection"
              ? <Link2 size={14} />
              : layer.shapeType === "sticky"
              ? <StickyNote size={14} />
              : layer.shapeType === "circle"
              ? <Circle size={14} />
              : layer.shapeType === "line"
              ? <Minus size={14} />
              : layer.shapeType === "text"
              ? <Type size={14} />
              : <Square size={14} />;

          return (
            <div
              key={layer.id}
              className={`flex items-center gap-2 rounded-2xl border px-2 py-2 transition-all ${
                isSelected
                  ? "border-[#14b8a6] bg-[#14b8a6]/10 text-white"
                  : "border-white/10 bg-white/5 text-white/70 hover:border-white/20"
              }`}
            >
              <button
                onClick={() => store.setSelectedObjectIds([layer.id])}
                className="flex items-center gap-2 flex-1 text-xs"
              >
                <span className="text-white/70">{icon}</span>
                <span className="capitalize">{layer.label}</span>
              </button>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => reorderLayer(layer.id, "front")}
                  className="text-white/40 hover:text-white"
                  title="Bring to front"
                >
                  <ChevronsUp size={12} />
                </button>
                <button
                  onClick={() => reorderLayer(layer.id, "up")}
                  className="text-white/40 hover:text-white"
                  title="Move up"
                >
                  <ArrowUp size={12} />
                </button>
                <button
                  onClick={() => reorderLayer(layer.id, "down")}
                  className="text-white/40 hover:text-white"
                  title="Move down"
                >
                  <ArrowDown size={12} />
                </button>
                <button
                  onClick={() => reorderLayer(layer.id, "back")}
                  className="text-white/40 hover:text-white"
                  title="Send to back"
                >
                  <ChevronsDown size={12} />
                </button>
              </div>
            </div>
          );
        })}
        {layers.length === 0 && (
          <div className="text-xs text-white/40">No layers yet.</div>
        )}
      </div>
    </div>
  );
};
