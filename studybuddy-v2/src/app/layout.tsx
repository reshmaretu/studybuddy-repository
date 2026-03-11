import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppLayoutWrapper from "@/components/AppLayoutWrapper";
import SyncProvider from "@/components/SyncProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StudyBuddy",
  description: "Your cozy productivity sanctuary.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="deep-teal" suppressHydrationWarning>
      {/* ⚡ Completely bare body tag to prevent any scrolling collisions */}
      <body className={`${inter.className} bg-[#1E1A1D] text-[#EFE6DD]`}>
        <SyncProvider>
          <AppLayoutWrapper>
            {children}
          </AppLayoutWrapper>
        </SyncProvider>
      </body>
    </html>
  );
}