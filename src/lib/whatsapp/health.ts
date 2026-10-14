// WhatsApp inbound health for staff. Chatbots Africa never retries a callback,
// so silent loss is the main risk: staff see when a message last arrived, how
// many are waiting, and how many the system gave up on. Pure: the numbers are
// read by the API route.

export type InboundCounts = {
    mode: "capture" | "processing";
    parserReady: boolean;
    switchOn: boolean;
    lastReceivedAt: string | null;
    waiting: number;                 // stored, not yet processed, not given up
    oldestWaitingAt: string | null;
    retrying: number;                // waiting with at least one failed attempt
    gaveUp7d: number;
    oversized7d: number;             // deliveries over the size cap: stored as markers, content lost
    refused7d: number;               // deliveries refused by the rate limit: never resent, content lost
    noPhone7d: number;               // messages from a hidden number: stored, no conversation opened
};

export type Health = { level: "ok" | "warning" | "problem"; summary: string; notes: string[] };

/** A waiting message older than this, while processing, means customers are not being answered. */
export const STUCK_AFTER_MS = 15 * 60_000;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function inboundHealth(c: InboundCounts, now: Date): Health {
    const notes: string[] = [];
    if (c.oversized7d > 0) notes.push(`${plural(c.oversized7d, "delivery was", "deliveries were")} too large to store this week. Check WhatsApp for ${c.oversized7d === 1 ? "it" : "them"}.`);
    if (c.refused7d > 0) notes.push(`Deliveries were refused for arriving too fast this week (${plural(c.refused7d, "time", "times")}). Those messages were not resent: check WhatsApp.`);
    if (c.gaveUp7d > 0) notes.push(`${plural(c.gaveUp7d, "message", "messages")} could not be handled this week and went to the team.`);
    if (c.noPhone7d > 0) notes.push(`${plural(c.noPhone7d, "message", "messages")} came from a hidden number this week. Reply to ${c.noPhone7d === 1 ? "it" : "them"} in WhatsApp.`);

    if (c.mode === "capture") {
        const why = !c.parserReady ? "The message reader is not set up yet." : "The WhatsApp Agent switch is off.";
        return {
            level: c.oversized7d > 0 || c.refused7d > 0 ? "warning" : "ok",
            summary: `Storing only: messages are saved, not answered. ${why}`,
            notes,
        };
    }

    const stuck = c.oldestWaitingAt && now.getTime() - new Date(c.oldestWaitingAt).getTime() > STUCK_AFTER_MS;
    if (stuck) {
        return { level: "problem", summary: `${plural(c.waiting, "message is", "messages are")} waiting to be answered. The oldest has waited over 15 minutes.`, notes };
    }
    if (c.retrying > 0 || c.gaveUp7d > 0 || c.oversized7d > 0 || c.refused7d > 0 || c.noPhone7d > 0) {
        return { level: "warning", summary: c.retrying > 0 ? `${plural(c.retrying, "message is", "messages are")} being retried.` : "Working, with problems this week.", notes };
    }
    return { level: "ok", summary: "Working: messages are being answered.", notes };
}
