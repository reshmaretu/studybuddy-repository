"use client";

import { useStudyStore, WardrobeAccessory } from "@/store/useStudyStore";

interface ChumRendererProps {
    size?: string;
    activeAccessoriesOverride?: WardrobeAccessory[];
}

export default function ChumRenderer({ size = "w-full h-full" }: ChumRendererProps) {
    const { activeAccessories, activeBaseColor } = useStudyStore();

    // ✅ Fallback to base14 if activeBaseColor is ever undefined
    const baseColorId = activeBaseColor || 'base14';

    return (
        <div className={`relative ${size}`}>
            {/* 🔥 DYNAMIC BASE COLOR 🔥 */}
            <img
                src={`/assets/chum/${baseColorId}.png`}
                alt="Chum Base"
                className="absolute inset-0 w-full h-full object-contain z-10"
            />

            {/* Accessories */}
            {activeAccessories?.map((acc) => (
                <img
                    key={acc.id}
                    src={`/assets/chum/${acc.fileName}`}
                    className="absolute inset-0 w-full h-full object-contain"
                    style={{ zIndex: acc.zIndex }}
                    alt={acc.name}
                />
            ))}
        </div>
    );
}