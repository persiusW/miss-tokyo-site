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

// The layout and the page each read the store switch, so for a moment (a
// switch flipped between the two reads) a new page can render inside the old
// shell. That used to throw and show a crash screen; it now gets the most
// limited context instead. Every page and action still checks the role on the
// server, so nothing opens up.
const OUTSIDE_SHELL: AdminV2Ctx = {
    role: "sales_staff",
    userName: "",
    isFullAccess: false,
    isAdmin: false,
    showCustomRequests: false,
    dirty: 0,
    setDirty: () => {},
    setDiscard: () => {},
    go: href => { if (typeof window !== "undefined") window.location.assign(href); },
    refreshCounts: () => {},
};

export function useAdminV2(): AdminV2Ctx {
    return useContext(AdminV2Context) ?? OUTSIDE_SHELL;
}
