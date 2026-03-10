// app/layout.tsx
import SyncProvider from "@/components/SyncProvider";
import PresenceSync from "./PresenceSync";

export default function RootLayout({ children }: { children: React.ReactNode }) {
    // 🛑 REMOVE useGlobalSync() from here!

    return (
        <html lang="en" data-theme="deep-teal" suppressHydrationWarning>
            <body className="...">
                <SyncProvider> {/* 👈 ADD THIS WRAPPER */}
                    <PresenceSync />
                    {children}
                </SyncProvider>
            </body>
        </html>
    );
}