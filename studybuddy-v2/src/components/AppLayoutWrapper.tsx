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
    const isRoomPage = pathname.startsWith("/room/");
    const isPublicPage = pathname === "/" || pathname === "/login" || pathname === "/register" || isRoomPage;
    if (isPublicPage) {
        return (
            <div className="w-full bg-[#1E1A1D]">
                {children}
            </div>
        );
    }

    return (
        <>
            {/* 🛡️ SINGLE SOURCE OF TRUTH: Mounted once at the top level */}
            <PresenceSync />

            {isPublicPage ? (
                <div className="w-full h-full bg-[#05080c]">
                    {children}
                </div>
            ) : (
                <div className="flex h-screen w-full overflow-hidden bg-[var(--bg-dark)]">
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
            )}
        </>
    );
}