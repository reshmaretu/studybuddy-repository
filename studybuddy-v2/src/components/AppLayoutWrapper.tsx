"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import ChumWidget from "./ChumWidget";
import PresenceSync from "./PresenceSync";
import FocusModal from "./FocusModal";
import FlowStateOverlay from "./FlowStateOverlay";
import StudyCafeOverlay from "./StudyCafeOverlay";
import MindDumpPad from "./MindDumpPad";

export default function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isPublicPage = pathname === "/" || pathname === "/login" || pathname === "/register" || pathname === "/room/[roomCode]";

    if (isPublicPage) {
        // ⚡ FIX: Removed min-h-screen. Let the content define the height naturally.
        // Removed overflow-x-hidden here as well (we will apply it to a child if needed).
        return (
            <div className="w-full bg-[#1E1A1D]">
                {children}
            </div>
        );
    }

    return (
        // ⚡ DASHBOARD: Full locked height, hidden overflow, all overlays loaded here.
        <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-dark)]">
            <PresenceSync />
            <Sidebar />

            <main className="flex-1 ml-[80px] p-8 h-full overflow-y-auto relative z-[1] custom-scrollbar">
                {children}
            </main>

            <ChumWidget />
            <FocusModal />
            <FlowStateOverlay />
            <StudyCafeOverlay />
            <MindDumpPad />
        </div>
    );
}