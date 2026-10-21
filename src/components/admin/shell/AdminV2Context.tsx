"use client";

// Shell-wide state pages can reach: who is signed in, and the Settings save
// model's dirty count (for the nav dot and the leave-without-saving guard).
import { createContext, useContext } from "react";

export type V2Role = "admin" | "owner" | "sales_staff";

export type AdminV2Ctx = {
    role: V2Role;
    userName: string;
    isFullAccess: boolean;
    isAdmin: boolean;
    showCustomRequests: boolean;
    /** Unsaved settings, lifted from the Settings page. */
    dirty: number;
    setDirty: (n: number) => void;
    /** Settings registers how to throw its draft away when someone leaves. */
    setDiscard: (fn: (() => void) | null) => void;
    /** Navigate, asking first when Settings has unsaved changes. */
    go: (href: string) => void;
    /** Ask the nav counts to refresh now (after packing an order, answering a chat). */
    refreshCounts: () => void;
};

export const AdminV2Context = createContext<AdminV2Ctx | null>(null);

export function useAdminV2(): AdminV2Ctx {
    const c = useContext(AdminV2Context);
    if (!c) throw new Error("useAdminV2 outside the admin v2 shell");
    return c;
}
