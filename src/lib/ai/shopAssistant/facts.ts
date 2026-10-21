// Facts from our own records, given to the assistant each WhatsApp turn in a
// separate system block after the cached prompt (so the cache holds): the
// date and time in Accra, what we know about this number from earlier orders,
// and how long since the chat last moved. Pure.

export type CustomerRecord = {
    orders: number;
    /** Name on their latest order. */
    name: string | null;
    /** A real email from an earlier order (never the placeholder). */
    email: string | null;
    /** Delivery address on their latest delivered-to order: "street, area · Region". */
    address: string | null;
};

/** Below this, a gap is part of the same conversation. */
export const GAP_NOTE_MS = 2 * 3600_000;

const firstName = (name: string) => name.trim().split(/\s+/)[0];

function gapText(ms: number): string {
    const h = Math.floor(ms / 3600_000);
    if (h < 48) return `${h} hours`;
    return `${Math.floor(h / 24)} days`;
}

/** "Good morning" etc. by the hour in Accra. */
function greeting(hour: number): string {
    return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

export function customerFacts(a: { now: Date; record: CustomerRecord | null; lastMessageAt: string | null }): string {
    const part = (o: Intl.DateTimeFormatOptions) => a.now.toLocaleDateString("en-GB", { ...o, timeZone: "Africa/Accra" });
    // "Wednesday 21 October 2026": said back to customers in this shape.
    const day = `${part({ weekday: "long" })} ${part({ day: "numeric", month: "long", year: "numeric" })}`;
    const time = a.now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Accra" });
    const hour = Number(a.now.toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Africa/Accra" }));
    const lines = [`- Today is ${day}, ${time} in Accra ("${greeting(hour)}").`];

    const r = a.record;
    if (r && r.orders > 0) {
        const known = [
            r.name ? `name on their last order: ${r.name} (call them ${firstName(r.name)})` : null,
            r.email ? `email: ${r.email}` : null,
            r.address ? `last delivery address: ${r.address}` : null,
        ].filter(Boolean);
        lines.push(`- Returning customer: ${r.orders} earlier order${r.orders === 1 ? "" : "s"} on this number${known.length ? `; ${known.join("; ")}` : ""}.`);
    } else {
        lines.push("- No earlier orders on this number.");
    }

    const gap = a.lastMessageAt ? a.now.getTime() - Date.parse(a.lastMessageAt) : NaN;
    if (Number.isFinite(gap) && gap >= GAP_NOTE_MS) lines.push(`- This chat was quiet for ${gapText(gap)} before this message.`);

    return `Facts from our own records for this turn (not from the customer, and never to be read out as a list):\n${lines.join("\n")}`;
}
