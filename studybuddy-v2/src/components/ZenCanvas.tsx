"use client";
import { Tldraw } from "@tldraw/tldraw";
import { useState } from "react";

export default function ZenCanvas() {
    const [app, setApp] = useState<any>(null);

    const handleSave = async () => {
        if (!app) return;
        // In v1.x, 'app.document' contains the entire whiteboard state
        const snapshot = app.document;

        console.log("Saving this snapshot to Supabase:", snapshot);
        // await supabase.from('whiteboards').upsert({ snapshot_data: snapshot });
    };

    return (
        <div className="relative h-full w-full">
            <Tldraw
                id="studybuddy_sanctuary"
                onMount={(inst) => setApp(inst)}
                showMenu={false}
            />
            {/* Optional: Add a floating button for testing */}
            <button onClick={handleSave} className="absolute bottom-4 right-4 z-[100] bg-teal-500 p-2 rounded">
                Test Save
            </button>
        </div>
    );
}