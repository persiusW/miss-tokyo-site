// How the widget reads the server's answer. Pure, so tests can import it.
import { looksRaw } from "@/lib/errors/looksRaw";
import { LINES } from "@/lib/ai/shopAssistant/lines";
import type { ShopButton } from "@/lib/ai/shopAssistant/types";

export type Answer = { fresh: boolean; text: string; buttons?: ShopButton[]; retryText?: string };

// Same test the bubbles use (bubbleText leaves the text unchanged).
const calm = (v: unknown): v is string => typeof v === "string" && !looksRaw(v);

/**
 * The assistant bubble for one reply. A calm server line is shown even on a
 * non-2xx; Retry is offered when trying again can help (429, 5xx, busy, or
 * no usable reply). `fresh` means the server started a new chat.
 */
export function readAnswer(a: { ok: boolean; status: number; json: unknown; sent: string }): Answer {
    const j = (a.json && typeof a.json === "object" ? a.json : {}) as { reply?: unknown; buttons?: unknown; fresh?: unknown };
    const fresh = j.fresh === true;
    const usable = a.ok ? typeof j.reply === "string" : calm(j.reply);
    if (!usable) return { fresh, text: LINES.generic, retryText: a.sent };
    const text = j.reply as string;
    const retry = text === LINES.busy || (!a.ok && (a.status === 429 || a.status >= 500));
    return {
        fresh, text,
        ...(Array.isArray(j.buttons) ? { buttons: j.buttons as ShopButton[] } : {}),
        ...(retry ? { retryText: a.sent } : {}),
    };
}

/** New chat clears the bubbles only when the server really started one. */
export function newChatStarted(ok: boolean, json: unknown): boolean {
    return ok && !!json && typeof json === "object" && (json as { ok?: unknown }).ok === true;
}
