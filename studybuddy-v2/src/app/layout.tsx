// app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import SyncProvider from "@/components/SyncProvider";
import PresenceSync from "@/components/PresenceSync";
import ChumWidget from "@/components/ChumWidget";
import FocusModal from "@/components/FocusModal";
import FlowStateOverlay from "@/components/FlowStateOverlay";
import StudyCafeOverlay from "@/components/StudyCafeOverlay";
import MindDumpPad from "@/components/MindDumpPad";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StudyBuddy v2",
  description: "Your cozy productivity sanctuary.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="deep-teal" suppressHydrationWarning>
      <body className={`${inter.className} flex min-h-screen bg-[var(--bg-dark)] text-[var(--text-main)] transition-colors duration-300 overflow-x-hidden`}>

        {/* 1. The Provider wraps everything that needs to share state */}
        <SyncProvider>
          <PresenceSync />

          <Sidebar />

          {/* 2. Main content area - rendered ONLY ONCE */}
          <main className="flex-1 ml-[80px] p-8 transition-all duration-300 relative z-[1]">
            {children}
          </main>

          {/* 3. Global Overlays/Widgets */}
          <ChumWidget />
          <FocusModal />
          <FlowStateOverlay />
          <StudyCafeOverlay />
          <MindDumpPad />
        </SyncProvider>

        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                let theme = localStorage.getItem('appTheme') || 'deep-teal';
                document.documentElement.setAttribute('data-theme', theme);
              } catch (e) {}
            `,
          }}
        />
      </body>
    </html>
  );
}