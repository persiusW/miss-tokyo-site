import { test, expect } from "@playwright/test";
import { TURN_LOCK_MS, TURN_WAIT_MS, withTurnLock, type LockDeps } from "../../../src/lib/whatsapp/turnLock";

// One fake chat row: the lock column and a clock the fake sleep moves forward.
function fakeLock(start = Date.parse("2026-10-21T10:00:00Z")) {
    let clock = start;
    let lockedUntil: number | null = null;
    const log: string[] = [];
    const deps: LockDeps = {
        claim: async (_id, until, now) => {
            if (lockedUntil !== null && lockedUntil >= now.getTime()) return false;
            lockedUntil = until.getTime();
            return true;
        },
        release: async (_id, until) => { if (lockedUntil === until.getTime()) lockedUntil = null; },
        now: () => new Date(clock),
        sleep: async ms => { clock += ms; },
    };
    return { deps, log, held: () => lockedUntil !== null, advance: (ms: number) => { clock += ms; }, setLocked: (until: number | null) => { lockedUntil = until; } };
}

test("a turn takes the lock, runs, and frees it", async () => {
    const f = fakeLock();
    const out = await withTurnLock("c1", async () => { f.log.push(`held:${f.held()}`); return "replied"; }, f.deps);
    expect([out, f.log, f.held()]).toEqual(["replied", ["held:true"], false]);
});

test("a second message waits for the turn before it, then answers", async () => {
    const f = fakeLock();
    f.setLocked(Date.parse("2026-10-21T10:00:05Z"));   // the first turn has 5 s to go
    await withTurnLock("c1", async () => { f.log.push("second answered"); }, f.deps);
    expect(f.log).toEqual(["second answered"]);
    expect(f.held()).toBe(false);
});

test("a stuck lock: after the wait runs out the message is answered anyway; a crashed turn's lock just expires", async () => {
    const f = fakeLock();
    f.setLocked(Date.parse("2026-10-21T10:00:00Z") + TURN_LOCK_MS);   // held for the whole wait
    await withTurnLock("c1", async () => { f.log.push("answered without the lock"); }, f.deps);
    expect(f.log).toEqual(["answered without the lock"]);
    expect(TURN_WAIT_MS).toBeLessThan(60_000);   // inside the route's 60 s
    // Expired lock (a turn that died): taken straight away.
    const g = fakeLock();
    g.setLocked(Date.parse("2026-10-21T09:58:00Z"));
    await withTurnLock("c1", async () => { g.log.push(`held:${g.held()}`); }, g.deps);
    expect(g.log).toEqual(["held:true"]);
});

test("the lock is freed when the turn throws, and a failing claim never blocks the reply", async () => {
    const f = fakeLock();
    await expect(withTurnLock("c1", async () => { throw new Error("model timeout"); }, f.deps)).rejects.toThrow("model timeout");
    expect(f.held()).toBe(false);
    const broken: LockDeps = { ...f.deps, claim: async () => { throw new Error("db down"); } };
    const out = await withTurnLock("c1", async () => "replied", broken);
    expect(out).toBe("replied");
});
