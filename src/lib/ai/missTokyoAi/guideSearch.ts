// Keyword retrieval over the guide and the admin's saved answers. Simple on
// purpose: the inbox catches misses and saved answers fill the gaps. A saved
// answer outranks a guide entry on equal hits.

export type SearchDoc = { id: string; title: string; body: string; source: "guide" | "saved" };
export type SearchHit = SearchDoc & { score: number };

const STOP = new Set([
    "a", "an", "and", "are", "as", "at", "be", "can", "do", "does", "for", "from", "how", "i", "in", "is", "it",
    "me", "my", "of", "on", "or", "the", "to", "we", "what", "when", "where", "which", "who", "why", "with", "you",
]);

export function terms(text: string): string[] {
    const words = text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9\s-]/g, " ").split(/[\s-]+/);
    return [...new Set(words.filter(w => w.length > 1 && !STOP.has(w)).map(w => w.replace(/(ing|es|s)$/, "") || w))];
}

export function searchDocs(query: string, docs: SearchDoc[], limit = 3): SearchHit[] {
    const q = terms(query);
    if (q.length === 0) return [];
    const hits: SearchHit[] = [];
    for (const d of docs) {
        const title = new Set(terms(d.title));
        const body = new Set(terms(d.body));
        let score = 0;
        for (const t of q) score += title.has(t) ? 2 : body.has(t) ? 1 : 0;
        if (score === 0) continue;
        if (d.source === "saved") score += 1;
        hits.push({ ...d, score });
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}
