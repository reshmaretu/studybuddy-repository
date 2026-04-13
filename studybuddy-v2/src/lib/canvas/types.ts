export type ElementType = 'path' | 'node' | 'image' | 'sticky';

export interface Point {
    x: number;
    y: number;
}

export interface CanvasElement {
    id: string;
    type: ElementType;
    x: number;
    y: number;
    width?: number;
    height?: number;
    color?: string;
    opacity?: number;
    rotation?: number;
    data: any; // Flexible for different tool requirements
    zIndex: number;
}

export interface Connection {
    id: string;
    fromId: string;
    toId: string;
    label?: string;
    color?: string;
}

export interface CanvasSnapshot {
    elements: CanvasElement[];
    connections: Connection[];
    stageConfig: {
        scale: number;
        x: number;
        y: number;
    };
}
