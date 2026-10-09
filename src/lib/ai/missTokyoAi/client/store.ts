"use client";

// One Miss Tokyo AI chat per browser tab, shared by the floating panel and the
// /agent page. The transcript is opaque Anthropic history and is sent back
// exactly as the server returned it (the server rejects edited history); only
// the bubbles are for display.
import { create } from "zustand";
import type { Effect } from "@/lib/ai/missTokyoAi/effects";
import type { MtaiFeatures } from "@/lib/ai/settings";

export type Bubble = {
    id: string;
    role: "user" | "assistant";
    text: string;
    effects?: Effect[];
    error?: boolean;
};

export const FEATURES_OFF: MtaiFeatures = { sendToAdmin: false, bell: false, walkthroughs: false, voice: false };

export type Availability = "unknown" | "ready" | "off" | "not_set_up";

export type Spotlight = { anchor: string; label: string; startedAt: number } | null;

type State = {
    hydrated: boolean;
    open: boolean;
    loading: boolean;
    availability: Availability;
    transcript: unknown[];
    bubbles: Bubble[];
    spotlight: Spotlight;
    features: MtaiFeatures;
    /** False until the server has said which extras are on; nothing is cancelled before then. */
    featuresKnown: boolean;
    hydrate: () => void;
    setFeatures: (f: MtaiFeatures) => void;
    setOpen: (open: boolean) => void;
    setAvailability: (a: Availability) => void;
    send: (text: string) => Promise<void>;
    newChat: () => void;
    setSpotlight: (s: Spotlight) => void;
};

const STORAGE_KEY = "mt-ai-chat";
const SPOTLIGHT_KEY = "mt-ai-spotlight";
const KEEP_BUBBLES = 40;
/** The server accepts 80 messages; stop a little before so the last turn fits. */
export const TRANSCRIPT_SOFT_LIMIT = 70;

const CALM_FAIL = "We are updating this feature. Please try again shortly. Sorry for the inconvenience.";
const OFFLINE_FAIL = "You're offline. Your chat is saved — ask again once you're back online.";

const id = () => Math.random().toString(36).slice(2, 10);

function persist(transcript: unknown[], bubbles: Bubble[]) {
    try {
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ transcript, bubbles: bubbles.slice(-KEEP_BUBBLES) }));
    } catch { /* storage unavailable: the chat still works for this page view */ }
}

export const useMissTokyoAi = create<State>((set, get) => ({
    hydrated: false,
    open: false,
    loading: false,
    availability: "unknown",
    transcript: [],
    bubbles: [],
    spotlight: null,
    features: FEATURES_OFF,
    featuresKnown: false,

    hydrate: () => {
        if (get().hydrated) return;
        let transcript: unknown[] = [];
        let bubbles: Bubble[] = [];
        let spotlight: Spotlight = null;
        try {
            const raw = sessionStorage.getItem(STORAGE_KEY);
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed?.transcript) && Array.isArray(parsed?.bubbles)) {
                    transcript = parsed.transcript;
                    bubbles = parsed.bubbles;
                }
            }
            const sp = sessionStorage.getItem(SPOTLIGHT_KEY);
            if (sp) spotlight = JSON.parse(sp);
        } catch { /* start fresh */ }
        set({ hydrated: true, transcript, bubbles, spotlight });
    },

    setFeatures: (features) => set({ features, featuresKnown: true }),

    setOpen: (open) => set({ open }),
    setAvailability: (availability) => set({ availability }),

    send: async (raw) => {
        const text = raw.trim().slice(0, 1000);
        const { loading, transcript, bubbles } = get();
        if (!text || loading) return;
        const withUser: Bubble[] = [...bubbles, { id: id(), role: "user", text }];
        set({ bubbles: withUser, loading: true });

        if (typeof navigator !== "undefined" && navigator.onLine === false) {
            set({ bubbles: [...withUser, { id: id(), role: "assistant", text: OFFLINE_FAIL, error: true }], loading: false });
            return;
        }
        try {
            const res = await fetch("/api/ai/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: [...transcript, { role: "user", content: text }] }),
            });
            const data = await res.json().catch(() => null);
            if (res.ok && Array.isArray(data?.messages)) {
                const next: Bubble[] = [...withUser, {
                    id: id(), role: "assistant", text: String(data.reply ?? ""),
                    effects: Array.isArray(data.effects) ? data.effects : [],
                }];
                set({ transcript: data.messages, bubbles: next, loading: false, availability: "ready" });
                persist(data.messages, next);
            } else {
                // Not taken: history stays as it was, so the question can be asked again.
                if (res.status === 503 && /switched off/i.test(data?.error ?? "")) set({ availability: "off" });
                if (res.status === 503 && /not set up/i.test(data?.error ?? "")) set({ availability: "not_set_up" });
                const next: Bubble[] = [...withUser, { id: id(), role: "assistant", text: data?.error ?? CALM_FAIL, error: true }];
                set({ bubbles: next, loading: false });
                persist(transcript, next);
            }
        } catch {
            const next: Bubble[] = [...withUser, { id: id(), role: "assistant", text: CALM_FAIL, error: true }];
            set({ bubbles: next, loading: false });
            persist(transcript, next);
        }
    },

    newChat: () => {
        set({ transcript: [], bubbles: [], loading: false });
        persist([], []);
    },

    setSpotlight: (spotlight) => {
        set({ spotlight });
        try {
            if (spotlight) sessionStorage.setItem(SPOTLIGHT_KEY, JSON.stringify(spotlight));
            else sessionStorage.removeItem(SPOTLIGHT_KEY);
        } catch { /* non-essential */ }
    },
}));
