import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import ChumWidget from "@/components/ChumWidget"; // <-- 1. Import him here!
import FocusModal from "@/components/FocusModal"; // <-- Import FocusModal
import FlowStateOverlay from "@/components/FlowStateOverlay";
import StudyCafeOverlay from "@/components/StudyCafeOverlay";
import MindDumpPad from "@/components/MindDumpPad";
import { supabase } from "@/lib/supabase";
import PresenceSync from "@/components/PresenceSync";
import { useGlobalSync } from "@/hooks/useGlobalSync";
import SyncProvider from "@/components/SyncProvider";

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
  // Logic hook (Ensure this is called inside a Client Component if it uses hooks!)
  useGlobalSync();

  return (
    <html lang="en" data-theme="deep-teal" suppressHydrationWarning>
      <body className={`${inter.className} flex min-h-screen bg-[var(--bg-dark)] text-[var(--text-main)] transition-colors duration-300 overflow-x-hidden`}>

        {/* Wrap everything in the Provider */}
        <SyncProvider>
          <PresenceSync />
          <Sidebar />

          <main className="flex-1 ml-[80px] p-8 transition-all duration-300 relative z-[1]">
            {/* Render children ONLY ONCE here */}
            {children}
          </main>

          {/* Global Components */}
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