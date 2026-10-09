"use client";

// One Miss Tokyo AI chat per browser tab, shared by the floating panel and the
// /agent page. The transcript is opaque Anthropic history and is sent back
// exactly as the server returned it (the server rejects edited history); only
// the bubbles are for display.
import { create } from "zustand";
import type { Effect } from "@/lib/ai/missTokyoAi/effects";
import type { MtaiFeatures } from "@/lib/ai/settings";
import { ERRORS, isErrorCode } from "@/lib/errors/catalogue";
import { fallbackFor } from "@/lib/ai/missTokyoAi/seed";
import type { AskTarget } from "@/lib/toast";

export type Bubble = {
    id: string;
    /** "team" is an admin's reply to a Send to admin question: display only, never sent to the model. */
    role: "user" | "assistant" | "team";
    text: string;
    effects?: Effect[];
    error?: boolean;
    /** For team bubbles: the question it answers. */
    question?: string;
    /** For assistant bubbles: Send to admin state for the button it carries. */
    sent?: "sending" | "sent" | "failed";
    sentNote?: string;
    /** Fixed help shown without the model (assistant off): stays visible under the lock. */
    fallback?: boolean;
};

export const FEATURES_OFF: MtaiFeatures = { sendToAdmin: false, bell: false, walkthroughs: false, voice: false, errorHelp: false };

export type Availability = "unknown" | "ready" | "off" | "not_set_up";

export type Spotlight = { anchor: string; label: string; startedAt: number } | null;

/** The walkthrough in progress: which tour and which step (0-based). */
export type WalkState = { id: string; step: number } | null;

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
    walk: WalkState;
    /** Question ids whose replies are already in the chat (survives New chat). */
    shownReplies: string[];
    hydrate: () => void;
    setFeatures: (f: MtaiFeatures) => void;
    setWalk: (w: WalkState) => void;
    sendToAdmin: (bubbleId: string, question: string) => Promise<void>;
    /** Fetch admin replies; append new ones; mark them read when the person can see them. */
    pollReplies: (visible: boolean) => Promise<void>;
    setOpen: (open: boolean) => void;
    setAvailability: (a: Availability) => void;
    send: (text: string) => Promise<void>;
    newChat: () => void;
    /** "Ask Miss Tokyo AI" from a payment error: new chat, seeded on the server. */
    askAboutError: (ask: AskTarget) => Promise<void>;
    setSpotlight: (s: Spotlight) => void;
    /** Rings a control now. The timestamp is taken here, not in a component render. */
    showMe: (anchor: string, label: string) => void;
};

