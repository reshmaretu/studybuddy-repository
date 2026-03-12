"use client";
import { useStudyStore } from "@/store/useStudyStore";

export default function AccountPage() {
    const { isPremiumUser } = useStudyStore();

    return (
        <div className="max-w-4xl p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-[var(--text-main)]">Account Settings</h1>
                <p className="text-[var(--text-muted)]">Manage your subscription and profile.</p>
            </header>

            <div className="bg-[var(--bg-card)] border border-[var(--border-color)] rounded-3xl p-8">
                <h3 className="text-[var(--text-main)] font-bold mb-2">Subscription Tier</h3>
                <p className="text-[var(--accent-teal)] font-black uppercase tracking-widest text-sm">
                    {isPremiumUser ? "Pro Explorer" : "Standard Explorer"}
                </p>
            </div>
        </div>
    );
}