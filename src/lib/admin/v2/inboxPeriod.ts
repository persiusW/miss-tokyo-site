// The period the Inbox's WhatsApp figures cover. Pure, and read the same way
// by the page and the route, so the words on screen always match the numbers.
// Days are shop days (Accra), and "30 days" counts today as the last day.
import { datesText, shopMidnight, shopYmd } from "./analytics";
import { startOfShopDay } from "./homeText";

export type InboxPeriod = "all" | "month" | "30d" | "60d" | "90d" | "custom";
export type PeriodQuery = { period: InboxPeriod; from: string | null; to: string | null };

export const DEFAULT_PERIOD: InboxPeriod = "month";

export const INBOX_PERIODS: { v: InboxPeriod; l: string }[] = [
    { v: "all", l: "All time" },
    { v: "month", l: "This month" },
    { v: "30d", l: "30 days" },
    { v: "60d", l: "60 days" },
    { v: "90d", l: "90 days" },
    { v: "custom", l: "Custom" },
];

const DAY = 86_400_000;
const ROLLING: Partial<Record<InboxPeriod, number>> = { "30d": 30, "60d": 60, "90d": 90 };

/** A real calendar day written YYYY-MM-DD: 2026-02-31 is not one. */
function isDay(s: string | null): s is string {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s ?? "");
    if (!m) return false;
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    return d.toISOString().slice(0, 10) === s;
}

/** Whatever is in the URL, as a period we can use: anything unusable is this month. */
export function parsePeriod(period: string | null, from: string | null, to: string | null): PeriodQuery {
    if (period === "custom") {
        return isDay(from) && isDay(to) && from <= to
            ? { period, from, to }
            : { period: DEFAULT_PERIOD, from: null, to: null };
    }
    const known = INBOX_PERIODS.some(p => p.v === period);
    return { period: known ? (period as InboxPeriod) : DEFAULT_PERIOD, from: null, to: null };
}

/** The instants a period covers; `to` is exclusive, `from` is null for all time. */
export function periodRange(q: PeriodQuery, now: Date): { from: Date | null; to: Date } {
    if (q.period === "all") return { from: null, to: now };
    if (q.period === "custom" && q.from && q.to) {
        const from = shopMidnight(q.from);
        const end = new Date(shopMidnight(q.to).getTime() + DAY);
        return { from, to: end.getTime() > now.getTime() ? now : end };
    }
    const days = ROLLING[q.period];
    if (days) return { from: new Date(startOfShopDay(now).getTime() - (days - 1) * DAY), to: now };
    return { from: shopMidnight(`${shopYmd(now).slice(0, 7)}-01`), to: now };
}

/** "this month", "last 60 days", "all time", "14–20 Oct 2026". */
export function periodPhrase(q: PeriodQuery, now: Date): string {
    if (q.period === "all") return "all time";
    if (q.period === "month") return "this month";
    const days = ROLLING[q.period];
    if (days) return `last ${days} days`;
    const { from, to } = periodRange(q, now);
    return datesText(from ?? to, to);
}
