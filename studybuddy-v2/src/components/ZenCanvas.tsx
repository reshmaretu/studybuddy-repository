"use client"; // forces client-side rendering

import dynamic from "next/dynamic";

// Dynamically import tldraw to avoid SSR issues
const Tldraw = dynamic(() => import("@tldraw/tldraw").then(mod => mod.Tldraw), {
    ssr: false,
});

export default function ExpoBoard() {
    return (
        <div style={{ position: "fixed", inset: 0 }}>
            <Tldraw />
        </div>
    );
}
