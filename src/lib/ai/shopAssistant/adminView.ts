// What admins may see of a shop chat: the words only, personal details masked.
const EARLIER = /^\[Earlier in this chat:[^\]]*\]\n?/;

export function maskPersonal(text: string): string {
    return String(text ?? "")
        .replace(/[A-Z0-9._%+-]+@([A-Z0-9.-]+\.[A-Z]{2,})/gi, (_m, domain) => `•••@${domain}`)
        .replace(/(?<!\d)\(?\+?(?:233|0)(?:[\s.\-()]*\d){9,}/g, m => `•••• ${m.replace(/\D/g, "").slice(-4)}`)
        .replace(/\d{9,}/g, m => `•••• ${m.slice(-4)}`);
}

export function conversationText(messages: unknown): { who: "customer" | "assistant"; text: string }[] {
    if (!Array.isArray(messages)) return [];
    const out: { who: "customer" | "assistant"; text: string }[] = [];
    for (const m of messages as any[]) {
        const blocks = typeof m?.content === "string" ? [{ type: "text", text: m.content }] : Array.isArray(m?.content) ? m.content : [];
        const text = blocks.filter((b: any) => b?.type === "text").map((b: any) => String(b.text ?? "")).join("\n").replace(EARLIER, "").trim();
        if (!text) continue;
        out.push({ who: m.role === "user" ? "customer" : "assistant", text: maskPersonal(text) });
    }
    return out;
}

export function firstQuestion(messages: unknown): string {
    return (conversationText(messages).find(l => l.who === "customer")?.text ?? "").slice(0, 120);
}
