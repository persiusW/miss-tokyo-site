// Saved rows → the page's values, and a section's changes → one save payload.
// Pure (no database), so the unit test covers every rule the server applies.
import { normaliseWaNumber } from "@/lib/ai/shopAssistant/settingsRules";
import { findKey, sectionByKey, valueKeys, type Ctx, type Val, type Values } from "./schema";

type Row = Record<string, unknown> | null | undefined;

const s = (v: unknown) => (v == null ? "" : String(v));
const n = (v: unknown, d: number) => (v == null || v === "" || !Number.isFinite(Number(v)) ? String(d) : String(Number(v)));
const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);

/** Every saved value the Settings page shows, flattened to "<part>.<column>" keys. */
export function decodeValues(src: {
    store: Row; biz: Row; site: Row; push: Row; meta: Row;
    ai: { key: string; value: unknown }[]; wholesaleCats: string[];
}): Values {
    const st = src.store ?? {}, bz = src.biz ?? {}, si = src.site ?? {}, pu = src.push ?? {}, me = src.meta ?? {};
    const v: Values = {};
    for (const k of ["business_name", "email", "contact", "address", "logo_url"]) v[`biz.${k}`] = s(bz[k]);
    v["biz.tax_rate"] = n(bz.tax_rate, 0);
    for (const k of ["store_tagline", "store_description", "social_instagram", "social_tiktok", "social_facebook", "social_twitter",
        "social_pinterest", "social_youtube", "social_snapchat", "social_threads", "instagram_access_token",
        "pickup_address", "pickup_contact_phone"]) v[`site.${k}`] = s(si[k]);
    v["site.pickup_estimated_wait"] = s(si.pickup_estimated_wait) || "24 hours";
    v["site.pickup_instructions"] = s(si.pickup_instructions);
    // Checkout offers pickup only when both switches are on; the page shows one.
    v["store.enable_store_pickup"] = st.enable_store_pickup === true && si.pickup_enabled !== false;
    for (const k of ["show_fee_at_checkout", "checkout_undo_removed_enabled", "pos_live_payment_status", "delivery_fees_enabled",
        "wholesale_enabled", "enable_gift_cards", "enable_gallery", "enable_craft", "enable_whitelabel", "enable_custom_requests",
        "shop_show_title", "admin_v2", "admin_v2_products", "admin_v2_orders", "admin_v2_till"]) v[`store.${k}`] = st[k] === true;
    v["store.platform_fee_percentage"] = n(st.platform_fee_percentage, 0);
    v["store.platform_fee_label"] = s(st.platform_fee_label);
    v["store.pos_hold_minutes"] = ["15", "30", "45"].includes(s(st.pos_hold_minutes)) ? s(st.pos_hold_minutes) : "15";
    v["store.delivery_fee_accra"] = n(st.delivery_fee_accra, 0);
    v["store.delivery_fee_outside"] = n(st.delivery_fee_outside, 0);
    for (const t of [1, 2, 3]) {
        v[`store.wholesale_tier_${t}_min`] = n(st[`wholesale_tier_${t}_min`], 1);
        v[`store.wholesale_tier_${t}_max`] = n(st[`wholesale_tier_${t}_max`], 1);
    }
    v["store.homepage_route"] = ["home", "shop", "gallery"].includes(s(st.homepage_route)) ? s(st.homepage_route) : "home";
    v["store.maintenance_mode"] = st.maintenance_mode === true ? "closed" : "open";
    v["store.shop_grid_cols"] = n(st.shop_grid_cols, 4);
    v["store.shop_mobile_cols"] = n(st.shop_mobile_cols, 2);
    v["store.shop_product_limit"] = n(st.shop_product_limit, 12);
    v["store.home_grid_cols"] = n(st.home_grid_cols, 4);
    v["store.home_product_limit"] = n(st.home_product_limit, 4);
    v["store.shop_image_stretch"] = st.shop_image_stretch === true ? "stretch" : "crop";
    v["store.global_sizes"] = arr(st.global_sizes);
    v["store.global_colors"] = arr(st.global_colors);
    v["store.global_brands"] = arr(st.global_brands);
    v["push.title"] = s(pu.title);
    v["push.body"] = s(pu.body);
    v["meta.title"] = s(me.title);
    v["meta.description"] = s(me.description);
    v["meta.keywords"] = s(me.keywords);
    for (const r of src.ai) {
        const val = r.value;
        v[`ai.${r.key}`] = typeof val === "boolean" ? val : val == null ? "" : typeof val === "object" ? JSON.stringify(val) : String(val);
    }
    v["cats.wholesale"] = [...src.wholesaleCats];
    return v;
}

