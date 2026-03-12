"use client";
import { useStudyStore } from "@/store/useStudyStore";

export default function AccountPage() {
    const { isPremiumUser } = useStudyStore();

    return (
        <div className="max-w-4xl p-8">
            <header className="mb-8">
                <h1 className="text-3xl font-black text-text-main">Account Settings</h1>
                <p className="text-text-muted">Manage your subscription and profile.</p>
            </header>

            <div className="bg-background-card border border-border rounded-3xl p-8">
                <h3 className="text-text-main font-bold mb-2">Subscription Tier</h3>
                <p className="text-accent-teal font-black uppercase tracking-widest text-sm">
                    {isPremiumUser ? "Pro Explorer" : "Standard Explorer"}
                </p>
            </div>
        </div>
    );
}