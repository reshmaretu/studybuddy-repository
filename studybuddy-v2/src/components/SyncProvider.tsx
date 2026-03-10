"use client";

import React, { createContext, useContext } from "react";
import { useGlobalSync } from "@/hooks/useGlobalSync";

const SyncContext = createContext({});

export default function SyncProvider({ children }: { children: React.ReactNode }) {
    // This is where the logic actually lives!
    useGlobalSync();

    return (
        <SyncContext.Provider value={{}}>
            {children}
        </SyncContext.Provider>
    );
}

export const useSync = () => useContext(SyncContext);