"use client";

import { useStudyStore, WardrobeAccessory } from "@/store/useStudyStore";

interface ChumRendererProps {
    size?: string;
    activeAccessoriesOverride?: WardrobeAccessory[];
    baseColorIdOverride?: string;
}

export default function ChumRenderer({
    size = "w-full h-full",
    activeAccessoriesOverride,
    baseColorIdOverride,
}: ChumRendererProps) {
    const { activeAccessories, activeBaseColor } = useStudyStore();

    // ✅ Fallback to base14 if activeBaseColor is ever undefined
    const baseColorId = baseColorIdOverride || activeBaseColor || 'base14';
    const accessories = activeAccessoriesOverride || activeAccessories;

    return (
        <div className={`relative ${size}`}>
            {/* 🔥 DYNAMIC BASE COLOR 🔥 */}
            <img
                src={`/assets/chum/${baseColorId}.png`}
                alt="Chum Base"
                className="absolute inset-0 w-full h-full object-contain z-10"
            />

            {/* Accessories */}
            {accessories?.map((acc) => (
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