export type Payload = {
    store?: Record<string, unknown>;
    business?: Record<string, unknown>;
    site?: Record<string, unknown>;
    push?: Record<string, unknown>;
    ai?: { key: string; value: unknown }[];
    metadata?: { page_path: string; title: string; description: string; keywords: string }[];
    wholesale_categories?: string[];
};

export type AiValidators = Record<string, (v: unknown) => boolean>;

const INT_CHOICES: Record<string, number[]> = {
    "store.pos_hold_minutes": [15, 30, 45],
    "store.shop_grid_cols": [2, 3, 4, 5],
    "store.home_grid_cols": [2, 3, 4, 5],
    "store.shop_mobile_cols": [1, 2],
    "store.home_product_limit": [4, 6, 8, 12],
    "store.shop_product_limit": [8, 12, 16, 24, 32],
};
const AI_NUMBERS = new Set(["ai.daily_spend_cap_ghs", "ai.admin_cost_markup_pct", "ai.whatsapp_wallet_alert_ghs"]);
const AI_INTS = new Set(["ai.shop_assistant_daily_messages_per_visitor", "ai.shop_assistant_cap_share_pct"]);
const AI_PHONES = new Set(["ai.shop_whatsapp_number", "ai.whatsapp_handoff_number", "ai.whatsapp_wallet_alert_number"]);
const TEXT_MAX: Record<string, number> = {
    "biz.business_name": 80, "store.platform_fee_label": 60, "site.store_tagline": 160, "site.pickup_instructions": 500,
    "meta.title": 60, "meta.description": 160,
};

function num(raw: Val, min: number, max: number): number | null {
    if (typeof raw !== "string" || raw.trim() === "") return null;
    const x = Number(raw);
    return Number.isFinite(x) && x >= min && x <= max ? x : null;
}

/**
 * The save payload for one section, from only the keys that changed.
 * `current` is the full set of saved values (for cross-field checks and for
 * site_metadata, which is written as a whole row). Returns a calm sentence on
 * the first value that isn't allowed.
 */
