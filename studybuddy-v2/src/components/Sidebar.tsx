"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useStudyStore } from "@/store/useStudyStore";
import {
    LayoutGrid, Sprout, Palette, Coffee, Waves, Calendar,
    BookOpen, BarChart3, Shirt, Settings, LogOut, Radio
} from "lucide-react";

export default function Sidebar() {
    const pathname = usePathname();

    const navItems = [
        { name: "Dashboard", href: "/dashboard", icon: LayoutGrid },
        { name: "Crystal Garden", href: "/garden", icon: Sprout },
        { name: "Lantern Network", href: "/lantern", icon: Radio },
        { name: "Zen Canvas", href: "/canvas", icon: Palette },
        { name: "Calendar", href: "/calendar", icon: Calendar },
        { name: "Archive", href: "/archive", icon: BookOpen },
        { name: "Insights", href: "/insights", icon: BarChart3 },
        { name: "Wardrobe", href: "/wardrobe", icon: Shirt },
    ];

    const { activeMode } = useStudyStore();
    const [shakeWardrobe, setShakeWardrobe] = useState(false);
    const isCafe = activeMode === 'studyCafe';

    const handleWardrobeClick = (e: React.MouseEvent) => {
        if (isCafe) {
            e.preventDefault();
            setShakeWardrobe(true);
            setTimeout(() => setShakeWardrobe(false), 300);
        }
    };

    return (
        <nav className="fixed top-0 left-0 h-screen w-[80px] hover:w-[240px] bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] transition-all duration-300 z-50 overflow-hidden group">

            {/* 🛡️ THE FIX: w-full allows the active background to shrink properly without getting cropped! */}
            <div className="w-full h-full flex flex-col justify-between py-6">

                <div className="flex flex-col gap-4">
                    <Link href="/" className="flex items-center h-12 mx-2 mb-4 cursor-pointer rounded-xl hover:bg-white/5 transition-colors overflow-hidden">
                        <div className="w-[64px] flex-shrink-0 flex items-center justify-center">
                            <div className="w-10 h-10 bg-[var(--accent-teal)] rounded-xl flex items-center justify-center shadow-lg">
                                <span className="font-bold text-[var(--bg-sidebar)] text-lg">SB</span>
                            </div>
                        </div>
                        <span className="font-bold text-xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap text-[var(--text-main)]">
                            StudyBuddy
                        </span>
                    </Link>

                    <div className="flex flex-col gap-1">
                        {navItems.map((item) => {
                            const isActive = pathname === item.href;
                            const Icon = item.icon;
                            const isWardrobe = item.name === "Wardrobe";

                            return (
                                <Link
                                    key={item.name}
                                    href={isWardrobe && isCafe ? "#" : item.href}
                                    onClick={isWardrobe ? handleWardrobeClick : undefined}
                                    className={`flex items-center h-12 mx-2 rounded-lg transition-all overflow-hidden whitespace-nowrap
                                        ${isActive
                                            ? "bg-[var(--bg-card)] text-[var(--text-main)] shadow-sm border border-[var(--border-color)]"
                                            : "text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5"
                                        }
                                        ${isWardrobe && isCafe ? "cursor-not-allowed" : ""}
                                        ${isWardrobe && shakeWardrobe ? "animate-premium-shake" : ""}
                                    `}
                                >
                                    <div className="w-[64px] flex-shrink-0 flex items-center justify-center">
                                        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-[var(--accent-teal)]" : ""} />
                                    </div>
                                    <span className="font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                        {item.name}
                                    </span>
                                </Link>
                            );
                        })}
                    </div>
                </div>

                <div className="flex flex-col gap-2">
                    <Link href="/account" className="flex items-center h-12 mx-2 rounded-lg text-[var(--text-muted)] hover:text-[var(--text-main)] hover:bg-white/5 transition-colors overflow-hidden whitespace-nowrap">
                        <div className="w-[64px] flex-shrink-0 flex items-center justify-center"><Settings size={20} /></div>
                        <span className="font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">Account</span>
                    </Link>
                    <Link href="/login" className="flex items-center h-12 mx-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-400/10 transition-colors overflow-hidden whitespace-nowrap">
                        <div className="w-[64px] flex-shrink-0 flex items-center justify-center"><LogOut size={20} /></div>
                        <span className="font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-200">Account</span>
                    </Link>
                </div>

            </div>
        </nav>
    );
}