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

export default function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const isInitialized = useStudyStore((state) => state.isInitialized);
    const [isMounted, setIsMounted] = useState(false);

    // 🛡️ Ensure the component is mounted on the client
    useEffect(() => {
        setIsMounted(true);
    }, []);

    const isRoomPage = pathname.startsWith("/room/");
    const isPublicPage = pathname === "/" || pathname === "/login" || pathname === "/register" || isRoomPage;

    // 🕰️ Loading State: Prevent the "Default Theme" flash
    if (!isMounted || (!isPublicPage && !isInitialized)) {
        return <div className="fixed inset-0 bg-[#0b1211] z-[9999]" />; // Match your base theme color
    }

    if (isPublicPage) {
        return <div className="w-full bg-[var(--bg-dark)]">{children}</div>;
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
            </div>
        </>
    );
}