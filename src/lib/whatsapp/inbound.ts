// Pure helpers for the WhatsApp provider callback: the URL secret check, the
// header redaction applied before anything is stored, and a size-capped body
// read. Nothing here touches the database.
import { createHash, timingSafeEqual } from "crypto";

/** Largest callback body stored. Text events are a few KB; media arrives by id, not inline. */
export const MAX_INBOUND_BYTES = 256 * 1024;

/** A shorter WHATSAPP_INBOUND_SECRET is treated as unset: every request gets a 404. */
export const MIN_SECRET_LENGTH = 24;

/**
 * Constant-time compare of the [secret] path segment against the env value.
 * Both sides are hashed first, so neither length nor content leaks through timing.
 */
export function inboundSecretMatches(given: string | null | undefined, expected: string | null | undefined): boolean {
    if (!expected || expected.length < MIN_SECRET_LENGTH || !given) return false;
    const a = createHash("sha256").update(given).digest();
    const b = createHash("sha256").update(expected).digest();
    return timingSafeEqual(a, b);
}

// Credentials never reach the table. Signature headers are kept on purpose:
// they are how we will learn whether the provider signs its callbacks.
const REDACT = /^(authorization|proxy-authorization|cookie|set-cookie)$|api[-_]?key|token|secret|password|session|bypass/i;

export function redactHeaders(headers: Headers): Record<string, string> {
    const out: Record<string, string> = {};
    headers.forEach((value, name) => {
        out[name] = REDACT.test(name) ? "[redacted]" : value;
    });
    return out;
}

/** The caller's address as Vercel reports it: first x-forwarded-for hop, else x-real-ip. */
export function clientIp(headers: Headers): string | null {
    const first = (headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
    return first || headers.get("x-real-ip")?.trim() || null;
}

/**
 * The body as text, or null when it is over `max` bytes. Stops reading as soon
 * as the cap is passed, so an oversized post never sits in memory whole.
 */
export async function readCapped(req: Request, max: number): Promise<string | null> {
    const declared = Number(req.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > max) return null;
    if (!req.body) return "";
    const reader = req.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > max) {
            await reader.cancel().catch(() => {});
            return null;
        }
        chunks.push(value);
    }
    const all = new Uint8Array(size);
    let at = 0;
    for (const c of chunks) { all.set(c, at); at += c.byteLength; }
    return new TextDecoder("utf-8").decode(all);
}
