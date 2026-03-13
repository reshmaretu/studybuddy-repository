"use client";

// Move the library import here
import { Tldraw } from "@tldraw/tldraw";

export default function TldrawSafe({ onMount, id }: { onMount: (app: any) => void, id: string }) {
    return (
        <Tldraw
            id={id}
            showMenu={false}
            onMount={onMount}
        />
    );
}