// Pure helpers for the admin AI tools on AI Settings: failed sends, errors by
// code, AI usage per staff member. Nothing here shows provider text.

export function failureReason(channel: string, errorCode: string | null | undefined): string {
    const t = String(errorCode ?? "");
    if (channel === "sms") {
        if (/balance|credit|insufficient|top.?up/i.test(t)) return "SMS credit has run out.";
        if (/invalid|not a valid|recipient|number/i.test(t)) return "The phone number isn't valid.";
        if (/html|timeout|timed out|network|ECONN|fetch|5\d\d/i.test(t)) return "The SMS provider didn't answer properly.";
        return "The SMS provider refused it.";
    }
    if (/bounce|mailbox|rejected|does not exist|undeliverable/i.test(t)) return "The email was rejected by the customer's mailbox.";
    if (/timeout|network|ECONN|fetch|5\d\d/i.test(t)) return "The email provider didn't answer properly.";
    return "The email provider refused it.";
}

export function maskRecipient(channel: string, recipient: string | null | undefined): string {
    const r = String(recipient ?? "");
    if (channel === "sms") {
        const d = r.replace(/\D/g, "");
        return d.length >= 4 ? `•••• ${d.slice(-4)}` : "••••";
    }
    const at = r.lastIndexOf("@");
    return at > 0 && at < r.length - 1 ? `•••${r.slice(at)}` : "•••";
}

export function countBy<T>(rows: T[], key: (r: T) => string | null | undefined): { key: string; count: number }[] {
    const m = new Map<string, number>();
    for (const r of rows) { const k = key(r); if (k) m.set(k, (m.get(k) ?? 0) + 1); }
    return [...m.entries()].map(([k, count]) => ({ key: k, count })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
}

export function summariseUsage(
    rows: { user_id: string | null; cost_usd: number | string | null; created_at: string }[],
    names: Map<string, string>,
    usdToGhs: number,
): { name: string; questions: number; cost_ghs: number; last_used: string }[] {
    const by = new Map<string, { questions: number; usd: number; last: string }>();
    for (const r of rows) {
        if (!r.user_id) continue;
        const cur = by.get(r.user_id) ?? { questions: 0, usd: 0, last: "" };
        cur.questions += 1;
        cur.usd += Number(r.cost_usd) || 0;
        if (r.created_at > cur.last) cur.last = r.created_at;
        by.set(r.user_id, cur);
    }
    return [...by.entries()]
        .map(([id, v]) => ({ name: names.get(id) ?? "Team member", questions: v.questions, cost_ghs: parseFloat((v.usd * usdToGhs).toFixed(2)), last_used: v.last }))
        .sort((a, b) => b.cost_ghs - a.cost_ghs || b.questions - a.questions);
}
