// Server-side read of the admin v2 rollout switches.
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { FLAGS_ALL, FLAGS_OFF, areaOn, type V2Area, type V2Flags } from "./routeMap";

/** Owners and admins can try the new admin on one device before switching it on
 *  for everyone. The cookie only changes which pages render; every page and
 *  action still checks the role on the server. */
export const PREVIEW_COOKIE = "mt_admin_v2_preview";

const TTL_MS = 30_000;
let cached: { at: number; flags: V2Flags } | null = null;

/** The store-wide switches. Cached per instance for 30 s; a failed read counts as off. */
export async function getStoreV2Flags(): Promise<V2Flags> {
    if (cached && Date.now() - cached.at < TTL_MS) return cached.flags;
    try {
        const { data } = await supabaseAdmin
            .from("store_settings")
            .select("admin_v2, admin_v2_products, admin_v2_orders, admin_v2_till")
            .eq("id", "default")
            .maybeSingle();
        const flags: V2Flags = {
            admin_v2: data?.admin_v2 === true,
            admin_v2_products: data?.admin_v2_products === true,
            admin_v2_orders: data?.admin_v2_orders === true,
            admin_v2_till: data?.admin_v2_till === true,
        };
        cached = { at: Date.now(), flags };
        return flags;
    } catch {
        return FLAGS_OFF;
    }
}

/** Forget the cached switches, after Settings saves them. */
export function clearV2FlagCache() {
    cached = null;
}

/** The switches as this visitor sees them: everything on while previewing. */
export function effectiveFlags(store: V2Flags, preview: boolean): V2Flags {
    return preview ? FLAGS_ALL : store;
}

export { areaOn };
export type { V2Area, V2Flags };
