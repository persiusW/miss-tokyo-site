// One assistant turn at a time per WhatsApp chat. The lock is a timestamp on
// the conversation taken with a compare-and-set (empty or expired), so a
// crashed turn never blocks the chat for long. The next message waits for it;
// after WAIT_MS it goes ahead anyway (the chat's own save check still guards).
// Pure: the claim, release, clock and sleep are passed in.

/** A turn holds the lock at most this long. */
export const TURN_LOCK_MS = 90_000;
/** A message waits at most this long for the turn before it (the route has 60 s). */
export const TURN_WAIT_MS = 30_000;
const POLL_MS = 1_000;

export type LockDeps = {
    /** Takes the lock until `until` when it is free or expired; true when taken. */
    claim: (conversationId: string, until: Date, now: Date) => Promise<boolean>;
    /** Frees it, only if it is still ours (still `until`). */
    release: (conversationId: string, until: Date) => Promise<void>;
    now?: () => Date;
    sleep?: (ms: number) => Promise<void>;
};

export async function withTurnLock<T>(conversationId: string, fn: () => Promise<T>, deps: LockDeps): Promise<T> {
    const now = () => deps.now?.() ?? new Date();
    const sleep = deps.sleep ?? (ms => new Promise(r => setTimeout(r, ms)));
    const started = now().getTime();
    let until: Date | null = null;
    for (;;) {
        const t = now();
        const mine = new Date(t.getTime() + TURN_LOCK_MS);
        if (await deps.claim(conversationId, mine, t).catch(() => false)) { until = mine; break; }
        if (t.getTime() - started >= TURN_WAIT_MS) {
            console.warn("[whatsapp] turn lock wait ran out; answering anyway");
            break;
        }
        await sleep(POLL_MS);
    }
    try {
        return await fn();
    } finally {
        if (until) await deps.release(conversationId, until).catch(() => undefined);
    }
}