const STORAGE_KEY = "mt-ai-chat";
const SPOTLIGHT_KEY = "mt-ai-spotlight";
const REPLIES_KEY = "mt-ai-replies";
const WALK_KEY = "mt-ai-walk";
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
    walk: null,
    shownReplies: [],

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
            const walk = JSON.parse(sessionStorage.getItem(WALK_KEY) ?? "null");
            if (walk && typeof walk.id === "string" && Number.isInteger(walk.step)) set({ walk: { id: walk.id, step: walk.step } });
            const shown = JSON.parse(sessionStorage.getItem(REPLIES_KEY) ?? "[]");
            if (Array.isArray(shown)) set({ shownReplies: shown.filter((v: unknown) => typeof v === "string").slice(-100) });
        } catch { /* start fresh */ }
        set({ hydrated: true, transcript, bubbles, spotlight });
    },

    setFeatures: (features) => set({ features, featuresKnown: true }),

    setWalk: (walk) => {
        set({ walk });
        try {
            if (walk) sessionStorage.setItem(WALK_KEY, JSON.stringify(walk));
            else sessionStorage.removeItem(WALK_KEY);
        } catch { /* the tour still runs on this page */ }
    },

    sendToAdmin: async (bubbleId, question) => {
        const mark = (sent: Bubble["sent"], sentNote?: string) => {
            const next = get().bubbles.map(b => (b.id === bubbleId ? { ...b, sent, sentNote } : b));
            set({ bubbles: next });
            persist(get().transcript, next);
        };
        const current = get().bubbles.find(b => b.id === bubbleId);
        if (!current || current.sent === "sending" || current.sent === "sent") return;
        mark("sending");
        try {
            const res = await fetch("/api/ai/questions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ question, transcript: get().transcript, page_path: window.location.pathname }),
            });
            const data = await res.json().catch(() => null);
            if (res.ok) mark("sent", "Sent. You'll get the reply here.");
            else mark("failed", data?.error ?? "We couldn't send your question. Please try again.");
        } catch {
            mark("failed", "We couldn't send your question. Please try again.");
        }
    },

    pollReplies: async (visible) => {
        try {
            const res = await fetch("/api/ai/questions/mine");
            if (!res.ok) return;
            const data = await res.json().catch(() => null);
            const replies: { id: string; question: string; answer: string; reply_seen_at: string | null }[] =
                Array.isArray(data?.replies) ? data.replies : [];
            const { shownReplies, bubbles, transcript } = get();
            // Unread replies only: once read, a reply does not reappear in other tabs.
            const fresh = replies.filter(r => r && typeof r.id === "string" && typeof r.answer === "string"
                && !r.reply_seen_at && !shownReplies.includes(r.id));
            if (fresh.length > 0) {
                const next: Bubble[] = [...bubbles, ...fresh.map(r => ({ id: id(), role: "team" as const, text: r.answer, question: String(r.question ?? "") }))];
                const shown = [...shownReplies, ...fresh.map(r => r.id)].slice(-100);
                set({ bubbles: next, shownReplies: shown });
                persist(transcript, next);
                try { sessionStorage.setItem(REPLIES_KEY, JSON.stringify(shown)); } catch { /* non-essential */ }
            }
            const unseen = replies.filter(r => !r.reply_seen_at).map(r => r.id);
            if (visible && unseen.length > 0) {
                await fetch("/api/ai/questions/mine", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ids: unseen }),
                });
                window.dispatchEvent(new Event("mtai:badge-refresh"));
            }
        } catch { /* replies arrive on the next poll */ }
    },

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

    askAboutError: async (ask) => {
        if (get().loading || !isErrorCode(ask.code)) return;
        const code = ask.code;
        const text = `Help me with this payment problem (${code}).`;
        const userBubble: Bubble = { id: id(), role: "user", text, fallback: true };
        // The fixed steps for this code, shown without the model.
        const steps = (): Bubble => {
            const d = ERRORS[code] as { staff: string; steps?: string[] };
            const lines = [d.staff, ...(d.steps ?? []).map((s, i) => `${i + 1}. ${s}`)];
            return { id: id(), role: "assistant", text: lines.join("\n"), fallback: true };
        };
        set({ open: true });
        const { availability } = get();
        if (availability === "off" || availability === "not_set_up") {
            const next = [userBubble, steps()];
            set({ transcript: [], bubbles: next });
            persist([], next);
            return;
        }
        // The current chat stays as it is until the server accepts the ask.
        set({ loading: true });
        try {
            const res = await fetch("/api/ai/agent", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ messages: [{ role: "user", content: text }], seed: ask }),
            });
            const data = await res.json().catch(() => null);
            if (res.ok && Array.isArray(data?.messages)) {
                const next: Bubble[] = [{ ...userBubble, fallback: false }, { id: id(), role: "assistant", text: String(data.reply ?? ""), effects: Array.isArray(data.effects) ? data.effects : [] }];
                set({ transcript: data.messages, bubbles: next, loading: false });
                persist(data.messages, next);
                return;
            }
            const extra: Bubble = fallbackFor(res.status) === "steps"
                ? steps()
                : { id: id(), role: "assistant", text: typeof data?.error === "string" ? data.error : CALM_FAIL, error: true };
            const next = [...get().bubbles, userBubble, extra];
            set({ bubbles: next, loading: false });
            persist(get().transcript, next);
        } catch {
            const next = [...get().bubbles, userBubble, steps()];
            set({ bubbles: next, loading: false });
            persist(get().transcript, next);
        }
    },

    showMe: (anchor, label) => get().setSpotlight({ anchor, label, startedAt: Date.now() }),

    setSpotlight: (spotlight) => {
        set({ spotlight });
        try {
            if (spotlight) sessionStorage.setItem(SPOTLIGHT_KEY, JSON.stringify(spotlight));
            else sessionStorage.removeItem(SPOTLIGHT_KEY);
        } catch { /* non-essential */ }
    },
}));
