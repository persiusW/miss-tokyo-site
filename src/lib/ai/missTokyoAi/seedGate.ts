// The checks a seeded payment-help ask must pass, with the database reads
// injected so every refusal path can be unit-tested.
import { parseSeed, saleVisible, seedKey, type Seed } from "@/lib/ai/missTokyoAi/seed";

export type SeedDeps = {
    session: (id: string) => Promise<{ id: string; ref: string | null; created_by: string | null } | null>;
    order: (id: string) => Promise<{ id: string; ref: string | null } | null>;
    saleRows: (saleKey: string) => Promise<{ created_by: string | null; pos_session_id: string | null }[]>;
    latestAttemptId: (seed: Seed) => Promise<string | null>;
    recentAsks: (key: string) => Promise<number>;
};

const NEW_CHAT = "Something went wrong with this chat. Please start a new chat.";

export async function checkSeed(
    a: { seed: unknown; transcriptLength: number; role: string; userId: string },
    deps: SeedDeps,
): Promise<{ ok: true; seed: Seed; key: string; label: string } | { ok: false; status: number; error: string }> {
    const seed = parseSeed(a.seed);
    if (!seed || a.transcriptLength !== 1) return { ok: false, status: 400, error: NEW_CHAT };
    let label = "this sale";
    if (seed.posSessionId) {
        const s = await deps.session(seed.posSessionId);
        if (!s) return { ok: false, status: 404, error: "That sale wasn't found." };
        if (a.role === "sales_staff" && s.created_by !== a.userId) return { ok: false, status: 403, error: "That sale belongs to someone else." };
        label = `till sale #${s.ref ?? s.id.slice(0, 8).toUpperCase()}`;
    } else if (seed.orderId) {
        const o = await deps.order(seed.orderId);
        if (!o) return { ok: false, status: 404, error: "That order wasn't found." };
        label = `order #${o.ref ?? o.id.slice(0, 8).toUpperCase()}`;
    }
    if (seed.saleKey && a.role === "sales_staff") {
        const rows = await deps.saleRows(seed.saleKey);
        const owned = saleVisible(rows, a.role, a.userId)
            || (!!seed.posSessionId && rows.length > 0 && rows.every(r => r.pos_session_id === seed.posSessionId));
        if (!owned) return { ok: false, status: 403, error: "That sale belongs to someone else." };
    }
    const key = seedKey(seed, await deps.latestAttemptId(seed));
    if ((await deps.recentAsks(key)) > 0) {
        return { ok: false, status: 429, error: "You asked about this a moment ago. Please check the chat above." };
    }
    return { ok: true, seed, key, label };
}
