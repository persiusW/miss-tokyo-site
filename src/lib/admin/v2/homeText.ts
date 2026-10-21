// Home's time maths and sentences. Pure: no database, so every rule here is
// unit-tested (tests/e2e/unit/admin-v2-home.spec.ts). The shop runs on Accra
// time; nothing here reads the server's or the browser's own time zone.
import { deltaPct, plural } from "@/components/admin/ui/format";

export const SHOP_TZ = "Africa/Accra";
const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

/** Wall-clock parts of an instant in a time zone. */
function parts(d: Date, tz: string) {
    const p = Object.fromEntries(
        new Intl.DateTimeFormat("en-GB", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" })
            .formatToParts(d).filter(x => x.type !== "literal").map(x => [x.type, Number(x.value)]),
    ) as Record<"year" | "month" | "day" | "hour" | "minute" | "second", number>;
    return p;
}

/** How far the zone is ahead of UTC at that instant, in ms. */
function offsetMs(d: Date, tz: string): number {
    const p = parts(d, tz);
    return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - Math.floor(d.getTime() / 1000) * 1000;
}

/** Midnight of the shop's calendar day that contains `now`. */
export function startOfShopDay(now: Date, tz = SHOP_TZ): Date {
    const p = parts(now, tz);
    const guess = Date.UTC(p.year, p.month - 1, p.day);
    return new Date(guess - offsetMs(new Date(guess), tz));
}

export type PeriodKey = "today" | "7d" | "30d";
export const PERIODS: { v: PeriodKey; l: string }[] = [
    { v: "today", l: "Today" }, { v: "7d", l: "7 days" }, { v: "30d", l: "30 days" },
];
export const PERIOD_DAYS: Record<PeriodKey, number> = { today: 1, "7d": 7, "30d": 30 };
export const PERIOD_CTX: Record<PeriodKey, string> = {
    today: "vs same time yesterday", "7d": "vs previous 7 days", "30d": "vs previous 30 days",
};

export function isPeriod(v: unknown): v is PeriodKey {
    return v === "today" || v === "7d" || v === "30d";
}

export type Range = { from: Date; to: Date; cmpFrom: Date; cmpTo: Date };

/**
 * The period so far and the same stretch one period earlier. "Today" runs from
 * the shop's midnight to now and compares with yesterday up to the same time;
 * "7 days" is today and the six days before it, compared with the seven days
 * before that, also cut at the same time of day. Both ranges are half-open
 * [from, to) and always the same length.
 */
export function periodRange(key: PeriodKey, now: Date, tz = SHOP_TZ): Range {
    const days = PERIOD_DAYS[key];
    const from = new Date(startOfShopDay(now, tz).getTime() - (days - 1) * DAY);
    const to = now;
    return { from, to, cmpFrom: new Date(from.getTime() - days * DAY), cmpTo: new Date(to.getTime() - days * DAY) };
}

export type SalesFigures = { sales: number; orders: number; items: number; aov: number; cash: number; cash_orders: number };
export type KpiDeltas = { sales: number | null; orders: number | null; aov: number | null };

/** Whole-percent change for each KPI; null when the earlier period had none. */
export function kpiDeltas(cur: SalesFigures, prev: SalesFigures | null): KpiDeltas {
    if (!prev) return { sales: null, orders: null, aov: null };
    return { sales: deltaPct(cur.sales, prev.sales), orders: deltaPct(cur.orders, prev.orders), aov: deltaPct(cur.aov, prev.aov) };
}

/** The KPI's context line: the comparison, or why there's no arrow. */
export function kpiCtx(key: PeriodKey, delta: number | null, prevValue: number | null): string {
    if (delta != null) return PERIOD_CTX[key];
    if (prevValue === 0) return key === "today" ? "none by this time yesterday" : `none in the previous ${PERIOD_DAYS[key]} days`;
    return PERIOD_CTX[key];
}

/** "Good morning" before noon, "Good afternoon" until 5 pm, then "Good evening". Shop time. */
export function greeting(now: Date, tz = SHOP_TZ): string {
    const h = parts(now, tz).hour;
    return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

/** "Wednesday 21 October". */
export function dateLine(now: Date, tz = SHOP_TZ): string {
    const wd = now.toLocaleDateString("en-GB", { weekday: "long", timeZone: tz });
    const dm = now.toLocaleDateString("en-GB", { day: "numeric", month: "long", timeZone: tz });
    return `${wd} ${dm}`;
}

/** Calendar days between two instants, in shop days (today = 0). */
export function shopDaysBetween(earlier: Date, now: Date, tz = SHOP_TZ): number {
    return Math.max(0, Math.round((startOfShopDay(now, tz).getTime() - startOfShopDay(earlier, tz).getTime()) / DAY));
}

/** "12 minutes ago", "3 hours ago", "4 days ago", then "on 24 March" (with the year when it isn't this year). */
export function sinceText(iso: string, now: Date, tz = SHOP_TZ): string {
    const d = new Date(iso);
    const ms = now.getTime() - d.getTime();
    if (!Number.isFinite(ms) || ms < MIN) return "just now";
    if (ms < HOUR) return `${plural(Math.floor(ms / MIN), "minute")} ago`;
    if (ms < 2 * DAY) return `${plural(Math.floor(ms / HOUR), "hour")} ago`;
    const days = shopDaysBetween(d, now, tz);
    if (days < 60) return `${plural(days, "day")} ago`;
    const sameYear = parts(d, tz).year === parts(now, tz).year;
    return "on " + d.toLocaleDateString("en-GB", { day: "numeric", month: "long", ...(sameYear ? {} : { year: "numeric" }), timeZone: tz });
}

/** "2 days", "1 hour": how long something unpaid has waited (past 24 hours only). */
function unpaidFor(iso: string, now: Date, tz: string): string {
    const ms = now.getTime() - new Date(iso).getTime();
    if (ms < 2 * DAY) return plural(Math.max(1, Math.floor(ms / HOUR)), "hour");
    return plural(shopDaysBetween(new Date(iso), now, tz), "day");
}

export type RefAt = { id: string; ref: string; at: string | null };

/** Orders waiting to pack: "Paid and not packed yet. The oldest was paid 50 minutes ago." */
export function toPackText(oldest: { paid_at: string | null; created_at: string } | null, now: Date, tz = SHOP_TZ): string {
    if (!oldest) return "Paid and not packed yet.";
    return oldest.paid_at
        ? `Paid and not packed yet. The oldest was paid ${sinceText(oldest.paid_at, now, tz)}.`
        : `Paid and not packed yet. The oldest was placed ${sinceText(oldest.created_at, now, tz)}.`;
}

/** Orders waiting for payment. Anything unpaid for more than 24 hours gets the Paystack advice. */
export function unpaidText(stale: RefAt[], staleCount: number, now: Date, tz = SHOP_TZ): string {
    if (staleCount <= 0) return "Checkouts from the last 24 hours that Paystack hasn't confirmed yet.";
    if (staleCount === 1 && stale[0]?.at) {
        return `#${stale[0].ref} has been unpaid for ${unpaidFor(stale[0].at, now, tz)}. Check it with Paystack before you cancel it.`;
    }
    return `${plural(staleCount, "order has", "orders have")} been unpaid for more than a day. Check them with Paystack before you cancel them.`;
}

/** Ready for collection, with days waiting where the date is known (gap 20). */
export function readyText(oldest: RefAt | null, total: number, undated: number, now: Date, tz = SHOP_TZ): string {
    const tail = total === 1 ? "Send the customer a reminder." : "Send the customers a reminder.";
    let lead = "";
    if (oldest?.at) {
        const days = shopDaysBetween(new Date(oldest.at), now, tz);
        const wait = days === 0 ? "since today" : days === 1 ? "since yesterday" : `${days} days`;
        lead = total === 1 ? `#${oldest.ref} has been waiting ${wait}.` : `The longest wait is #${oldest.ref}, ${days === 0 ? "ready since today" : days === 1 ? "ready since yesterday" : `waiting ${days} days`}.`;
    } else if (total === 1 && oldest) {
        lead = `#${oldest.ref} is waiting to be collected.`;
    }
    const gap = undated > 0 && undated < total ? ` We don't know when ${undated} of them were marked ready.` : "";
    return [lead + gap, tail].filter(Boolean).join(" ").trim();
}

export type InboxBreakdown = { chats: number; forms: number; requests: number; questions: number };

/** "2 WhatsApp chats handed over, 1 contact form and 3 custom requests." */
export function inboxText(b: InboxBreakdown): string {
    const bits = [
        b.chats ? `${plural(b.chats, "WhatsApp chat")} handed over by the assistant` : "",
        b.forms ? `${plural(b.forms, "contact form")} not read yet` : "",
        b.requests ? `${plural(b.requests, "custom request")} to answer` : "",
        b.questions ? `${plural(b.questions, "question")} the assistant sent to admins` : "",
    ].filter(Boolean);
    if (!bits.length) return "";
    const list = bits.length === 1 ? bits[0] : `${bits.slice(0, -1).join(", ")} and ${bits[bits.length - 1]}`;
    return list.charAt(0).toUpperCase() + list.slice(1) + ".";
}

/** Where an order came from, in the team's words. */
export function channelLabel(source: string | null | undefined, paymentMethod: string | null | undefined): string {
    const s = (source || "").toLowerCase();
    if (s === "pos") return (paymentMethod || "").toLowerCase() === "paystack" ? "Pay link" : "POS";
    if (s === "whatsapp") return "WhatsApp";
    if (s === "web_chat") return "Shop assistant";
    return "Online";
}

/** Units on an order (items[].quantity, 1 when missing). */
export function itemCount(items: unknown): number {
    if (!Array.isArray(items)) return 0;
    return items.reduce((n: number, i) => {
        const q = Number((i as { quantity?: unknown })?.quantity);
        return n + (Number.isFinite(q) ? q : 1);
    }, 0);
}
