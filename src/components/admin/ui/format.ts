// Number and text helpers shared by every admin v2 page.

/** "GH₵ 1,234.50". Null shows a dash, never a made-up zero. */
export function ghs(n: number | string | null | undefined, dp = 2): string {
    if (n == null || n === "") return "—";
    const v = Number(n);
    if (!Number.isFinite(v)) return "—";
    return "GH₵ " + v.toLocaleString("en-GB", { minimumFractionDigits: dp, maximumFractionDigits: dp });
}
export const ghs0 = (n: number | string | null | undefined) => ghs(n, 0);

export function plural(n: number, word: string, words?: string): string {
    return `${n.toLocaleString("en-GB")} ${n === 1 ? word : words ?? word + "s"}`;
}

export function initials(name: string | null | undefined): string {
    return (name || "").split(/\s+/).filter(Boolean).slice(0, 2).map(x => x[0]).join("").toUpperCase() || "?";
}

export function firstName(name: string | null | undefined): string {
    return (name || "").trim().split(/\s+/)[0] || "";
}

const DAY = 86_400_000;

/** "Today, 11:52" / "Yesterday, 19:44" / "Mon 19 Oct, 18:22" / "3 Sep 2025". Accra time. */
export function when(iso: string | Date | null | undefined, now = new Date()): string {
    if (!iso) return "—";
    const d = typeof iso === "string" ? new Date(iso) : iso;
    if (Number.isNaN(d.getTime())) return "—";
    const tz = "Africa/Accra";
    const time = d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: tz });
    const dayKey = (x: Date) => x.toLocaleDateString("en-CA", { timeZone: tz });
    if (dayKey(d) === dayKey(now)) return `Today, ${time}`;
    if (dayKey(d) === dayKey(new Date(now.getTime() - DAY))) return `Yesterday, ${time}`;
    if (now.getTime() - d.getTime() < 6 * DAY && d < now) {
        return `${d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: tz })}, ${time}`;
    }
    const sameYear = d.toLocaleDateString("en-GB", { year: "numeric", timeZone: tz }) === now.toLocaleDateString("en-GB", { year: "numeric", timeZone: tz });
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }), timeZone: tz });
}

/** "12 min ago", "2 h ago", then falls back to when(). */
export function ago(iso: string | Date | null | undefined, now = new Date()): string {
    if (!iso) return "—";
    const d = typeof iso === "string" ? new Date(iso) : iso;
    const mins = Math.round((now.getTime() - d.getTime()) / 60_000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    if (mins < 6 * 60) return `${Math.round(mins / 60)} h ago`;
    return when(d, now);
}

/** Whole-percent change from prev to cur, or null when there's nothing to compare with. */
export function deltaPct(cur: number, prev: number): number | null {
    if (!Number.isFinite(cur) || !Number.isFinite(prev) || prev === 0) return null;
    return Math.round(((cur - prev) / prev) * 100);
}
