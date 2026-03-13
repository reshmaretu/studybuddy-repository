"use client";

import { Tldraw } from "@tldraw/tldraw";

export default function ZenCanvas() {
    return (
        <div style={{ position: "absolute", inset: 0 }}>
            <Tldraw />
        </div>
    );
}