export function encodeSection(secKey: string, changes: Values, current: Values, role: Ctx["role"], aiValid: AiValidators):
    { ok: true; payload: Payload; keys: string[] } | { ok: false; error: string } {
    const sec = sectionByKey(secKey);
    if (!sec || sec.mine) return { ok: false, error: "That section can't be saved here." };
    const allowed = new Set(valueKeys(sec, role));
    const keys = Object.keys(changes);
    if (keys.length === 0) return { ok: false, error: "There's nothing to save." };
    const merged: Values = { ...current, ...changes };
    const p: Payload = {};
    const put = (part: "store" | "business" | "site" | "push", col: string, val: unknown) => { (p[part] ??= {})[col] = val; };

    for (const key of keys) {
        if (!allowed.has(key)) return { ok: false, error: "One of those settings can't be changed here." };
        const raw = changes[key];
        const label = findKey(key)?.row.label ?? "That setting";
        const [part, col] = [key.slice(0, key.indexOf(".")), key.slice(key.indexOf(".") + 1)];
        const bad = (why: string) => ({ ok: false as const, error: `${label}: ${why}` });

        if (typeof raw === "string" && TEXT_MAX[key] && raw.length > TEXT_MAX[key]) return bad(`keep it to ${TEXT_MAX[key]} characters.`);

        if (key === "store.enable_store_pickup") {
            if (typeof raw !== "boolean") return bad("choose on or off.");
            put("store", "enable_store_pickup", raw);
            put("site", "pickup_enabled", raw);
            continue;
        }
        if (key === "store.maintenance_mode") {
            if (raw !== "open" && raw !== "closed") return bad("choose open or closed.");
            put("store", col, raw === "closed");
            continue;
        }
        if (key === "store.shop_image_stretch") {
            if (raw !== "crop" && raw !== "stretch") return bad("choose crop or stretch.");
            put("store", col, raw === "stretch");
            continue;
        }
        if (key === "store.homepage_route") {
            if (raw !== "home" && raw !== "shop" && raw !== "gallery") return bad("choose a page.");
            put("store", col, raw);
            continue;
        }
        if (INT_CHOICES[key]) {
            const x = Number(raw);
            if (!INT_CHOICES[key].includes(x)) return bad("choose one of the options.");
            put("store", col, x);
            continue;
        }
        if (key.startsWith("store.wholesale_tier_")) {
            const x = num(raw, 1, 100000);
            if (x === null || !Number.isInteger(x)) return bad("enter a whole number of pieces, 1 or more.");
            put("store", col, x);
            continue;
        }
        if (key === "store.platform_fee_percentage" || key === "biz.tax_rate") {
            const x = num(raw, 0, 100);
            if (x === null) return bad("enter a percentage from 0 to 100.");
            put(part === "biz" ? "business" : "store", col, x);
            continue;
        }
        if (key === "store.delivery_fee_accra" || key === "store.delivery_fee_outside") {
            const x = num(raw, 0, 100000);
            if (x === null) return bad("enter an amount in cedis, 0 or more.");
            put("store", col, x);
            continue;
        }
        if (key.startsWith("store.global_")) {
            if (!Array.isArray(raw)) return bad("that list didn't come through.");
            const list = [...new Set(raw.map(x => String(x).trim()).filter(Boolean))];
            put("store", col, list);
            continue;
        }
        if (part === "store") {
            if (typeof raw === "boolean") { put("store", col, raw); continue; }
            if (typeof raw === "string") { put("store", col, raw.trim()); continue; }
            return bad("that value isn't allowed.");
        }
        if (part === "biz") {
            if (typeof raw !== "string") return bad("that value isn't allowed.");
            const t = raw.trim();
            if (col === "business_name" && !t) return bad("the store needs a name.");
            if (col === "email" && t && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t)) return bad("enter an email address like hello@misstokyo.shop.");
            put("business", col, col === "logo_url" && !t ? null : t);
            continue;
        }
        if (part === "site") {
            if (typeof raw !== "string") return bad("that value isn't allowed.");
            const t = raw.trim();
            put("site", col, (col === "pickup_address" || col === "pickup_contact_phone") && !t ? null : t);
            continue;
        }
        if (part === "push") {
            if (typeof raw !== "string") return bad("that value isn't allowed.");
            put("push", col, raw.trim());
            continue;
        }
        if (part === "meta") continue; // written as one row below
        if (key === "cats.wholesale") {
            if (!Array.isArray(raw) || !raw.every(x => /^[0-9a-f-]{36}$/i.test(String(x)))) return bad("that list didn't come through.");
            p.wholesale_categories = [...new Set(raw.map(String))];
            continue;
        }
        if (part === "ai") {
            let value: unknown = raw;
            if (AI_NUMBERS.has(key)) value = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
            else if (AI_INTS.has(key)) value = typeof raw === "string" && raw.trim() !== "" ? Number(raw) : NaN;
            else if (AI_PHONES.has(key)) {
                const t = typeof raw === "string" ? raw.trim() : "";
                const norm = t === "" ? "" : normaliseWaNumber(t);
                if (norm === null) return bad("enter a Ghana phone number, or leave it blank.");
                value = norm;
            } else if (typeof raw === "string") value = raw.trim();
            const check = aiValid[col];
            if (!check) return bad("that setting can't be changed here.");
            if (!check(value)) {
                if (key === "ai.daily_spend_cap_ghs") return bad("enter an amount from 0 to 10,000 cedis.");
                if (key === "ai.admin_cost_markup_pct") return bad("enter a percentage from 0 to 500.");
                if (key === "ai.shop_assistant_daily_messages_per_visitor") return bad("enter a whole number from 1 to 200.");
                if (key === "ai.shop_assistant_cap_share_pct") return bad("enter a whole number from 0 to 100.");
                if (col.endsWith("template_id")) return bad("a template id is the number shown in Chatbots Africa's Message Templates.");
                return bad("that value isn't allowed.");
            }
            (p.ai ??= []).push({ key: col, value });
            continue;
        }
        return bad("that setting can't be changed here.");
    }

    // Each tier's range has to make sense once the changes are applied.
    for (const t of [1, 2, 3]) {
        const lo = Number(merged[`store.wholesale_tier_${t}_min`]), hi = Number(merged[`store.wholesale_tier_${t}_max`]);
        if (keys.some(k => k.startsWith(`store.wholesale_tier_${t}_`)) && Number.isFinite(lo) && Number.isFinite(hi) && lo > hi) {
            return { ok: false, error: `Tier ${t}: the first number can't be more than the second.` };
        }
    }
    if (keys.some(k => k.startsWith("meta."))) {
        const t = String(merged["meta.title"] ?? "").trim();
        p.metadata = [{ page_path: "/", title: t, description: String(merged["meta.description"] ?? "").trim(), keywords: String(merged["meta.keywords"] ?? "").trim() }];
    }
    return { ok: true, payload: p, keys };
}
