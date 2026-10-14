// Server-only: signs the seed line so a later turn can prove the server
// wrote it. Keyed on a server secret that never reaches the browser.
import { createHmac, timingSafeEqual } from "crypto";

const secret = () => process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.CRON_SECRET || "";

function mac(line: string): string {
    return createHmac("sha256", `mtai-seed:${secret()}`).update(line).digest("hex").slice(0, 16);
}

/** "[Payment problem: … ]" → "[Payment problem: … · <sig>]" */
export function signSeedLine(line: string): string {
    return `${line.slice(0, -1)} · ${mac(line)}]`;
}

export function verifySeedSig(unsigned: string, sig: string): boolean {
    if (!secret()) return false;
    const want = Buffer.from(mac(unsigned));
    const got = Buffer.from(sig);
    return want.length === got.length && timingSafeEqual(want, got);
}
