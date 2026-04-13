"use client";

import React, { useRef, useState, useEffect } from "react";
import { Stage, Layer, Line, Rect, Text, Group, Path } from "react-konva";
import { useCanvasStore } from "@/store/useCanvasStore";
import { CanvasEngine } from "@/lib/canvas/engine";
import { getSvgPathFromStroke } from "@/lib/canvas/utils";
import { Point } from "@/lib/canvas/types";

/**
 * StudyCanvas: The Mega-Engine Renderer
 * Supports Free-drawing, Mindmapping, and Object Manipulation
 */
export default function StudyCanvas() {
    const stageRef = useRef<any>(null);
    const { 
        elements, 
        connections, 
        activeTool, 
        addElement, 
        updateElement,
        stageConfig,
        setStageConfig 
    } = useCanvasStore();

    const [isDrawing, setIsDrawing] = useState(false);
    const [currentPath, setCurrentPath] = useState<Point[]>([]);

    // 🎨 MOUSE EVENTS: Drawing & Navigation
    const handleMouseDown = (e: any) => {
        const stage = e.target.getStage();
        const pos = stage.getRelativePointerPosition();

        if (activeTool === 'pen') {
            setIsDrawing(true);
            setCurrentPath([pos]);
        } else if (activeTool === 'node') {
            const newNode = CanvasEngine.createMindmapNode(pos.x - 75, pos.y - 30, "New Idea", elements.length);
            addElement(newNode);
        }
    };

    const handleMouseMove = (e: any) => {
        if (!isDrawing || activeTool !== 'pen') return;
        const stage = e.target.getStage();
        const pos = stage.getRelativePointerPosition();
        setCurrentPath([...currentPath, pos]);
    };

    const handleMouseUp = () => {
        if (isDrawing && currentPath.length > 1) {
            const newPath = CanvasEngine.createPathElement(currentPath, "#2dd4bf", elements.length);
            addElement(newPath);
        }
        setIsDrawing(false);
        setCurrentPath([]);
    };

    // 🧠 RENDER ENGINE
    return (
        <div className="w-full h-full bg-(--bg-dark) relative overflow-hidden">
            <Stage
                width={typeof window !== 'undefined' ? window.innerWidth : 1000}
                height={typeof window !== 'undefined' ? window.innerHeight : 1000}
                ref={stageRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                scaleX={stageConfig.scale}
                scaleY={stageConfig.scale}
                x={stageConfig.x}
                y={stageConfig.y}
                draggable={activeTool === 'select'}
                onDragEnd={(e) => setStageConfig({ x: e.target.x(), y: e.target.y() })}
            >
                <Layer>
                    {/* 1. ELEMENTS (Nodes & Paths) */}
                    {elements.map((el) => {
                        if (el.type === 'path') {
                            return (
                                <Path
                                    key={el.id}
                                    data={getSvgPathFromStroke(el.data.points)}
                                    fill={el.color || "#fff"}
                                    opacity={el.opacity || 1}
                                    draggable={activeTool === 'select'}
                                    onDragEnd={(e) => updateElement(el.id, { x: e.target.x(), y: e.target.y() })}
                                />
                            );
                        }

                        if (el.type === 'node') {
                            return (
                                <Group
                                    key={el.id}
                                    x={el.x}
                                    y={el.y}
                                    draggable={activeTool === 'select'}
                                    onDragEnd={(e) => updateElement(el.id, { x: e.target.x(), y: e.target.y() })}
                                >
                                    <Rect
                                        width={el.width}
                                        height={el.height}
                                        fill="#1e293b"
                                        stroke="#2dd4bf"
                                        strokeWidth={2}
                                        cornerRadius={12}
                                        shadowBlur={10}
                                        shadowColor="rgba(0,0,0,0.3)"
                                    />
                                    <Text
                                        text={el.data.text}
                                        width={el.width}
                                        height={el.height}
                                        fontSize={14}
                                        fontStyle="bold"
                                        fill="#e2e8f0"
                                        align="center"
                                        verticalAlign="middle"
                                    />
                                </Group>
                            );
                        }
                        return null;
                    })}

                    {/* 2. LIVE DRAWING (Active Stroke) */}
                    {isDrawing && currentPath.length > 0 && (
                        <Path
                            data={getSvgPathFromStroke(currentPath)}
                            fill="#2dd4bf"
                            opacity={0.6}
                        />
                    )}
                </Layer>
            </Stage>

            {/* 🛠️ OVERLAY UI (Mini Toolbar) */}
            <div className="absolute top-6 left-1/2 -translate-x-1/2 flex gap-2 bg-(--bg-card)/80 backdrop-blur-xl p-2 rounded-2xl border border-(--border-color) shadow-2xl z-50">
               {/* Toolbar buttons go here */}
            </div>
        </div>
    );
}
