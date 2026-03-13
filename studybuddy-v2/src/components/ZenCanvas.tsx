"use client"; // if using Next.js App Router
import { Tldraw } from "@tldraw/tldraw";

export default function ExpoBoard() {
    return (
        <div style={{ position: "relative", width: "100%", height: "600px" }}>
            <Tldraw />
        </div>
    );
}
