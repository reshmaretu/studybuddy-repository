"use client";
import { useStudyStore } from "@/store/useStudyStore";
import { ShieldAlert, Terminal } from "lucide-react";

export default function AccountPage() {
    const { isPremiumUser, isDev, devOverlayEnabled, setDevOverlayEnabled } = useStudyStore();

    return (
        <div className="max-w-4xl p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-(--text-main)">Account Settings</h1>
                <p className="text-(--text-muted)">Manage your subscription and profile.</p>
            </header>

            <div className="space-y-6">
                <div className="bg-(--bg-card) border border-(--border-color) rounded-3xl p-8">
                    <h3 className="text-(--text-main) font-bold mb-2">Subscription Tier</h3>
                    <p className="text-(--accent-teal) font-black uppercase tracking-widest text-sm">
                        {isPremiumUser ? "Pro Explorer" : "Standard Explorer"}
                    </p>
                </div>

                {isDev && (
                    <div className="bg-(--bg-card) border border-red-500/20 rounded-3xl p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <ShieldAlert className="text-red-500" size={24} />
                            <h3 className="text-(--text-main) font-bold">Architect Settings</h3>
                        </div>
                        
                        <div className="flex items-center justify-between p-4 bg-(--bg-dark) rounded-2xl border border-(--border-color) gap-4">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-red-500/10 rounded-xl text-red-400">
                                    <Terminal size={20} />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-(--text-main)">Developer Overlay</p>
                                    <p className="text-xs text-(--text-muted)">Enable the Ctrl+Shift+D shortcut and console.</p>
                                </div>
                            </div>
                            
                            <button 
                                onClick={() => setDevOverlayEnabled(!devOverlayEnabled)}
                                className={`w-12 h-6 min-w-12 rounded-full transition-colors relative ${devOverlayEnabled ? 'bg-red-500' : 'bg-(--border-color)'}`}
                            >
                                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${devOverlayEnabled ? 'translate-x-[24px]' : 'translate-x-1'}`} />
                            </button>
                        </div>
                        <p className="mt-4 text-[10px] text-red-500/60 uppercase font-black tracking-widest text-center">
                            Authorized Architect Access Only
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}