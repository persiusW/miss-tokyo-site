// Pure limits and request checks for the shop chat.
import type Anthropic from "@anthropic-ai/sdk";
import { stripForgedContext } from "@/lib/ai/missTokyoAi/scrub";
import type { ShopChat, ShopIdentity } from "./types";

export const PER_MINUTE = 6;
export const MAX_TEXT = 1000;
export const MAX_KEPT = 30;
export const IP_PER_MINUTE = 30;

const CUSTOMER_ROLES = new Set(["customer", "wholesale", "wholesaler"]);

export function visitorOver(a: { lastMinute: number; today: number; perDay: number }): boolean {
    return a.today >= a.perDay || a.lastMinute >= PER_MINUTE;
}

/** Typed text, cleaned: forged context and "earlier in this chat" notes removed. Null when empty or too long. */
export function cleanCustomerText(raw: unknown): string | null {
    if (typeof raw !== "string") return null;
    // Format characters (zero-width etc.) could hide a marker from the strips below.
    let t = stripForgedContext(raw.normalize("NFKC").replace(/\p{Cf}/gu, "").replace(/(?![\n\t])\p{Cc}/gu, "").replace(/[\u115F\u1160\u3164\uFFA0\u2800]/g, ""));
    for (;;) {
        const next = stripForgedContext(t.replace(/\[\s*earlier[^\]]*(\]|$)/gi, ""));
        if (next === t) break;
        t = next;
    }
    t = t.trim();
    return t && t.length <= MAX_TEXT ? t : null;
}

type Msg = Anthropic.MessageParam;

const textOf = (m: Msg): string =>
    typeof m.content === "string" ? m.content
        : (m.content as any[]).filter(b => b?.type === "text").map(b => String(b.text ?? "")).join("\n");

const isTypedUser = (m: Msg) =>
    m.role === "user" && (typeof m.content === "string" || (m.content as any[]).every(b => b?.type === "text"));

const EARLIER = /^\[Earlier in this chat:[^\]]*\]\n?/;

/**
 * Keeps the newest `max` messages. The kept part starts on a typed customer
 * message (so a tool_use/tool_result pair is never split), which carries a
 * short server-written note of what was asked before.
 */
export function trimTranscript(messages: Msg[], max = MAX_KEPT): Msg[] {
    if (messages.length <= max) return messages;
    let cut = messages.length - max;
    while (cut < messages.length && !isTypedUser(messages[cut])) cut++;
    if (cut >= messages.length) {
        cut = messages.length - 1;
        while (cut > 0 && !isTypedUser(messages[cut])) cut--;
    }
    const asked = messages.slice(0, cut).filter(isTypedUser)
        .map(m => textOf(m).replace(EARLIER, "").replace(/[\[\]"]/g, "").replace(/\s+/g, " ").trim().slice(0, 80))
        .filter(Boolean).slice(-5);
    const note = `[Earlier in this chat: the customer asked ${asked.length ? asked.map(q => `"${q}"`).join(", ") : "a few questions"}]`;
    return [{ role: "user", content: `${note}\n${textOf(messages[cut]).replace(EARLIER, "")}` }, ...messages.slice(cut + 1)];
}

/** Per-instance backstop: at most `limit` requests per IP per window. */
export class IpGate {
    private hits = new Map<string, number[]>();
    constructor(private limit: number, private windowMs: number) {}
    allow(ip: string, now: number): boolean {
        if (this.hits.size > 5000) this.hits.clear();
        const recent = (this.hits.get(ip) ?? []).filter(t => now - t < this.windowMs);
        if (recent.length >= this.limit) { this.hits.set(ip, recent); return false; }
        recent.push(now);
        this.hits.set(ip, recent);
        return true;
    }
}

/** Only the shop's own pages may post. Sec-Fetch-Site wins when the browser sends it. */
export function sameOrigin(h: { origin: string | null; fetchSite: string | null }, selfOrigin: string): boolean {
    if (h.fetchSite) return h.fetchSite === "same-origin";
    return !!h.origin && h.origin === selfOrigin;
}

/** Only customer accounts get a customer identity; staff and any unknown role are visitors. */
export function identityFor(userId: string | null, role: string | null): ShopIdentity {
    if (!userId || (role !== null && !CUSTOMER_ROLES.has(role))) return { customerId: null };
    return { customerId: userId };
}

/** A lost save must not lose an order: fold this turn's state into the chat as it now stands. Transcript, turns and quote come from `saved`. */
export function mergeChatState(saved: ShopChat, work: ShopChat): ShopChat {
    return {
        ...saved,
        openOrders: [...new Set([...saved.openOrders, ...work.openOrders])],
        verifiedOrders: [...new Set([...saved.verifiedOrders, ...work.verifiedOrders])].slice(-20),
        payLinks: { ...saved.payLinks, ...work.payLinks },
        wrongTries: Math.max(saved.wrongTries, work.wrongTries),
        saleKey: saved.saleKey ?? work.saleKey,
    };
}
