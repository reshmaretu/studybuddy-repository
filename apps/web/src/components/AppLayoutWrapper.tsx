"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react"; // ⚡ Add useState
import { useStudyStore } from "@/store/useStudyStore"; // ⚡ Import store
import Sidebar from "./Sidebar";
import ChumWidget from "./ChumWidget";
import PresenceSync from "./PresenceSync";
import FocusModal from "./FocusModal";
import FlowStateOverlay from "./FlowStateOverlay";
import StudyCafeOverlay from "./StudyCafeOverlay";
import MindDumpPad from "./MindDumpPad";
import TaskEditModal from "./TaskEditModal";
import TaskViewModal from "./TaskViewModal";
import ProfileModal from "./ProfileModal";
import DevOverlay from "./DevOverlay";
import NotificationCenter from "./NotificationCenter";
import BrainResetModal from "./BrainResetModal";
import TutorialIntro from "./TutorialIntro";
import PremiumModal from "./PremiumModal";
import UnDoneModal from "./UnDoneModal";

export default function AppLayoutWrapper({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { 
        isInitialized, initializeData, isSidebarHidden, userEmail, hasCompletedTutorial,
        isBrainResetOpen, setIsBrainResetOpen, isUnDoneModalOpen, setIsUnDoneModalOpen,
        accessibilitySettings 
    } = useStudyStore();
    const router = useRouter();
    const [isMounted, setIsMounted] = useState(false);

    const isRoomPage = pathname.startsWith("/room/");
    const appPages = ["/dashboard", "/garden", "/insights", "/lantern", "/account", "/cafe", "/canvas", "/wardrobe", "/archive", "/calendar"];
    const isAppPage = appPages.includes(pathname);
    const isPublicPage = pathname === "/" || pathname === "/login" || pathname === "/register" || pathname === "/reset-password" || pathname === "/error" || isRoomPage || !isAppPage;

    // 🛡️ Ensure the component is mounted on the client
    useEffect(() => {
        setIsMounted(true);
        if (!isInitialized) {
            initializeData();
        }

        // 🛰️ Register Service Worker for Web Push
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(reg => console.log('[STUDYBUDDY] Neural Link (SW) Registered'))
                .catch(err => console.error('[STUDYBUDDY] Neural Link Failed:', err));
        }
    }, [isInitialized, initializeData]);
    
    // 🚪 Protection: Redirect if not logged in and trying to access app pages
    useEffect(() => {
        if (isMounted && isInitialized) {
            const isProtected = !isPublicPage && pathname !== '/';
            if (isProtected && !userEmail) {
                router.push('/register');
            }
        }
    }, [isMounted, isInitialized, isPublicPage, userEmail, router, pathname]);

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
        <div className={`
            ${accessibilitySettings.highContrast ? 'high-contrast' : ''} 
            ${accessibilitySettings.largeText ? 'large-text' : ''} 
            ${accessibilitySettings.reducedMotion ? 'reduced-motion' : ''}
        `}>
            <PresenceSync />
            <div className={`flex flex-col md:flex-row h-screen w-full overflow-hidden bg-[var(--bg-dark)]`}>
                {!isSidebarHidden && <Sidebar />}
                <main className={`flex-1 min-w-0 p-4 md:p-8 pb-24 md:pb-12 h-screen relative z-[1] 
                    ${['/dashboard', '/insights', '/account', '/wardrobe', '/archive', '/calendar'].includes(pathname) 
                        ? 'overflow-y-auto no-scrollbar' 
                        : 'overflow-hidden'}`}
                >
                    {children}
                </main>
                {isInitialized && hasCompletedTutorial && <ChumWidget />}
                <FocusModal />
                <FlowStateOverlay />
                <StudyCafeOverlay />
                <MindDumpPad />
                <TaskEditModal />
                <TaskViewModal />
                <ProfileModal />
                <NotificationCenter />
                <BrainResetModal isOpen={isBrainResetOpen} onClose={() => setIsBrainResetOpen(false)} />
                {isUnDoneModalOpen && (
                    <UnDoneModal onClose={() => setIsUnDoneModalOpen(false)} />
                )}
                {isInitialized && <TutorialIntro />}
                <DevOverlay />
                <PremiumModal />
            </div>
        </div>
    );
}