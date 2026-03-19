"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react"; // ⚡ Add useState
import { useStudyStore } from "@/store/useStudyStore"; // ⚡ Import store
import Sidebar from "./Sidebar";
import ChumWidget from "./ChumWidget";
import PresenceSync from "./PresenceSync";
import FocusModal from "./FocusModal";
import FlowStateOverlay from "./FlowStateOverlay";
import StudyCafeOverlay from "./StudyCafeOverlay";
import MindDumpPad from "./MindDumpPad";
import DevOverlay from "./DevOverlay";

export default function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isInitialized = useStudyStore((state) => state.isInitialized);
    const initializeData = useStudyStore((state) => state.initializeData);
    const [isMounted, setIsMounted] = useState(false);

    // 🛡️ Ensure the component is mounted on the client
    useEffect(() => {
        setIsMounted(true);
        if (!isInitialized) {
            initializeData();
        }
    }, [isInitialized, initializeData]);

    const isRoomPage = pathname.startsWith("/room/");
    const isPublicPage = pathname === "/" || pathname === "/login" || pathname === "/register" || isRoomPage;

    // 🕰️ Loading State: Prevent the "Default Theme" flash
    if (!isMounted || (!isPublicPage && !isInitialized)) {
        return (
            <div className="fixed inset-0 bg-(--bg-dark) z-[9999] flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-[var(--accent-teal)]/30 border-t-[var(--accent-teal)] rounded-full animate-spin" />
                    <span className="text-[var(--text-muted)] font-black tracking-[0.2em] uppercase text-[10px]">Initializing Sanctuary...</span>
                </div>
            </div>
        );
    }

    if (isPublicPage) {
        return (
            <div className="w-full bg-[var(--bg-dark)]">
                {children}
                <DevOverlay />
            </div>
        );
    }

    return (
        <>
            <PresenceSync />
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
                <DevOverlay />
            </div>
        </>
    );
}