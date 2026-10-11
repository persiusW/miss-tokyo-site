// What the customer sees of the chat. Display only: the real transcript lives
// on the server. Kept for the browser tab so a page reload keeps the bubbles.
"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { looksRaw } from "@/lib/errors/looksRaw";
import { LINES } from "@/lib/ai/shopAssistant/lines";
import type { ShopButton } from "@/lib/ai/shopAssistant/types";

export type Bubble = { id: string; who: "customer" | "assistant"; text: string; buttons?: ShopButton[]; retryText?: string };

export function bubbleText(text: unknown): string {
    return typeof text === "string" && !looksRaw(text) ? text : LINES.generic;
}

type AskState = {
    bubbles: Bubble[]; open: boolean; sending: boolean;
    setOpen: (v: boolean) => void; push: (b: Bubble) => void; reset: () => void; setSending: (v: boolean) => void;
};

export const useAskStore = create<AskState>()(persist((set) => ({
    bubbles: [], open: false, sending: false,
    setOpen: (open) => set({ open }),
    push: (b) => set(s => ({ bubbles: [...s.bubbles, b].slice(-40) })),
    reset: () => set({ bubbles: [] }),
    setSending: (sending) => set({ sending }),
}), {
    name: "ask-miss-tokyo",
    storage: createJSONStorage(() => sessionStorage),
    partialize: (s) => ({ bubbles: s.bubbles }),
}));
