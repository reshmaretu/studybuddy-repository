"use client";

import { useStudyStore, WardrobeAccessory } from "@/store/useStudyStore";
import { motion, AnimatePresence } from "framer-motion";

interface ChumRendererProps {
    size?: string;
    activeAccessoriesOverride?: WardrobeAccessory[];
}

export default function ChumRenderer({ size = "w-64 h-64", activeAccessoriesOverride }: ChumRendererProps) {
    // Pull the current look from your store (fallback if no override)
    const storeAccessories = useStudyStore((state) => state.activeAccessories);
    const accessories = activeAccessoriesOverride || storeAccessories;

    // Sort accessories by zIndex so they layer correctly
    const sortedAccessories = [...(accessories || [])].sort((a, b) => a.zIndex - b.zIndex);

    return (
        <div className={`relative ${size} flex items-center justify-center`}>
            {/* 1. THE BASE BODY */}
            <img
                src={`/assets/chum/chum.png`}
                alt="Chum Body"
                className="absolute inset-0 w-full h-full object-contain z-10"
            />

            {/* 2. THE ACCESSORIES (Sorted by zIndex for proper layering) */}
            <AnimatePresence>
                {sortedAccessories.map((acc) => (
                    <motion.img
                        key={acc.id}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.3 }}
                        src={`/assets/chum/${acc.fileName}`}
                        alt={acc.name || acc.id}
                        style={{ zIndex: acc.zIndex }}
                        className="absolute inset-0 w-full h-full object-contain"
                    />
                ))}
            </AnimatePresence>

            {/* 3. SHADOW/GLOW underneath */}
            <div className="absolute bottom-4 w-1/2 h-4 bg-black/10 blur-xl rounded-full -z-10" />
        </div>
    );
}