// A small per-instance cache for Paystack reads (splits, settlements,
// banks). Only successful answers are kept, so a slow or failed call is
// tried again next time instead of being remembered.
import type { PsResult } from "./api";

const store = new Map<string, { at: number; v: unknown }>();

export async function cachedPs<T>(key: string, ttlMs: number, fn: () => Promise<PsResult<T>>): Promise<PsResult<T> & { at?: number }> {
    const hit = store.get(key);
    if (hit && Date.now() - hit.at < ttlMs) return { ...(hit.v as PsResult<T>), at: hit.at };
    const v = await fn();
    if (v.ok) store.set(key, { at: Date.now(), v });
    return { ...v, at: Date.now() };
}

export function forgetPs(prefix: string) {
    for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}

export const TEN_MIN = 10 * 60_000;
