import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AppLayoutWrapper from "@/components/AppLayoutWrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "StudyBuddy",
  description: "Your cozy productivity sanctuary.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="deep-teal" suppressHydrationWarning>
      <body className={`${inter.className} bg-[#1E1A1D] text-[#EFE6DD]`}>
        {/* 🛡️ Consolidated to AppLayoutWrapper/PresenceSync only */}
        <AppLayoutWrapper>
          {children}
        </AppLayoutWrapper>
      </body>
    </html>
  );
}