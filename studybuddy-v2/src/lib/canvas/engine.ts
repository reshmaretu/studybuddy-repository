import { CanvasElement, Connection, Point } from './types';

/**
 * The StudyBuddy Engine
 * Merges Mindmapping (Graph Logic) with Creative Editing (Object Logic)
 */
export const CanvasEngine = {
    // 🧠 MINDMAP LOGIC: Find center points for connections
    getConnectionPoints(from: CanvasElement, to: CanvasElement) {
        return {
            start: { x: from.x + (from.width || 0) / 2, y: from.y + (from.height || 0) / 2 },
            end: { x: to.x + (to.width || 0) / 2, y: to.y + (to.height || 0) / 2 }
        };
    },

    // 🎨 PATH LOGIC: Simple creation for free-drawing
    createPathElement(points: Point[], color: string, zIndex: number): CanvasElement {
        return {
            id: `path-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'path',
            x: 0,
            y: 0,
            color,
            zIndex,
            data: { points }
        };
    },

    // 📌 NODE LOGIC: Create Mindmap nodes
    createMindmapNode(x: number, y: number, text: string, zIndex: number): CanvasElement {
        return {
            id: `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            type: 'node',
            x,
            y,
            width: 150,
            height: 60,
            zIndex,
            data: { text, theme: 'default' }
        };
    },

    // 🛡️ SECURITY: Validate snapshot before loading
    validateSnapshot(json: any): boolean {
        return json && Array.isArray(json.elements) && Array.isArray(json.connections);
    }
};
