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
    const isPublicPage = pathname === "/" || pathname === "/login" || pathname === "/register";

    if (isPublicPage) {
        // ⚡ PUBLIC PAGE: Absolutely no dashboard components loaded. 
        // overflow-x-hidden applied here to contain animations.
        return (
            <div className="w-full min-h-screen overflow-x-hidden bg-[#1E1A1D]">
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