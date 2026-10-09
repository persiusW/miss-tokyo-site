// The backstop's test: does this message look like technical text that slipped
// past a route? Deliberately narrow — "Paystack" alone is not raw (staff
// messages name it); provider internals, DB, JS and markup are.
const PATTERNS: RegExp[] = [
    /violates|duplicate key|relation "|column "|\bconstraint\b|PGRST|\bJWT\b|syntax error at/i,
    /Unexpected token|\bJSON\b|fetch failed|NetworkError|TypeError|ReferenceError|SyntaxError|ECONN|ETIMEDOUT|\bat \S+:\d+/i,
    /<html|<!doctype|\[object /i,
    /mNotify|API key|Invalid key|status code \d{3}|Paystack error/i,
];

export function looksRaw(m: unknown): boolean {
    if (typeof m !== "string") return true;
    const t = m.trim();
    if (!t || t.length > 300) return true;
    if (/[{}]/.test(t)) return true;
    return PATTERNS.some(p => p.test(t));
}
